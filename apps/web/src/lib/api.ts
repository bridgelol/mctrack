import { getSession } from 'next-auth/react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  async get<T>(path: string, options?: { params?: Record<string, string> }): Promise<T> {
    const session = await getSession();
    const url = new URL(`${API_BASE}${path}`);

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        ...(session?.accessToken && {
          Authorization: `Bearer ${(session as any).accessToken}`,
        }),
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        error.error?.code || 'UNKNOWN_ERROR',
        error.error?.message || 'An error occurred'
      );
    }

    return res.json();
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const session = await getSession();

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.accessToken && {
          Authorization: `Bearer ${(session as any).accessToken}`,
        }),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        error.error?.code || 'UNKNOWN_ERROR',
        error.error?.message || 'An error occurred'
      );
    }

    return res.json();
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const session = await getSession();

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.accessToken && {
          Authorization: `Bearer ${(session as any).accessToken}`,
        }),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        error.error?.code || 'UNKNOWN_ERROR',
        error.error?.message || 'An error occurred'
      );
    }

    return res.json();
  },

  async delete(path: string): Promise<void> {
    const session = await getSession();

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: {
        ...(session?.accessToken && {
          Authorization: `Bearer ${(session as any).accessToken}`,
        }),
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        error.error?.code || 'UNKNOWN_ERROR',
        error.error?.message || 'An error occurred'
      );
    }
  },
};
