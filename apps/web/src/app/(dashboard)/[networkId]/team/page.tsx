'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Member {
  id: string;
  userId: string;
  user: {
    email: string;
    username: string;
  };
  role: {
    id: string;
    name: string;
    color: string;
  };
  joinedAt: string;
}

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  isDefault: boolean;
}

interface Invitation {
  id: string;
  email: string;
  role: {
    name: string;
    color: string;
  };
  expiresAt: string;
  createdAt: string;
}

interface TeamResponse {
  members: Member[];
  roles: Role[];
  invitations: Invitation[];
  isOwner: boolean;
}

export default function TeamPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'invitations'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const { data, isLoading } = useQuery<TeamResponse>({
    queryKey: ['team', networkId],
    queryFn: () => api.get(`/networks/${networkId}/team`),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; roleId: string }) =>
      api.post(`/networks/${networkId}/team/invitations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', networkId] });
      setShowInviteModal(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/networks/${networkId}/team/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', networkId] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: string; roleId: string }) =>
      api.patch(`/networks/${networkId}/team/members/${memberId}`, { roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', networkId] });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      api.delete(`/networks/${networkId}/team/invitations/${invitationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', networkId] });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (role: Partial<Role>) =>
      editingRole
        ? api.patch(`/networks/${networkId}/team/roles/${editingRole.id}`, role)
        : api.post(`/networks/${networkId}/team/roles`, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', networkId] });
      setShowRoleModal(false);
      setEditingRole(null);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) =>
      api.delete(`/networks/${networkId}/team/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', networkId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team</h1>

      {/* Tabs */}
      <div className="tabs tabs-boxed w-fit">
        <button
          className={`tab ${activeTab === 'members' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({data?.members.length})
        </button>
        <button
          className={`tab ${activeTab === 'roles' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Roles ({data?.roles.length})
        </button>
        <button
          className={`tab ${activeTab === 'invitations' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('invitations')}
        >
          Invitations ({data?.invitations.length})
        </button>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm" onClick={() => setShowInviteModal(true)}>
              + Invite Member
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data?.members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div>
                        <div className="font-medium">{member.user.username}</div>
                        <div className="text-sm text-base-content/60">{member.user.email}</div>
                      </div>
                    </td>
                    <td>
                      <select
                        className="select select-sm select-bordered"
                        value={member.role.id}
                        onChange={(e) => updateRoleMutation.mutate({
                          memberId: member.id,
                          roleId: e.target.value,
                        })}
                        disabled={!data?.isOwner}
                      >
                        {data?.roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                    <td>
                      {data?.isOwner && (
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingRole(null);
                setShowRoleModal(true);
              }}
            >
              + New Role
            </button>
          </div>

          <div className="grid gap-4">
            {data?.roles.map((role) => (
              <div key={role.id} className="card bg-base-200">
                <div className="card-body">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <h3 className="font-medium">{role.name}</h3>
                      {role.isDefault && (
                        <span className="badge badge-sm">Default</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          setEditingRole(role);
                          setShowRoleModal(true);
                        }}
                      >
                        Edit
                      </button>
                      {!role.isDefault && (
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => deleteRoleMutation.mutate(role.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {role.permissions.slice(0, 5).map((perm) => (
                      <span key={perm} className="badge badge-sm badge-outline">
                        {perm.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {role.permissions.length > 5 && (
                      <span className="badge badge-sm">+{role.permissions.length - 5} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm" onClick={() => setShowInviteModal(true)}>
              + Send Invitation
            </button>
          </div>

          {data?.invitations.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              No pending invitations
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Expires</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td>{invitation.email}</td>
                      <td>
                        <span
                          className="badge badge-sm"
                          style={{ backgroundColor: invitation.role.color, color: 'white' }}
                        >
                          {invitation.role.name}
                        </span>
                      </td>
                      <td>{new Date(invitation.expiresAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          roles={data?.roles || []}
          onClose={() => setShowInviteModal(false)}
          onSave={(data) => inviteMutation.mutate(data)}
          isLoading={inviteMutation.isPending}
        />
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <RoleModal
          role={editingRole}
          onClose={() => {
            setShowRoleModal(false);
            setEditingRole(null);
          }}
          onSave={(data) => createRoleMutation.mutate(data)}
          isLoading={createRoleMutation.isPending}
        />
      )}
    </div>
  );
}

interface InviteModalProps {
  roles: Role[];
  onClose: () => void;
  onSave: (data: { email: string; roleId: string }) => void;
  isLoading: boolean;
}

function InviteModal({ roles, onClose, onSave, isLoading }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roles.find(r => r.isDefault)?.id || roles[0]?.id || '');

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Invite Team Member</h3>
        <form
          className="space-y-4 mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ email, roleId });
          }}
        >
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Role</span>
            </label>
            <select
              className="select select-bordered"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

const ALL_PERMISSIONS = [
  'view_dashboard', 'view_advanced_analytics', 'export_data',
  'view_players', 'view_player_details', 'view_payments',
  'view_campaigns', 'manage_campaigns', 'manage_gamemodes',
  'manage_api_keys', 'manage_webhooks', 'manage_alerts',
  'view_team', 'invite_members', 'remove_members', 'manage_roles',
  'manage_network_settings',
];

interface RoleModalProps {
  role: Role | null;
  onClose: () => void;
  onSave: (data: Partial<Role>) => void;
  isLoading: boolean;
}

function RoleModal({ role, onClose, onSave, isLoading }: RoleModalProps) {
  const [name, setName] = useState(role?.name || '');
  const [color, setColor] = useState(role?.color || '#6366f1');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || []);

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">{role ? 'Edit Role' : 'New Role'}</h3>
        <form
          className="space-y-4 mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ name, color, permissions });
          }}
        >
          <div className="flex gap-4">
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text">Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Color</span>
              </label>
              <input
                type="color"
                className="input input-bordered h-12 w-20"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Permissions</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                  <span className="label-text">{perm.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Save'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
