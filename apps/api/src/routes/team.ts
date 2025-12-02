import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { db, networks, networkMembers, networkRoles, networkInvitations, users } from '@mctrack/db';
import { Permission } from '@mctrack/shared';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error-handler.js';
import { membershipService } from '../services/membership.js';

const router: IRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /networks/{networkId}/team:
 *   get:
 *     summary: Get complete team info (members, roles, invitations)
 *     tags: [Team]
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.VIEW_TEAM),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { userId } = req as AuthenticatedRequest;

      // Get network to check ownership
      const network = await db.query.networks.findFirst({
        where: eq(networks.id, networkId),
      });

      const isOwner = network?.ownerId === userId;

      // Get members with user and role info
      const members = await db.query.networkMembers.findMany({
        where: eq(networkMembers.networkId, networkId),
        with: {
          user: {
            columns: { id: true, email: true, username: true },
          },
          role: true,
        },
      });

      // Get all roles
      const roles = await db.query.networkRoles.findMany({
        where: eq(networkRoles.networkId, networkId),
      });

      // Get pending invitations (not expired)
      const invitations = await db.query.networkInvitations.findMany({
        where: and(
          eq(networkInvitations.networkId, networkId),
          isNull(networkInvitations.acceptedAt),
          gt(networkInvitations.expiresAt, new Date())
        ),
        with: {
          role: {
            columns: { name: true, color: true },
          },
        },
      });

      res.json({
        members: members.map((m) => ({
          id: m.id,
          userId: m.userId,
          user: m.user,
          role: m.role,
          joinedAt: m.createdAt,
        })),
        roles,
        invitations: invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt,
          createdAt: i.createdAt,
        })),
        isOwner,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/members:
 *   get:
 *     summary: List all team members
 *     tags: [Team]
 */
router.get(
  '/members',
  authenticate,
  requirePermission(Permission.VIEW_TEAM),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      const members = await db.query.networkMembers.findMany({
        where: eq(networkMembers.networkId, networkId),
        with: {
          user: {
            columns: { id: true, email: true, username: true },
          },
          role: true,
        },
      });

      res.json({ members });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/invite:
 *   post:
 *     summary: Invite a user to the network
 *     tags: [Team]
 */
const inviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
});

router.post(
  '/invite',
  authenticate,
  requirePermission(Permission.INVITE_MEMBERS),
  validateBody(inviteSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { userId } = req as AuthenticatedRequest;
      const { email, roleId } = req.body;

      // Verify role belongs to network
      const role = await db.query.networkRoles.findFirst({
        where: and(
          eq(networkRoles.id, roleId),
          eq(networkRoles.networkId, networkId)
        ),
      });

      if (!role) {
        throw new ApiError(400, 'INVALID_ROLE', 'Role not found');
      }

      // Check if user is already a member
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });

      if (existingUser) {
        const existingMember = await db.query.networkMembers.findFirst({
          where: and(
            eq(networkMembers.networkId, networkId),
            eq(networkMembers.userId, existingUser.id)
          ),
        });

        if (existingMember) {
          throw new ApiError(400, 'ALREADY_MEMBER', 'User is already a member');
        }
      }

      // Create invitation
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [invitation] = await db
        .insert(networkInvitations)
        .values({
          networkId,
          email: email.toLowerCase(),
          roleId,
          invitedBy: userId,
          token,
          expiresAt,
        })
        .returning();

      // TODO: Send invitation email

      res.status(201).json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/members/{userId}:
 *   delete:
 *     summary: Remove a member from the network
 *     tags: [Team]
 */
