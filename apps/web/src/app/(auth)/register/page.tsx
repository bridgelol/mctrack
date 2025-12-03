'use client';

import { Suspense, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Lock, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const label = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength] || 'Very Weak';
  const color = ['bg-error-400', 'bg-error-400', 'bg-warning-400', 'bg-success-400', 'bg-success-400'][strength] || 'bg-gray-800';

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < strength ? color : 'bg-gray-800'
            )}
          />
        ))}
      </div>
      <p className={cn(
        'text-xs',
        strength <= 1 ? 'text-error-400' : strength <= 2 ? 'text-warning-400' : 'text-success-400'
      )}>
        Password strength: {label}
      </p>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordsMatch = password === confirmPassword;
  const isValid = username.length >= 3 && email && password.length >= 8 && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!passwordsMatch) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-2xl font-bold text-gray-50">Create an account</h1>
        <p className="text-gray-400 mt-1">
          Start tracking your Minecraft server analytics
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-error-500/10 border border-error-500/20">
          <AlertCircle className="h-5 w-5 text-error-400 flex-shrink-0" />
          <p className="text-sm text-error-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Username"
          type="text"
          placeholder="yourname"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
          leftIcon={<User className="h-4 w-4" />}
          hint="3-32 characters"
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            leftIcon={<Lock className="h-4 w-4" />}
          />
          <PasswordStrength password={password} />
        </div>

        <div>
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            leftIcon={<Lock className="h-4 w-4" />}
            error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
            rightIcon={
              confirmPassword && passwordsMatch ? (
                <Check className="h-4 w-4 text-success-400" />
              ) : undefined
            }
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={loading}
          disabled={!isValid}
        >
          Create Account
        </Button>
      </form>

      {/* Login Link */}
      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-400 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
