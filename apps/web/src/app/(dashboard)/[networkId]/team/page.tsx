'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
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
  ownerId?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function TeamPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

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
      setSelectedMember(null);
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

  const transferOwnershipMutation = useMutation({
    mutationFn: (newOwnerId: string) =>
      api.post(`/networks/${networkId}/team/transfer-ownership`, { newOwnerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', networkId] });
      queryClient.invalidateQueries({ queryKey: ['network', networkId] });
      setShowTransferModal(false);
    },
  });

  const isOwnerMember = (member: Member) => member.user.id === data?.ownerId;

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-base-300/70 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-base-300/70 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-base-300/70 rounded-lg animate-pulse" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-base-200 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-base-300/70 rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-8 bg-base-300/70 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-base-300/70 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-base-300 pb-3">
          <div className="flex gap-8">
            <div className="h-4 w-20 bg-base-300/70 rounded animate-pulse" />
            <div className="h-4 w-32 bg-base-300/70 rounded animate-pulse" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-base-200 rounded-xl overflow-hidden">
          <div className="flex gap-4 p-4 border-b border-base-300 bg-base-300/30">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 flex-1 bg-base-300/70 rounded animate-pulse" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-base-300 last:border-0">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 bg-base-300/70 rounded-full animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-28 bg-base-300/70 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-base-300/70 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-20 bg-base-300/70 rounded-full animate-pulse" />
              <div className="h-4 w-24 bg-base-300/70 rounded animate-pulse" />
              <div className="h-8 w-8 bg-base-300/70 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Management</h1>
          <p className="text-base-content/60 mt-1">
            Manage team members, roles, and permissions for your network.
          </p>
        </div>
        <button
          className="btn btn-primary gap-2"
          onClick={() => setShowInviteModal(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
          </svg>
          Invite Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-base-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold">{data?.members.length}</p>
              <p className="text-sm text-base-content/60">Team Members</p>
            </div>
          </div>
        </div>
        <div className="bg-base-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold">{data?.roles.length}</p>
              <p className="text-sm text-base-content/60">Roles</p>
            </div>
          </div>
        </div>
        <div className="bg-base-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-warning/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold">{data?.invitations.length}</p>
              <p className="text-sm text-base-content/60">Pending Invites</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-base-300">
        <nav className="flex gap-8">
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
            onClick={() => setActiveTab('members')}
          >
            Members
          </button>
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
            onClick={() => setActiveTab('roles')}
          >
            Roles & Permissions
          </button>
        </nav>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Members List */}
          <div className="bg-base-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="border-base-300">
                    <th className="bg-base-200 text-xs uppercase tracking-wider text-base-content/50 font-medium">Member</th>
                    <th className="bg-base-200 text-xs uppercase tracking-wider text-base-content/50 font-medium">Role</th>
                    <th className="bg-base-200 text-xs uppercase tracking-wider text-base-content/50 font-medium">Joined</th>
                    <th className="bg-base-200 text-xs uppercase tracking-wider text-base-content/50 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.members.map((member) => (
                    <tr key={member.id} className="border-base-300 hover:bg-base-300/30 transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(member.user.username)} flex items-center justify-center text-white font-medium text-sm`}>
                            {getInitials(member.user.username)}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {member.user.username}
                              {isOwnerMember(member) && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 rounded-full">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-base-content/50">{member.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isOwnerMember(member) ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${member.role.color}20`, color: member.role.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.role.color }} />
                            {member.role.name}
                          </span>
                        ) : data?.isOwner ? (
                          <select
                            className="select select-sm select-bordered bg-transparent min-w-[120px]"
                            value={member.role.id}
                            onChange={(e) => updateRoleMutation.mutate({
                              memberId: member.id,
                              roleId: e.target.value,
                            })}
                          >
                            {data?.roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${member.role.color}20`, color: member.role.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.role.color }} />
                            {member.role.name}
                          </span>
                        )}
                      </td>
                      <td className="text-base-content/60 text-sm">
                        {new Date(member.joinedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td>
                        {data?.isOwner && !isOwnerMember(member) && (
                          <div className="dropdown dropdown-end">
                            <label tabIndex={0} className="btn btn-ghost btn-sm btn-square">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </label>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-lg w-48 border border-base-300">
                              <li>
                                <button
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowTransferModal(true);
                                  }}
                                  className="text-sm"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                                  </svg>
                                  Transfer Ownership
                                </button>
                              </li>
                              <li>
                                <button
                                  onClick={() => removeMemberMutation.mutate(member.id)}
                                  className="text-error text-sm"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Remove Member
                                </button>
                              </li>
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invitations */}
          {data?.invitations && data.invitations.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Pending Invitations</h3>
              <div className="bg-base-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr className="border-base-300">
                        <th className="bg-base-200 text-xs uppercase tracking-wider text-base-content/50 font-medium">Email</th>
                        <th className="bg-base-200 text-xs uppercase tracking-wider text-base-content/50 font-medium">Role</th>
                        <th className="bg-base-200 text-xs uppercase tracking-wider text-base-content/50 font-medium">Expires</th>
                        <th className="bg-base-200 text-xs uppercase tracking-wider text-base-content/50 font-medium w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invitations.map((invitation) => (
                        <tr key={invitation.id} className="border-base-300">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center text-base-content/40">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                              </div>
                              <span className="text-base-content/80">{invitation.email}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: `${invitation.role.color}20`, color: invitation.role.color }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: invitation.role.color }} />
                              {invitation.role.name}
                            </span>
                          </td>
                          <td className="text-base-content/60 text-sm">
                            {new Date(invitation.expiresAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td>
                            <button
                              className="btn btn-ghost btn-sm text-error"
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              className="btn btn-primary gap-2"
              onClick={() => {
                setEditingRole(null);
                setShowRoleModal(true);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Role
            </button>
          </div>

          <div className="grid gap-4">
            {data?.roles.map((role) => (
              <div key={role.id} className="bg-base-200 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${role.color}20` }}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {role.name}
                        {role.isDefault && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-base-300 text-base-content/60 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-base-content/50 mt-0.5">
                        {role.permissions.length} permissions
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingRole(role);
                        setShowRoleModal(true);
                      }}
                    >
                      Edit
                    </button>
                    {!role.isDefault && (
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => deleteRoleMutation.mutate(role.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {role.permissions.slice(0, 8).map((perm) => (
                    <span
                      key={perm}
                      className="px-2.5 py-1 text-xs font-medium bg-base-300 text-base-content/70 rounded-md"
                    >
                      {perm.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {role.permissions.length > 8 && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-base-300 text-base-content/50 rounded-md">
                      +{role.permissions.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          roles={data?.roles || []}
          onClose={() => setShowInviteModal(false)}
          onSave={(data) => inviteMutation.mutate(data)}
          isLoading={inviteMutation.isPending}
          error={inviteMutation.error?.message}
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

      {/* Transfer Ownership Modal */}
      {showTransferModal && selectedMember && (
        <TransferOwnershipModal
          member={selectedMember}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedMember(null);
          }}
          onConfirm={() => transferOwnershipMutation.mutate(selectedMember.user.id)}
          isLoading={transferOwnershipMutation.isPending}
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
  error?: string;
}

function InviteModal({ roles, onClose, onSave, isLoading, error }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roles.find(r => r.isDefault)?.id || roles[0]?.id || '');

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="mb-6">
          <h3 className="text-xl font-semibold">Invite Team Member</h3>
          <p className="text-sm text-base-content/60 mt-1">
            Send an invitation to join your network.
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ email, roleId });
          }}
        >
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Email Address</span>
            </label>
            <input
              type="email"
              className="input input-bordered"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Role</span>
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
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                You can change their role later.
              </span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={isLoading}>
              {isLoading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                'Send Invitation'
              )}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/50">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

const PERMISSION_GROUPS = {
  'Analytics & Data': [
    { id: 'view_dashboard', label: 'View Dashboard' },
    { id: 'view_advanced_analytics', label: 'Advanced Analytics' },
    { id: 'export_data', label: 'Export Data' },
  ],
  'Players': [
    { id: 'view_players', label: 'View Players' },
    { id: 'view_player_details', label: 'Player Details' },
    { id: 'view_payments', label: 'View Payments' },
  ],
  'Campaigns': [
    { id: 'view_campaigns', label: 'View Campaigns' },
    { id: 'manage_campaigns', label: 'Manage Campaigns' },
  ],
  'Configuration': [
    { id: 'manage_gamemodes', label: 'Manage Gamemodes' },
    { id: 'manage_api_keys', label: 'API Keys' },
    { id: 'manage_webhooks', label: 'Webhooks' },
    { id: 'manage_alerts', label: 'Alerts' },
  ],
  'Team': [
    { id: 'view_team', label: 'View Team' },
    { id: 'invite_members', label: 'Invite Members' },
    { id: 'remove_members', label: 'Remove Members' },
    { id: 'manage_roles', label: 'Manage Roles' },
  ],
  'Settings': [
    { id: 'manage_network_settings', label: 'Network Settings' },
  ],
};

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

  const toggleGroup = (groupPerms: { id: string }[]) => {
    const groupIds = groupPerms.map(p => p.id);
    const allSelected = groupIds.every(id => permissions.includes(id));
    if (allSelected) {
      setPermissions(prev => prev.filter(p => !groupIds.includes(p)));
    } else {
      setPermissions(prev => [...new Set([...prev, ...groupIds])]);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl max-h-[90vh]">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="mb-6">
          <h3 className="text-xl font-semibold">{role ? 'Edit Role' : 'Create Role'}</h3>
          <p className="text-sm text-base-content/60 mt-1">
            Configure role name, color, and permissions.
          </p>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ name, color, permissions });
          }}
        >
          <div className="flex gap-4">
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text font-medium">Role Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="e.g., Content Manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-control w-24">
              <label className="label">
                <span className="label-text font-medium">Color</span>
              </label>
              <input
                type="color"
                className="h-12 w-full rounded-lg cursor-pointer border border-base-300"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">
              <span className="label-text font-medium">Permissions</span>
            </label>
            <div className="space-y-4 mt-2">
              {Object.entries(PERMISSION_GROUPS).map(([groupName, groupPerms]) => (
                <div key={groupName} className="bg-base-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">{groupName}</span>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => toggleGroup(groupPerms)}
                    >
                      {groupPerms.every(p => permissions.includes(p.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {groupPerms.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-base-300 rounded-md px-2 py-1.5 transition-colors">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={permissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={isLoading}>
              {isLoading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : role ? (
                'Save Changes'
              ) : (
                'Create Role'
              )}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/50">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

interface TransferOwnershipModalProps {
  member: Member;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function TransferOwnershipModal({ member, onClose, onConfirm, isLoading }: TransferOwnershipModalProps) {
  const [confirmText, setConfirmText] = useState('');

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-warning/10 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-warning" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Transfer Ownership</h3>
            <p className="text-sm text-base-content/60">This action cannot be undone</p>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-base-content/80">
            You are about to transfer ownership of this network to <strong>{member.user.username}</strong> ({member.user.email}).
          </p>
          <p className="text-sm text-base-content/60 mt-2">
            After transfer, you will retain your current role but will no longer be able to:
          </p>
          <ul className="text-sm text-base-content/60 mt-2 space-y-1 list-disc list-inside">
            <li>Delete the network</li>
            <li>Transfer ownership</li>
            <li>Modify billing settings</li>
          </ul>
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Type <strong>TRANSFER</strong> to confirm</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="TRANSFER"
          />
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-warning flex-1"
            disabled={isLoading || confirmText !== 'TRANSFER'}
            onClick={onConfirm}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              'Transfer Ownership'
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/50">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
