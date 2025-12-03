'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Lock,
  Shield,
  Bell,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const user = session?.user;

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (status === 'loading') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-base-300/70 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-base-300/70 rounded animate-pulse" />
        </div>
        <div className="rounded-xl bg-base-200 p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 bg-base-300/70 rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-base-300/70 rounded animate-pulse" />
              <div className="h-3 w-48 bg-base-300/70 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-28 bg-base-300/70 rounded animate-pulse" />
              <div className="h-10 w-full max-w-md bg-base-300/70 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 bg-base-300/70 rounded animate-pulse" />
              <div className="h-10 w-full max-w-md bg-base-300/70 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-base-200 p-6 space-y-4">
          <div className="h-5 w-20 bg-base-300/70 rounded animate-pulse" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-base-300/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-base-300/70 rounded-lg animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-24 bg-base-300/70 rounded animate-pulse" />
                    <div className="h-3 w-40 bg-base-300/70 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-28 bg-base-300/70 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        await update({ name });
        setMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/user', {
        method: 'DELETE',
      });

      if (res.ok) {
        await signOut({ callbackUrl: '/login' });
      } else {
        setMessage({ type: 'error', text: 'Failed to delete account' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-base-content">Account Settings</h1>
        <p className="text-base-content/60 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Your personal information and profile settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <Avatar
                src={user?.image}
                name={user?.name || user?.email || 'User'}
                size="xl"
              />
              <div>
                <p className="text-sm font-medium text-base-content">{user?.name || 'User'}</p>
                <p className="text-sm text-base-content/60 mt-1">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Name */}
            <Input
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User className="h-4 w-4" />}
            />

            {/* Email (Read-only) */}
            <Input
              label="Email Address"
              value={email}
              disabled
              leftIcon={<Mail className="h-4 w-4" />}
              hint="Contact support to change your email address"
            />

            {/* Message */}
            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-error/10 text-error border border-error/20'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" isLoading={saving}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-base-300/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-base-300 flex items-center justify-center">
                <Lock className="h-5 w-5 text-base-content/60" />
              </div>
              <div>
                <p className="font-medium text-base-content">Password</p>
                <p className="text-sm text-base-content/60">
                  Last changed 3 months ago
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-base-300/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-base-300 flex items-center justify-center">
                <Shield className="h-5 w-5 text-base-content/60" />
              </div>
              <div>
                <p className="font-medium text-base-content">Two-Factor Authentication</p>
                <p className="text-sm text-base-content/60">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Enable 2FA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between p-4 rounded-lg bg-base-300/30 cursor-pointer">
            <div>
              <p className="font-medium text-base-content">Email Notifications</p>
              <p className="text-sm text-base-content/60">
                Receive emails about account activity
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="toggle toggle-primary"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-lg bg-base-300/30 cursor-pointer">
            <div>
              <p className="font-medium text-base-content">Weekly Reports</p>
              <p className="text-sm text-base-content/60">
                Get a weekly summary of your network activity
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="toggle toggle-primary"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-lg bg-base-300/30 cursor-pointer">
            <div>
              <p className="font-medium text-base-content">Alert Notifications</p>
              <p className="text-sm text-base-content/60">
                Receive alerts when thresholds are exceeded
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="toggle toggle-primary"
            />
          </label>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-error/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-error">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-error/5 border border-error/20">
            <div>
              <p className="font-medium text-base-content">Delete Account</p>
              <p className="text-sm text-base-content/60">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
              />
              <div className="relative bg-base-200 rounded-xl p-6 max-w-md w-full mx-4 border border-base-300 shadow-2xl">
                <h3 className="text-lg font-bold text-error mb-2">Delete Account</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  This action cannot be undone. This will permanently delete your account
                  and remove all your data from our servers.
                </p>
                <p className="text-sm text-base-content/70 mb-3">
                  Please type <strong>delete my account</strong> to confirm.
                </p>
                <input
                  type="text"
                  className="input input-bordered w-full mb-4"
                  placeholder="delete my account"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-error"
                    disabled={deleteConfirmText !== 'delete my account' || deleting}
                    onClick={handleDeleteAccount}
                  >
                    {deleting ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      'Delete Account'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