router.delete(
  '/members/:memberId',
  authenticate,
  requirePermission(Permission.REMOVE_MEMBERS),
  async (req, res, next) => {
    try {
      const { networkId, memberId } = req.params;

      // Get network to check owner
      const network = await db.query.networks.findFirst({
        where: eq(networks.id, networkId),
      });

      if (!network) {
        throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
      }

      // Get the member to check if they are the owner
      const member = await db.query.networkMembers.findFirst({
        where: and(
          eq(networkMembers.id, memberId),
          eq(networkMembers.networkId, networkId)
        ),
      });

      if (!member) {
        throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member not found');
      }

      // Prevent removing owner
      if (member.userId === network.ownerId) {
        throw new ApiError(400, 'CANNOT_REMOVE_OWNER', 'Cannot remove the network owner. Transfer ownership first.');
      }

      await db
        .delete(networkMembers)
        .where(eq(networkMembers.id, memberId));

      // Invalidate cache
      await membershipService.invalidateCache(member.userId, networkId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/roles:
 *   get:
 *     summary: List all roles
 *     tags: [Team]
 */
router.get(
  '/roles',
  authenticate,
  requirePermission(Permission.VIEW_TEAM),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      const roles = await db.query.networkRoles.findMany({
        where: eq(networkRoles.networkId, networkId),
      });

      res.json({ roles });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Team]
 */
const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  permissions: z.array(z.string()),
});

router.post(
  '/roles',
  authenticate,
  requirePermission(Permission.MANAGE_ROLES),
  validateBody(createRoleSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      const [role] = await db
        .insert(networkRoles)
        .values({
          ...req.body,
          networkId,
        })
        .returning();

      res.status(201).json({ role });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/roles/{roleId}:
 *   patch:
 *     summary: Update a role
 *     tags: [Team]
 */
router.patch(
  '/roles/:roleId',
  authenticate,
  requirePermission(Permission.MANAGE_ROLES),
  validateBody(createRoleSchema.partial()),
  async (req, res, next) => {
    try {
      const { networkId, roleId } = req.params;

      const [role] = await db
        .update(networkRoles)
        .set(req.body)
        .where(and(
          eq(networkRoles.id, roleId),
          eq(networkRoles.networkId, networkId)
        ))
        .returning();

      if (!role) {
        throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role not found');
      }

      res.json({ role });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/roles/{roleId}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Team]
 */
router.delete(
  '/roles/:roleId',
  authenticate,
  requirePermission(Permission.MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const { networkId, roleId } = req.params;

      // Check if role is default (can't delete default)
      const role = await db.query.networkRoles.findFirst({
        where: and(
          eq(networkRoles.id, roleId),
          eq(networkRoles.networkId, networkId)
        ),
      });

      if (!role) {
        throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role not found');
      }

      if (role.isDefault) {
        throw new ApiError(400, 'CANNOT_DELETE_DEFAULT', 'Cannot delete the default role');
      }

      await db.delete(networkRoles).where(eq(networkRoles.id, roleId));

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/members/{memberId}:
 *   patch:
 *     summary: Update a member's role
 *     tags: [Team]
 */
const updateMemberSchema = z.object({
  roleId: z.string().uuid(),
});

router.patch(
  '/members/:memberId',
  authenticate,
  requirePermission(Permission.MANAGE_ROLES),
  validateBody(updateMemberSchema),
  async (req, res, next) => {
    try {
      const { networkId, memberId } = req.params;
      const { roleId } = req.body;

      // Get network to check owner
      const network = await db.query.networks.findFirst({
        where: eq(networks.id, networkId),
      });

      if (!network) {
        throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
      }

      // Get the member to check if they are the owner
      const existingMember = await db.query.networkMembers.findFirst({
        where: and(
          eq(networkMembers.id, memberId),
          eq(networkMembers.networkId, networkId)
        ),
      });

      if (!existingMember) {
        throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member not found');
      }

      // Prevent changing owner's role
      if (existingMember.userId === network.ownerId) {
        throw new ApiError(400, 'CANNOT_CHANGE_OWNER_ROLE', 'Cannot change the network owner\'s role');
      }

      // Verify role belongs to network
      const role = await db.query.networkRoles.findFirst({
        where: and(
          eq(networkRoles.id, roleId),
          eq(networkRoles.networkId, networkId)
        ),
      });

      if (!role) {
        throw new ApiError(400, 'INVALID_ROLE', 'Role not found');
      }

      const [member] = await db
        .update(networkMembers)
        .set({ roleId })
        .where(and(
          eq(networkMembers.id, memberId),
          eq(networkMembers.networkId, networkId)
        ))
        .returning();

      // Invalidate cache
      await membershipService.invalidateCache(member.userId, networkId);

      res.json({ member });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/invitations:
 *   post:
 *     summary: Create an invitation
 *     tags: [Team]
 */
router.post(
  '/invitations',
  authenticate,
  requirePermission(Permission.INVITE_MEMBERS),
  validateBody(inviteSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { userId } = req as AuthenticatedRequest;
      const { email, roleId } = req.body;

      // Verify role belongs to network
      const role = await db.query.networkRoles.findFirst({
        where: and(
          eq(networkRoles.id, roleId),
          eq(networkRoles.networkId, networkId)
        ),
      });

      if (!role) {
        throw new ApiError(400, 'INVALID_ROLE', 'Role not found');
      }

      // Check if user is already a member
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });

      if (existingUser) {
        const existingMember = await db.query.networkMembers.findFirst({
          where: and(
            eq(networkMembers.networkId, networkId),
            eq(networkMembers.userId, existingUser.id)
          ),
        });

        if (existingMember) {
          throw new ApiError(400, 'ALREADY_MEMBER', 'User is already a member');
        }
      }

      // Create invitation
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [invitation] = await db
        .insert(networkInvitations)
        .values({
          networkId,
          email: email.toLowerCase(),
          roleId,
          invitedBy: userId,
          token,
          expiresAt,
        })
        .returning();

      res.status(201).json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/invitations/{invitationId}:
 *   delete:
 *     summary: Revoke an invitation
 *     tags: [Team]
 */
router.delete(
  '/invitations/:invitationId',
  authenticate,
  requirePermission(Permission.INVITE_MEMBERS),
  async (req, res, next) => {
    try {
      const { networkId, invitationId } = req.params;

      await db
        .delete(networkInvitations)
        .where(and(
          eq(networkInvitations.id, invitationId),
          eq(networkInvitations.networkId, networkId)
        ));

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/team/transfer-ownership:
 *   post:
 *     summary: Transfer network ownership to another member
 *     tags: [Team]
 */
const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid(),
});

router.post(
  '/transfer-ownership',
  authenticate,
  validateBody(transferOwnershipSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { userId } = req as AuthenticatedRequest;
      const { newOwnerId } = req.body;

      // Get network
      const network = await db.query.networks.findFirst({
        where: eq(networks.id, networkId),
      });

      if (!network) {
        throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
      }

      // Only current owner can transfer ownership
      if (network.ownerId !== userId) {
        throw new ApiError(403, 'FORBIDDEN', 'Only the network owner can transfer ownership');
      }

      // Can't transfer to yourself
      if (newOwnerId === userId) {
        throw new ApiError(400, 'INVALID_TRANSFER', 'Cannot transfer ownership to yourself');
      }

      // Verify new owner is a member
      const newOwnerMember = await db.query.networkMembers.findFirst({
        where: and(
          eq(networkMembers.networkId, networkId),
          eq(networkMembers.userId, newOwnerId)
        ),
      });

      if (!newOwnerMember) {
        throw new ApiError(400, 'INVALID_TRANSFER', 'New owner must be a member of the network');
      }

      // Get the Admin role
      const adminRole = await db.query.networkRoles.findFirst({
        where: and(
          eq(networkRoles.networkId, networkId),
          eq(networkRoles.name, 'Admin')
        ),
      });

      // Transfer ownership
      await db
        .update(networks)
        .set({ ownerId: newOwnerId })
        .where(eq(networks.id, networkId));

      // Update new owner's role to Admin if there is an Admin role
      if (adminRole) {
        await db
          .update(networkMembers)
          .set({ roleId: adminRole.id })
          .where(and(
            eq(networkMembers.networkId, networkId),
            eq(networkMembers.userId, newOwnerId)
          ));
      }

      // Invalidate caches
      await membershipService.invalidateCache(userId, networkId);
      await membershipService.invalidateCache(newOwnerId, networkId);

      res.json({ success: true, newOwnerId });
    } catch (error) {
      next(error);
    }
  }
);

export { router as teamRouter };
