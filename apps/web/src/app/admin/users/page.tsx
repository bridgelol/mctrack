'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Modal } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  Trash2,
  UserCog,
  LogIn,
  Network,
  MoreVertical,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'member' | 'admin';
  emailVerified: boolean;
  signUpTime: string;
  lastLogin: string | null;
  networksOwned: number;
  networksMember: number;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'admin'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', page, search, roleFilter],
    queryFn: () => api.get('/admin/users', {
      params: {
        page: page.toString(),
        limit: '25',
        ...(search && { search }),
        role: roleFilter,
      },
    }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { role?: string } }) =>
      api.patch(`/admin/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowRoleModal(false);
      setSelectedUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowDeleteModal(false);
      setSelectedUser(null);
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post<{ token: string; user: { id: string; email: string } }>(`/admin/users/${userId}/impersonate`, {}),
    onSuccess: (data) => {
      // Store impersonation token and redirect
      localStorage.setItem('impersonation_token', data.token);
      localStorage.setItem('impersonation_user', JSON.stringify(data.user));
      window.location.href = '/networks';
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Users</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage all platform users
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by email or username..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setRoleFilter('all'); setPage(1); }}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                roleFilter === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50'
              )}
            >
              All
            </button>
            <button
              onClick={() => { setRoleFilter('member'); setPage(1); }}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                roleFilter === 'member'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50'
              )}
            >
              Members
            </button>
            <button
              onClick={() => { setRoleFilter('admin'); setPage(1); }}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                roleFilter === 'admin'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50'
              )}
            >
              Admins
            </button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Networks
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Signed Up
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4" colSpan={6}>
                      <div className="h-10 bg-gray-800/50 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : data?.users.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.username} size="sm" />
                        <div>
                          <div className="font-medium text-gray-100">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        {!user.emailVerified && (
                          <Badge variant="warning" size="sm">Unverified</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {user.role === 'admin' ? (
                        <Badge variant="error">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Member</Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <span className="text-gray-100">{user.networksOwned}</span>
                        <span className="text-gray-500"> owned</span>
                        {user.networksMember > 0 && (
                          <>
                            <span className="text-gray-500">, </span>
                            <span className="text-gray-100">{user.networksMember}</span>
                            <span className="text-gray-500"> member</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">
                      {formatDate(user.signUpTime)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRoleModal(true);
                          }}
                          title="Change Role"
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => impersonateMutation.mutate(user.id)}
                          disabled={impersonateMutation.isPending}
                          title="Impersonate User"
                        >
                          <LogIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="text-error-400 hover:text-error-300"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <div className="text-sm text-gray-500">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total} users
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-400">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete the user <strong>{selectedUser?.username}</strong> ({selectedUser?.email})?
          </p>
          <p className="text-sm text-gray-500">
            This action cannot be undone. The user will lose access to all networks they are a member of.
          </p>
          {selectedUser?.networksOwned && selectedUser.networksOwned > 0 && (
            <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/20">
              <p className="text-error-400 text-sm">
                This user owns {selectedUser.networksOwned} network(s). You must transfer ownership before deleting.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="error"
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              disabled={deleteUserMutation.isPending || (selectedUser?.networksOwned ?? 0) > 0}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedUser(null);
        }}
        title="Change User Role"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Change the role for <strong>{selectedUser?.username}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            Current role: <Badge variant={selectedUser?.role === 'admin' ? 'error' : 'secondary'}>{selectedUser?.role}</Badge>
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => selectedUser && updateUserMutation.mutate({ userId: selectedUser.id, data: { role: 'member' } })}
              className={cn(
                'flex-1 p-4 rounded-lg border transition-colors',
                selectedUser?.role === 'member'
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-gray-800 hover:border-gray-700'
              )}
            >
              <div className="font-medium text-gray-100">Member</div>
              <div className="text-sm text-gray-500 mt-1">Standard user access</div>
            </button>
            <button
              onClick={() => selectedUser && updateUserMutation.mutate({ userId: selectedUser.id, data: { role: 'admin' } })}
              className={cn(
                'flex-1 p-4 rounded-lg border transition-colors',
                selectedUser?.role === 'admin'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-gray-800 hover:border-gray-700'
              )}
            >
              <div className="font-medium text-gray-100 flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                Admin
              </div>
              <div className="text-sm text-gray-500 mt-1">Full platform access</div>
            </button>
          </div>
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowRoleModal(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
