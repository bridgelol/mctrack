'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authenticate } from '@/lib/actions';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/networks';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(error ? 'Invalid credentials' : '');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    startTransition(async () => {
      const result = await authenticate(email, password, callbackUrl);
      if (result?.error) {
        setErrorMessage(result.error);
      }
      // If successful, the server action will redirect
    });
  };

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title justify-center mb-4">Sign In</h2>

        {errorMessage && (
          <div className="alert alert-error mb-4">
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="input input-bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isPending}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="divider">OR</div>

        <div className="space-y-2">
          <form action={`/api/auth/signin/discord?callbackUrl=${encodeURIComponent(callbackUrl)}`} method="GET">
            <button type="submit" className="btn btn-outline w-full" disabled={isPending}>
              Continue with Discord
            </button>
          </form>
          <form action={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`} method="GET">
            <button type="submit" className="btn btn-outline w-full" disabled={isPending}>
              Continue with Google
            </button>
          </form>
        </div>

        <p className="text-center mt-4 text-sm text-base-content/60">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="link link-primary">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body flex items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
