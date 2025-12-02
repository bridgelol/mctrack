import { eq, and } from 'drizzle-orm';
import { db, networks, networkMembers } from '@mctrack/db';
import { Permission } from '@mctrack/shared';
import { redis } from '../lib/redis.js';

const CACHE_TTL = 300; // 5 minutes

export const membershipService = {
  /**
   * Check if a user is a member of a network
   */
  async isMember(userId: string, networkId: string): Promise<boolean> {
    const cacheKey = `membership:${userId}:${networkId}`;
    const cached = await redis.get(cacheKey);

    if (cached !== null) {
      return cached === 'true';
    }

    // Check if owner
    const network = await db.query.networks.findFirst({
      where: eq(networks.id, networkId),
      columns: { ownerId: true },
    });

    if (network?.ownerId === userId) {
      await redis.setex(cacheKey, CACHE_TTL, 'true');
      return true;
    }

    // Check membership
    const member = await db.query.networkMembers.findFirst({
      where: and(
        eq(networkMembers.networkId, networkId),
        eq(networkMembers.userId, userId)
      ),
    });

    const isMember = !!member;
    await redis.setex(cacheKey, CACHE_TTL, isMember.toString());
    return isMember;
  },

  /**
   * Check if a user is the owner of a network
   */
  async isOwner(userId: string, networkId: string): Promise<boolean> {
    const network = await db.query.networks.findFirst({
      where: eq(networks.id, networkId),
      columns: { ownerId: true },
    });

    return network?.ownerId === userId;
  },

  /**
   * Get a user's permissions for a network
   */
  async getPermissions(userId: string, networkId: string): Promise<Permission[]> {
    const cacheKey = `permissions:${userId}:${networkId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Owners have all permissions
    const isOwner = await this.isOwner(userId, networkId);
    if (isOwner) {
      const allPermissions = Object.values(Permission) as Permission[];
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(allPermissions));
      return allPermissions;
    }

    // Get member's role permissions
    const member = await db.query.networkMembers.findFirst({
      where: and(
        eq(networkMembers.networkId, networkId),
        eq(networkMembers.userId, userId)
      ),
      with: {
        role: true,
      },
    });

    if (!member?.role) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify([]));
      return [];
    }

    const permissions = member.role.permissions as Permission[];
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(permissions));
    return permissions;
  },

  /**
   * Check if a user has a specific permission
   */
  async checkPermission(
    userId: string,
    networkId: string,
    permission: Permission
  ): Promise<boolean> {
    const permissions = await this.getPermissions(userId, networkId);
    return permissions.includes(permission);
  },

  /**
   * Invalidate cached permissions for a user/network
   */
  async invalidateCache(userId: string, networkId: string): Promise<void> {
    await redis.del(`membership:${userId}:${networkId}`);
    await redis.del(`permissions:${userId}:${networkId}`);
  },
};
