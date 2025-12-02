# MCTrack Architecture

## Overview

MCTrack is a SaaS analytics platform for Minecraft servers. It collects session data from Minecraft servers, fetches payment data from webstore providers (PayNow.gg, Tebex.io), and presents analytics through a dashboard.

**Domain**: mctrack.net

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              External Traffic                                │
└─────────────────────────────────────────────────────────────────────────────┘
                │                        │
                ▼                        ▼
┌───────────────────────┐  ┌───────────────────────┐
│   Minecraft Servers   │  │      Web Browsers     │
│  (Plugin → API Keys)  │  │   (Dashboard Users)   │
└───────────────────────┘  └───────────────────────┘
                │                        │
                ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Kubernetes Ingress                                │
│                         (api.mctrack.net, mctrack.net)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                │                        │
        ┌───────┘                        └───────┐
        ▼                                        ▼
┌───────────────────┐                  ┌───────────────────┐
│ Ingestion Service │                  │   Next.js App     │
│    (Express)      │                  │   (Frontend +     │
│                   │                  │    API Routes)    │
│ - Session start   │                  │                   │
│ - Session end     │                  │ - Dashboard UI    │
│ - Batch events    │                  │ - Auth (JWT)      │
│ - API key auth    │                  │ - API endpoints   │
└───────────────────┘                  └───────────────────┘
        │                                        │
        │                                        │
        │    ┌───────────────────────────────────┤
        │    │                                   │
        │    │  ┌───────────────────┐            │
        │    │  │ Payment Sync      │            │
        │    │  │ Worker            │────────────┼────────►┌───────────────────┐
        │    │  │                   │  Fetch     │         │ Payment Providers │
        │    │  │ - Scheduled jobs  │  payments  │         │ (PayNow, Tebex)   │
        │    │  │ - Manual sync     │◄───────────┼─────────│ APIs              │
        │    │  └─────────┬─────────┘            │         └───────────────────┘
        │    │            │                      │
        └────┼────────────┼──────────────────────┘
             │            │
             ▼            ▼
  ┌─────────────────────┐          ┌─────────────────────┐
  │      PostgreSQL     │          │      ClickHouse     │
  │                     │          │                     │
  │ - Users             │          │ - Network Sessions  │
  │ - Networks          │          │ - GameMode Sessions │
  │ - Roles/Members     │          │ - Payments          │
  │ - API Keys          │          │ - Daily Rollups     │
  │ - Subscriptions     │          │ - Retention Cohorts │
  │ - Players           │          │ - LTV Cohorts       │
  │ - Campaigns         │          │ (all segmented by   │
  │ - Audit Log         │          │  platform/device/   │
  └─────────────────────┘          │  country)           │
                                   └─────────────────────┘
             │
             ▼
  ┌─────────────────────┐
  │        Redis        │
  │                     │
  │ - Session store     │
  │ - Rate limiting     │
  │ - Cache             │
  └─────────────────────┘
```

---

## Tech Stack

### Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 (App Router) | SSR, routing, React framework |
| **UI** | DaisyUI + Tailwind CSS | Component library, styling |
| **Backend API** | Express.js | REST API, authentication |
| **Ingestion** | Express.js | High-throughput event ingestion |
| **Database** | PostgreSQL | Relational data (users, networks, etc.) |
| **Analytics DB** | ClickHouse | Time-series analytics, sessions, payments |
| **Cache** | Redis | Sessions, rate limiting, caching |
| **Runtime** | Node.js 20 LTS | JavaScript runtime |
| **Package Manager** | pnpm | Fast, disk-efficient package manager |

### Monorepo Structure

```
mctrack/
├── apps/
│   ├── web/                    # Next.js frontend + API routes
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── (auth)/     # Auth pages (login, register)
│   │   │   │   ├── (dashboard)/# Dashboard pages (protected)
│   │   │   │   │   ├── [networkId]/
│   │   │   │   │   │   ├── analytics/
│   │   │   │   │   │   ├── players/
│   │   │   │   │   │   ├── campaigns/
│   │   │   │   │   │   ├── settings/
│   │   │   │   │   │   └── team/
│   │   │   │   │   └── layout.tsx
│   │   │   │   └── api/        # API routes (Next.js)
│   │   │   ├── components/     # React components
│   │   │   │   ├── ui/         # Base UI components (DaisyUI wrappers)
│   │   │   │   ├── charts/     # Analytics charts
│   │   │   │   ├── tables/     # Data tables
│   │   │   │   └── forms/      # Form components
│   │   │   ├── lib/            # Utilities, API clients
│   │   │   ├── hooks/          # React hooks
│   │   │   └── styles/         # Global styles
│   │   ├── public/
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   ├── api/                    # Express.js backend API
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers
│   │   │   │   ├── auth.ts
│   │   │   │   ├── networks.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── players.ts
│   │   │   │   └── campaigns.ts
│   │   │   ├── middleware/     # Auth, validation, rate limiting
│   │   │   ├── services/       # Business logic
│   │   │   ├── db/             # Database clients (pg, clickhouse)
│   │   │   └── index.ts        # Express app entry
│   │   └── package.json
│   │
│   ├── ingestion/              # Express.js ingestion service
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── buffer/         # Write buffer for ClickHouse
│   │   │   ├── validation/     # Schema validation
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── payment-worker/         # Payment sync worker
│       ├── src/
│       │   ├── adapters/       # Provider adapters (Tebex, PayNow)
│       │   ├── scheduler/      # Job scheduling
│       │   └── index.ts
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types, utils
│   │   ├── src/
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── constants/      # Shared constants
│   │   │   └── utils/          # Shared utilities
│   │   └── package.json
│   │
│   ├── db/                     # Database schemas, migrations
│   │   ├── src/
│   │   │   ├── postgres/       # Drizzle ORM schemas
│   │   │   ├── clickhouse/     # ClickHouse schemas
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── ui/                     # Shared UI components (optional)
│       └── package.json
│
├── k8s/                        # Kubernetes manifests
│   ├── base/
│   └── overlays/
│       ├── dev/
│       ├── staging/
│       └── production/
│
├── ansible/                    # Ansible playbooks
│
├── docker/                     # Dockerfiles
│   ├── web.Dockerfile
│   ├── api.Dockerfile
│   ├── ingestion.Dockerfile
│   └── payment-worker.Dockerfile
│
├── Tiltfile                    # Local dev orchestration
├── docker-compose.deps.yml     # Local databases
├── pnpm-workspace.yaml         # pnpm workspaces config
└── package.json
```

---

## Frontend (Next.js + DaisyUI)

### Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.x | React framework with App Router |
| `react` | 18.x | UI library |
| `tailwindcss` | 3.x | Utility-first CSS |
| `daisyui` | 4.x | Tailwind component library |
| `@tanstack/react-query` | 5.x | Server state management |
| `zustand` | 4.x | Client state management |
| `recharts` | 2.x | Charts and visualizations |
| `zod` | 3.x | Schema validation |
| `react-hook-form` | 7.x | Form handling |
| `next-auth` | 5.x (Auth.js) | Authentication |

### DaisyUI Theme

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        mctrack: {
          'primary': '#6366f1',      // Indigo
          'secondary': '#8b5cf6',    // Purple
          'accent': '#06b6d4',       // Cyan
          'neutral': '#1f2937',      // Gray-800
          'base-100': '#111827',     // Gray-900 (dark bg)
          'base-200': '#1f2937',     // Gray-800
          'base-300': '#374151',     // Gray-700
          'info': '#3b82f6',         // Blue
          'success': '#22c55e',      // Green
          'warning': '#f59e0b',      // Amber
          'error': '#ef4444',        // Red
        },
      },
      'light',  // Light mode fallback
    ],
    darkTheme: 'mctrack',
  },
}
```

### Component Patterns

```tsx
// components/ui/stat-card.tsx
import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon?: ReactNode
}

export function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <div className="stat bg-base-200 rounded-box">
      {icon && <div className="stat-figure text-primary">{icon}</div>}
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      {change !== undefined && (
        <div className={`stat-desc ${change >= 0 ? 'text-success' : 'text-error'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </div>
      )}
    </div>
  )
}

// Usage in dashboard
<div className="stats stats-vertical lg:stats-horizontal shadow">
  <StatCard title="Players Today" value={1234} change={12.5} />
  <StatCard title="Revenue" value="$5,678" change={-3.2} />
  <StatCard title="Peak CCU" value={89} change={5.0} />
</div>
```

### Page Structure

```tsx
// app/(dashboard)/[networkId]/analytics/page.tsx
import { Suspense } from 'react'
import { AnalyticsOverview } from '@/components/analytics/overview'
import { DateRangePicker } from '@/components/ui/date-range-picker'

export default function AnalyticsPage({ params }: { params: { networkId: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <DateRangePicker />
      </div>

      <Suspense fallback={<div className="skeleton h-32 w-full" />}>
        <AnalyticsOverview networkId={params.networkId} />
      </Suspense>
    </div>
  )
}
```

### Data Fetching

```tsx
// hooks/use-analytics.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useAnalyticsOverview(networkId: string, dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'overview', networkId, dateRange],
    queryFn: () => api.get(`/networks/${networkId}/analytics/overview`, {
      params: { start: dateRange.start, end: dateRange.end }
    }),
    staleTime: 60 * 1000, // 1 minute
  })
}
```

### Authentication (Auth.js)

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Discord from 'next-auth/providers/discord'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        })
        if (!user || !await bcrypt.compare(credentials.password, user.passwordHash)) {
          return null
        }
        return { id: user.id, email: user.email, name: user.username }
      },
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId as string
      return session
    },
  },
})

// Export handlers
export const { GET, POST } = handlers
```

```tsx
// lib/auth.ts - Server-side auth helper
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session
}

// Usage in server components
export default async function DashboardPage() {
  const session = await requireAuth()
  // session.user.id available
}
```

---

## API Communication (Hybrid Pattern)

The frontend uses a **hybrid pattern** for API communication:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Hybrid API Pattern                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Next.js App    │
│                  │
│  ┌────────────┐  │     Auth.js handles         ┌──────────────────┐
│  │ Auth.js    │──┼──────────────────────────►  │    PostgreSQL    │
│  │ (NextAuth) │  │     authentication          │    (users)       │
│  └────────────┘  │                             └──────────────────┘
│                  │
│  ┌────────────┐  │     SSR data fetching       ┌──────────────────┐
│  │ API Routes │──┼──────────────────────────►  │  Express API     │
│  │ (BFF)      │  │     (server components)     │  + ClickHouse    │
│  └────────────┘  │                             └──────────────────┘
│                  │
│  ┌────────────┐  │     Client-side fetching    ┌──────────────────┐
│  │ React      │──┼──────────────────────────►  │  Express API     │
│  │ Components │  │     (direct, with JWT)      │  (api.mctrack.net)
│  └────────────┘  │                             └──────────────────┘
└──────────────────┘
```

### When to Use Each Pattern

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Auth.js (Next.js)** | Authentication, sessions | Login, register, OAuth |
| **Next.js API Routes** | SSR, initial page data | Dashboard overview on load |
| **Direct to Express** | Real-time updates, polling | Live CCU, player lists |

### API Client Setup

```typescript
// lib/api.ts
import { getSession } from 'next-auth/react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL // https://api.mctrack.net

export const api = {
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    const session = await getSession()
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` }),
        ...options?.headers,
      },
    })
    if (!res.ok) throw new ApiError(res.status, await res.json())
    return res.json()
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    // Similar with method: 'POST'
  },
}
```

### Server-Side API Calls (Next.js API Routes)

```typescript
// app/api/networks/[networkId]/overview/route.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const API_BASE = process.env.API_URL // Internal: http://api-service:4000

export async function GET(
  request: Request,
  { params }: { params: { networkId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Forward to Express API (internal network)
  const res = await fetch(`${API_BASE}/networks/${params.networkId}/overview`, {
    headers: { 'X-User-Id': session.user.id },
  })

  return NextResponse.json(await res.json())
}
```

### Token Flow

```
1. User logs in via Auth.js (credentials or OAuth)
2. Auth.js creates session + JWT
3. Next.js API routes: Use session directly, forward X-User-Id to Express
4. Client-side calls: Include JWT in Authorization header
5. Express validates JWT or trusts X-User-Id from internal calls
```

---

## Backend (Express.js)

### Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.x | Web framework |
| `drizzle-orm` | 0.29.x | PostgreSQL ORM |
| `@clickhouse/client` | 0.2.x | ClickHouse client |
| `ioredis` | 5.x | Redis client |
| `zod` | 3.x | Request validation |
| `jsonwebtoken` | 9.x | JWT handling |
| `bcrypt` | 5.x | Password hashing |
| `helmet` | 7.x | Security headers |
| `cors` | 2.x | CORS handling |
| `pino` | 8.x | Logging |

### Express App Structure

```typescript
// apps/api/src/index.ts
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { pinoHttp } from 'pino-http'
import { authRouter } from './routes/auth'
import { networksRouter } from './routes/networks'
import { analyticsRouter } from './routes/analytics'
import { errorHandler } from './middleware/error-handler'
import { rateLimiter } from './middleware/rate-limiter'

const app = express()

// Middleware
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN }))
app.use(express.json())
app.use(pinoHttp())
app.use(rateLimiter)

// Routes
app.use('/auth', authRouter)
app.use('/networks', networksRouter)
app.use('/networks/:networkId/analytics', analyticsRouter)

// Error handling
app.use(errorHandler)

app.listen(process.env.PORT || 4000)
```

### Route Handler Pattern

```typescript
// apps/api/src/routes/analytics.ts
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requirePermission } from '../middleware/permissions'
import { validateQuery } from '../middleware/validate'
import { analyticsService } from '../services/analytics'

const router = Router({ mergeParams: true })

const overviewQuerySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  platform: z.enum(['java', 'bedrock', 'all']).optional().default('all'),
  country: z.string().optional(),
})

router.get('/overview',
  authenticate,
  requirePermission('view_dashboard'),
  validateQuery(overviewQuerySchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params
      const { start, end, platform, country } = req.query

      const data = await analyticsService.getOverview(networkId, {
        start: new Date(start),
        end: new Date(end),
        platform,
        country,
      })

      res.json(data)
    } catch (error) {
      next(error)
    }
  }
)

export { router as analyticsRouter }
```

### Service Layer Pattern

```typescript
// apps/api/src/services/analytics.ts
import { clickhouse } from '../db/clickhouse'
import { AnalyticsFilters, OverviewData } from '@mctrack/shared'

export const analyticsService = {
  async getOverview(networkId: string, filters: AnalyticsFilters): Promise<OverviewData> {
    const { start, end, platform, country } = filters

    // Query ClickHouse for metrics
    const [stats, revenue] = await Promise.all([
      this.getPlayerStats(networkId, start, end, platform, country),
      this.getRevenueStats(networkId, start, end, platform, country),
    ])

    return {
      uniquePlayers: stats.unique_players,
      totalSessions: stats.total_sessions,
      avgSessionDuration: stats.avg_duration,
      peakCcu: stats.peak_ccu,
      revenue: revenue.total,
      arpu: revenue.total / stats.unique_players,
      arppu: revenue.total / revenue.paying_players,
    }
  },

  async getPlayerStats(networkId: string, start: Date, end: Date, platform?: string, country?: string) {
    const result = await clickhouse.query({
      query: `
        SELECT
          uniq(player_uuid) as unique_players,
          count() as total_sessions,
          avg(dateDiff('minute', start_time, end_time)) as avg_duration,
          max(peak_ccu) as peak_ccu
        FROM daily_rollups_segmented
        WHERE network_id = {networkId: String}
          AND date >= {start: Date}
          AND date <= {end: Date}
          ${platform && platform !== 'all' ? 'AND platform = {platform: String}' : ''}
          ${country ? 'AND country = {country: String}' : ''}
      `,
      query_params: { networkId, start, end, platform, country },
    })
    return result.json()
  },
}
```

### Middleware Examples

```typescript
// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { redis } from '../db/redis'

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    // Check if token is revoked
    const isRevoked = await redis.get(`revoked:${token}`)
    if (isRevoked) {
      return res.status(401).json({ error: { code: 'TOKEN_REVOKED', message: 'Token revoked' } })
    }

    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } })
  }
}

// apps/api/src/middleware/permissions.ts
import { Request, Response, NextFunction } from 'express'
import { Permission } from '@mctrack/shared'
import { membershipService } from '../services/membership'

export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { networkId } = req.params
    const { userId } = req

    const hasPermission = await membershipService.checkPermission(userId, networkId, permission)

    if (!hasPermission) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      })
    }

    next()
  }
}
```

---

## Services

### 1. Next.js App (mctrack.net)

**Responsibilities:**
- Serve the frontend dashboard (React/Next.js)
- Handle user authentication (email/password, OAuth)
- Provide API routes for dashboard operations
- Manage networks, teams, roles, API keys

**Endpoints handled:**
- `/api/auth/*` - Authentication (login, register, OAuth, token refresh)
- `/api/networks/*` - Network CRUD and settings
- `/api/networks/:id/members/*` - Team management
- `/api/networks/:id/roles/*` - Role management
- `/api/networks/:id/api-keys/*` - API key management
- `/api/networks/:id/analytics/*` - Analytics queries (reads from ClickHouse)
- `/api/networks/:id/players/*` - Player data
- `/api/user/*` - User profile and settings

### 2. Ingestion Service (api.mctrack.net/ingest)

**Responsibilities:**
- Receive high-throughput session data from Minecraft servers
- Validate API keys
- Buffer and batch-write to ClickHouse
- Handle session start/end events

**Endpoints:**
- `POST /ingest/session/start` - Player joins network
- `POST /ingest/session/end` - Player leaves network
- `POST /ingest/session/gamemode` - Player switches gamemode/server
- `POST /ingest/batch` - Batch event submission

**Authentication:** API key in `X-API-Key` header

### 3. Payment Sync Worker

**Responsibilities:**
- Fetch payment data from store provider APIs (pull model)
- Support historical payment imports
- Normalize payment data across providers
- Deduplicate payments (by merchant_payment_id)
- Write to ClickHouse payments table

**Trigger Methods:**
- Manual sync from dashboard (user clicks "Sync Payments")
- Scheduled sync (configurable interval per network)
- Initial full sync when provider is connected

**Provider Adapter Pattern:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    Payment Sync Worker                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   PayNow    │  │    Tebex    │  │   Future    │              │
│  │   Adapter   │  │   Adapter   │  │   Adapter   │              │
│  │             │  │             │  │             │              │
│  │ - Auth      │  │ - Auth      │  │ - Auth      │              │
│  │ - Fetch API │  │ - Fetch API │  │ - Fetch API │              │
│  │ - Paginate  │  │ - Paginate  │  │ - Paginate  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│               ┌─────────────────────┐                            │
│               │  Normalized Payment │                            │
│               │       Handler       │                            │
│               └──────────┬──────────┘                            │
│                          │                                       │
│                          ▼                                       │
│               ┌─────────────────────┐                            │
│               │    Deduplicate &    │                            │
│               │   ClickHouse Write  │                            │
│               └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Session Data Flow

```
Minecraft Server                    MCTrack
      │
      │  1. Player joins
      ▼
┌──────────────┐     POST /ingest/session/start
│    Plugin    │────────────────────────────────►┌──────────────────┐
│              │     {api_key, player_uuid,      │ Ingestion Service│
│              │      player_name, domain, ip}   │                  │
└──────────────┘                                 │  - Validate key  │
      │                                          │  - Enrich data   │
      │  2. Player leaves                        │  - Buffer writes │
      ▼                                          └────────┬─────────┘
┌──────────────┐     POST /ingest/session/end             │
│    Plugin    │────────────────────────────────►         │
│              │     {api_key, session_uuid,              ▼
│              │      end_time}                  ┌──────────────────┐
└──────────────┘                                 │    ClickHouse    │
                                                 │                  │
                                                 │ network_sessions │
                                                 │ gamemode_sessions│
                                                 └──────────────────┘
```

### Payment Data Flow (Pull Model)

```
MCTrack                              Tebex.io / PayNow.gg
    │
    │  Manual sync OR scheduled job
    ▼
┌──────────────────┐   GET /api/transactions?since=...
│ Payment Sync     │──────────────────────────────────►┌────────────────┐
│ Worker           │   Authorization: Bearer <token>   │ Store Platform │
│                  │◄──────────────────────────────────│ API            │
│ - Authenticate   │   {transactions: [...]}           └────────────────┘
│ - Paginate       │
│ - Normalize      │
│ - Deduplicate    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    ClickHouse    │
│                  │
│     payments     │
└──────────────────┘

Sync Triggers:
- User clicks "Sync Now" in dashboard
- Scheduled job (e.g., every 15 min)
- Initial import when provider connected
```

### Dashboard Query Flow

```
User Browser                         MCTrack
      │
      │  View analytics
      ▼
┌──────────────┐   GET /api/networks/:id/analytics/overview
│   Dashboard  │──────────────────────────────────►┌──────────────────┐
│              │   Authorization: Bearer <jwt>     │    Next.js API   │
└──────────────┘                                   │                  │
                                                   │ - Validate JWT   │
      ▲                                            │ - Check perms    │
      │                                            │ - Query CH       │
      │   {players: 150, sessions: 500, ...}       │ - Transform data │
      └────────────────────────────────────────────┴────────┬─────────┘
                                                            │
                                                            ▼
                                                   ┌──────────────────┐
                                                   │    ClickHouse    │
                                                   └──────────────────┘
```

---

## Authentication

### Dashboard Authentication (Auth.js)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Authentication Flow (Auth.js)                         │
└─────────────────────────────────────────────────────────────────────────────┘

Email/Password Login:
┌────────┐  POST /api/auth/callback/credentials  ┌─────────┐  Query  ┌──────────┐
│ Client │──────────────────────────────────────►│ Auth.js │────────►│ Postgres │
│        │  {email, password}                    │         │◄────────│          │
│        │◄──────────────────────────────────────│         │         └──────────┘
│        │  Set-Cookie: next-auth.session-token  │         │
└────────┘                                       └─────────┘

OAuth Flow (Discord/Google):
┌────────┐  GET /api/auth/signin/discord  ┌─────────┐  Redirect  ┌─────────┐
│ Client │───────────────────────────────►│ Auth.js │───────────►│ Discord │
│        │                                │         │            │  OAuth  │
│        │◄───────────────────────────────│         │◄───────────│         │
│        │  Set-Cookie: session-token     │         │  User info │         │
└────────┘                                └─────────┘            └─────────┘

Session Management:
- Session Token: HTTP-only cookie, managed by Auth.js
- JWT Strategy: Stateless, encoded session in cookie
- Session data available via auth() server-side or useSession() client-side
```

### Ingestion Authentication (API Keys)

```
┌──────────────┐  POST /ingest/session/start     ┌───────────────────┐
│   MC Plugin  │────────────────────────────────►│ Ingestion Service │
│              │  X-API-Key: mct_abc123...       │                   │
└──────────────┘                                 │  1. Hash API key  │
                                                 │  2. Lookup in PG  │
                                                 │  3. Get network_id│
                                                 │  4. Check revoked │
                                                 │  5. Update last_  │
                                                 │     used_at       │
                                                 └───────────────────┘

API Key Format: mct_<random_32_chars>
Storage: SHA-256 hash of full key stored in PostgreSQL
```

---

## Multi-Tenancy Model

All data is isolated by `network_id`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Network Isolation                               │
└─────────────────────────────────────────────────────────────────────────────┘

User A (owns Network 1, member of Network 2)
    │
    ├── Network 1 (owner)
    │   ├── Can view all data
    │   ├── Can manage team
    │   ├── Can create API keys
    │   └── Full permissions
    │
    └── Network 2 (member, role: "Moderator")
        ├── Can view dashboard (if role permits)
        ├── Can view players (if role permits)
        └── Cannot manage settings

Every database query includes network_id:
- PostgreSQL: WHERE network_id = $1
- ClickHouse: WHERE network_id = $1

API keys are scoped to a network (and optionally a gamemode):
- Network-level key: Can write sessions for any gamemode
- Gamemode-level key: Can only write sessions for that gamemode
```

---

## Campaigns (Marketing Attribution)

Campaigns allow networks to track marketing spend and ROI by attributing new player joins to specific campaigns.

### Campaign Concept

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Campaign Flow                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. Network creates campaign:
   - Name: "YouTube Summer Promo"
   - Domain filter: "play.example.com" (optional, or track all domains)
   - Start date: 2024-06-01
   - End date: 2024-06-30
   - Budget type: "daily" or "total"
   - Budget amount: $50/day or $1500 total

2. Players join during campaign period:
   - Session recorded with domain "play.example.com"
   - If first_seen is within campaign period AND domain matches → attributed to campaign

3. Revenue tracked:
   - Payments from attributed players count toward campaign revenue
   - ROI calculated: (revenue - spend) / spend

Campaign Attribution Logic:
┌──────────────────┐     Player joins      ┌──────────────────────┐
│  New Player      │─────────────────────►│  Check active        │
│  first_seen      │     domain: xyz.com   │  campaigns for       │
└──────────────────┘                       │  this network        │
                                           └──────────┬───────────┘
                                                      │
                              ┌────────────────────────┼────────────────────────┐
                              ▼                        ▼                        ▼
                    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
                    │ Campaign A      │     │ Campaign B      │     │ No match        │
                    │ domain: xyz.com │     │ domain: *       │     │                 │
                    │ dates: match    │     │ dates: match    │     │                 │
                    └────────┬────────┘     └────────┬────────┘     └─────────────────┘
                             │                       │
                             ▼                       ▼
                    Player attributed         Player attributed
                    to Campaign A             to Campaign B
                    (most specific wins)      (wildcard fallback)
```

### Campaign Data Model

```
PostgreSQL - Campaigns table:
- id
- network_id
- name
- domain_filter (nullable, null = all domains)
- start_date
- end_date
- budget_type (enum: 'daily', 'total')
- budget_amount (decimal)
- currency
- created_at
- archived_at (nullable)

ClickHouse - Campaign attribution (denormalized on sessions):
- Network Sessions already has: domain, player_uuid
- Add: campaign_id (nullable) - set at session creation if player is new

Campaign Metrics (calculated):
- New players attributed
- Total sessions from attributed players
- Revenue from attributed players
- Spend (manual entry or daily budget × days elapsed)
- ROI percentage
```

### Campaign Dashboard Features

- Create/edit campaigns with date range and domain filter
- Log daily spend or set automatic daily budget
- View attributed players list
- Revenue from campaign players (from payment sync)
- ROI calculation and trending

---

## Analytics Engine

### Core Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| **CCU** | Sessions where `end_time IS NULL` | Real-time concurrent users |
| **Peak CCU** | Max concurrent sessions in time range | Sampled every minute, take max |
| **ARPU** | revenue / unique_players | Average Revenue Per User |
| **ARPPU** | revenue / paying_players | Average Revenue Per Paying User |
| **Payer Conversion** | paying_players / unique_players | % who made a purchase |

### LTV (Lifetime Value) Tracking

Cohorted LTV tracks cumulative revenue at specific days since player's first join:

```
Player joins → D1 → D7 → D14 → D30 → D60 → D90
                │     │      │      │      │      │
                ▼     ▼      ▼      ▼      ▼      ▼
           $0.00  $2.50  $5.00  $8.00  $12.00  $15.00  (cumulative revenue)
```

| Metric | Formula | Use Case |
|--------|---------|----------|
| **LTV D7** | Revenue within 7 days of first join | Early monetization signal |
| **LTV D30** | Revenue within 30 days of first join | Medium-term value |
| **LTV D90** | Revenue within 90 days of first join | Long-term value indicator |
| **Paying LTV** | cumulative_revenue / paying_players | Revenue per payer |

### Segmentation Dimensions

All metrics can be sliced by:

| Dimension | Values | Source |
|-----------|--------|--------|
| **Platform** | `java`, `bedrock` | Detected from client handshake |
| **Bedrock Device** | Android, iOS, Windows, PlayStation, Xbox, Switch | Bedrock protocol |
| **Country** | ISO country codes | IP geolocation at first join |

```
Analytics Query Flow:
┌──────────────────┐
│ Dashboard Request │
│ - metric: ARPU   │
│ - segment: device│
│ - date range     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     Query     ┌──────────────────┐
│   Next.js API    │──────────────►│    ClickHouse    │
│                  │               │                  │
│ - Build query    │               │ Segmented tables │
│ - Apply filters  │◄──────────────│ with pre-computed│
│ - Calculate %    │   Results     │ aggregates       │
└──────────────────┘               └──────────────────┘
```

### CCU Calculation

CCU is derived from session `start_time` and `end_time`:

| Type | Method |
|------|--------|
| **Real-time** | `COUNT(*) WHERE end_time IS NULL` |
| **Historical** | `COUNT(*) WHERE start_time <= t AND (end_time IS NULL OR end_time >= t)` |
| **Peak (daily)** | Time-bucket sampling every minute, take max |

Peak CCU is pre-computed in Daily Rollups during nightly aggregation.

---

## Payment Provider Integration

### Supported Providers

| Provider   | API Base URL                        | Auth Method      |
|------------|-------------------------------------|------------------|
| PayNow.gg  | `https://api.paynow.gg/v1`          | API key header   |
| Tebex.io   | `https://plugin.tebex.io/`          | Secret key       |

### Configuration per Network

Each network stores provider credentials in `settings_json`:
```json
{
  "payment_providers": {
    "tebex": {
      "enabled": true,
      "secret_key": "encrypted_value",
      "last_sync": "2024-01-15T10:30:00Z"
    },
    "paynow": {
      "enabled": true,
      "api_key": "encrypted_value",
      "last_sync": "2024-01-15T10:30:00Z"
    }
  },
  "payment_sync_interval_minutes": 15
}
```

### Adding New Providers

1. Create adapter in `/services/payment-sync/adapters/`
2. Implement `PaymentProviderAdapter` interface:
   ```typescript
   interface PaymentProviderAdapter {
     name: string;

     // Authenticate and return a client
     authenticate(credentials: ProviderCredentials): Promise<ApiClient>;

     // Fetch transactions, supports pagination and since filter
     fetchTransactions(
       client: ApiClient,
       since?: Date,
       cursor?: string
     ): Promise<TransactionPage>;

     // Normalize to common format
     normalizeTransaction(raw: unknown): NormalizedPayment;
   }

   interface NormalizedPayment {
     merchant_payment_id: string;
     player_name: string;
     player_uuid: string | null;
     amount: number;
     currency: string;
     timestamp: Date;
     products: Product[];
   }

   interface TransactionPage {
     transactions: unknown[];
     next_cursor?: string;
     has_more: boolean;
   }
   ```
3. Register adapter in payment sync worker
4. Add provider config UI in network settings

---

## Rate Limiting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Rate Limits                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Ingestion API (per API key):
- 1000 requests/minute (session events)
- Burst: 50 requests/second

Dashboard API (per user):
- 100 requests/minute
- Burst: 10 requests/second

Payment Sync (per network):
- 1 manual sync per minute
- Scheduled syncs: Based on network config (default 15 min)

Implementation: Redis sliding window counter
```

---

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Cache Layers                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Redis Cache:
├── API key lookups: 5 min TTL (invalidate on revoke)
├── User sessions: Refresh token storage
├── Network settings: 5 min TTL
└── Rate limit counters: 1 min window

ClickHouse Materialized Views:
├── Daily rollups: Pre-aggregated daily stats (global + segmented)
├── Retention cohorts: Pre-calculated retention data (global + segmented)
└── LTV cohorts: Cumulative revenue by days since first join (global + segmented)
```

---

## Error Handling

### Ingestion Service
- Returns minimal error info to prevent data leakage
- Logs detailed errors internally
- Uses dead-letter queue for failed writes

### Dashboard API
- Returns structured error responses
- Includes error codes for client handling
- Audit logs failed authentication attempts

```typescript
// Standard error response
{
  "error": {
    "code": "NETWORK_NOT_FOUND",
    "message": "The requested network does not exist"
  }
}
```

---

## Security Considerations

1. **API Keys**: Hashed with SHA-256, prefix `mct_` visible for identification
2. **Passwords**: Hashed with bcrypt (cost factor 12)
3. **JWT**: Signed with RS256, short expiry (15 min)
4. **Webhook Signatures**: Validated before processing
5. **SQL Injection**: Parameterized queries only
6. **XSS**: React escaping + CSP headers
7. **CORS**: Strict origin allowlist
8. **Rate Limiting**: All endpoints rate-limited

---

## Infrastructure

### Production (RKE)

Production runs on Kubernetes via [RKE](https://www.rancher.com/products/rke) (Rancher Kubernetes Engine).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RKE Cluster                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│    Node 1     │          │    Node 2     │          │    Node 3     │
│               │          │               │          │               │
│ - Next.js     │          │ - Next.js     │          │ - Ingestion   │
│ - Ingestion   │          │ - Payment     │          │ - Payment     │
│               │          │   Worker      │          │   Worker      │
└───────────────┘          └───────────────┘          └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │        Persistent Layer       │
                    │                               │
                    │  PostgreSQL (StatefulSet)     │
                    │  ClickHouse (StatefulSet)     │
                    │  Redis (StatefulSet)          │
                    └───────────────────────────────┘
```

### Kubernetes Resources

| Resource | Type | Replicas | Notes |
|----------|------|----------|-------|
| `nextjs-app` | Deployment | 2-3 | HPA based on CPU |
| `ingestion-service` | Deployment | 2-3 | HPA based on request rate |
| `payment-worker` | Deployment | 1-2 | Handles sync jobs |
| `postgresql` | StatefulSet | 1 | PVC for data persistence |
| `clickhouse` | StatefulSet | 1 | PVC for data persistence |
| `redis` | StatefulSet | 1 | PVC for persistence (optional) |
| `ingress` | Ingress | - | nginx-ingress, TLS termination |

### Namespaces

```
mctrack-prod        # Production environment
mctrack-staging     # Staging environment
```

### Ingress Configuration

```yaml
# api.mctrack.net → ingestion-service
# mctrack.net     → nextjs-app
```

### Secrets Management

- Database credentials: Kubernetes Secrets
- API keys for providers: Kubernetes Secrets (encrypted at rest)
- TLS certificates: cert-manager with Let's Encrypt

---

### Cluster Provisioning (Ansible)

[Ansible](https://www.ansible.com/) automates cluster setup and node management.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Ansible Provisioning                                │
└─────────────────────────────────────────────────────────────────────────────┘

$ ansible-playbook -i inventory/production site.yml
    │
    ├── 1. Bootstrap nodes (install Docker, configure networking)
    ├── 2. Install RKE prerequisites
    ├── 3. Generate RKE cluster config
    ├── 4. Deploy RKE cluster
    ├── 5. Install cluster addons (ingress, cert-manager, monitoring)
    └── 6. Deploy MCTrack application
```

### Inventory Structure

```
ansible/
├── inventory/
│   ├── production/
│   │   ├── hosts.yml           # Node definitions
│   │   └── group_vars/
│   │       ├── all.yml         # Shared variables
│   │       ├── masters.yml     # Control plane config
│   │       └── workers.yml     # Worker node config
│   └── staging/
│       └── ...
├── roles/
│   ├── common/                 # Base OS setup, security hardening
│   ├── docker/                 # Docker installation
│   ├── rke/                    # RKE cluster deployment
│   ├── addons/                 # Ingress, cert-manager, monitoring
│   └── mctrack/                # Application deployment
├── playbooks/
│   ├── site.yml                # Full cluster setup
│   ├── add-node.yml            # Add new worker node
│   ├── remove-node.yml         # Drain and remove node
│   ├── upgrade-cluster.yml     # RKE version upgrade
│   └── deploy-app.yml          # Application deployment only
└── cluster.yml.j2              # RKE config template
```

### Inventory Example

```yaml
# inventory/production/hosts.yml
all:
  children:
    masters:
      hosts:
        master-1:
          ansible_host: 10.0.1.10
          rke_role: [controlplane, etcd]
    workers:
      hosts:
        worker-1:
          ansible_host: 10.0.1.20
          rke_role: [worker]
        worker-2:
          ansible_host: 10.0.1.21
          rke_role: [worker]
        worker-3:
          ansible_host: 10.0.1.22
          rke_role: [worker]
```

### Common Operations

```bash
# Full cluster setup (new deployment)
ansible-playbook -i inventory/production playbooks/site.yml

# Add a new worker node
ansible-playbook -i inventory/production playbooks/add-node.yml \
  -e "node_name=worker-4 node_ip=10.0.1.23"

# Remove a node (drains first)
ansible-playbook -i inventory/production playbooks/remove-node.yml \
  -e "node_name=worker-2"

# Deploy/update application only
ansible-playbook -i inventory/production playbooks/deploy-app.yml

# Upgrade RKE version
ansible-playbook -i inventory/production playbooks/upgrade-cluster.yml \
  -e "rke_version=1.5.0"
```

### RKE Config Template

```yaml
# cluster.yml.j2 (generated by Ansible)
nodes:
{% for host in groups['all'] %}
  - address: {{ hostvars[host]['ansible_host'] }}
    user: deploy
    role: {{ hostvars[host]['rke_role'] }}
{% endfor %}

services:
  etcd:
    backup_config:
      enabled: true
      interval_hours: 6
      retention: 30

ingress:
  provider: nginx
  options:
    use-forwarded-headers: "true"

addons_include:
  - https://raw.githubusercontent.com/cert-manager/cert-manager/release-1.12/deploy/cert-manager.yaml
```

---

### Local Development (Tilt)

Local development uses [Tilt](https://tilt.dev) for fast iterative development with live reload.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Tilt Dev Environment                            │
└─────────────────────────────────────────────────────────────────────────────┘

$ tilt up
    │
    ├── Builds Docker images
    ├── Deploys to local K8s (Docker Desktop / minikube / kind)
    ├── Sets up port-forwards
    ├── Watches for file changes
    └── Live reloads on save

┌─────────────────────────────────────────────────────────────────────────────┐
│  localhost:3000  → Next.js App (live reload)                                │
│  localhost:4000  → Ingestion Service (live reload)                          │
│  localhost:5432  → PostgreSQL                                               │
│  localhost:8123  → ClickHouse (HTTP)                                        │
│  localhost:9000  → ClickHouse (Native)                                      │
│  localhost:6379  → Redis                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tiltfile Structure

```python
# Tiltfile

# Dependencies (databases)
docker_compose('./docker-compose.deps.yml')

# Or use helm charts for deps
# helm_resource('postgresql', './charts/postgresql')
# helm_resource('clickhouse', './charts/clickhouse')
# helm_resource('redis', './charts/redis')

# Application services
docker_build('mctrack/nextjs', './apps/web')
docker_build('mctrack/ingestion', './apps/ingestion')
docker_build('mctrack/payment-worker', './apps/payment-worker')

k8s_yaml('./k8s/dev/')

# Port forwards
k8s_resource('nextjs-app', port_forwards='3000:3000')
k8s_resource('ingestion-service', port_forwards='4000:4000')

# Live reload
local_resource('nextjs-sync',
    serve_cmd='npm run dev',
    deps=['./apps/web/src'])
```

### Dev Workflow

```bash
# Start everything
tilt up

# View dashboard
open http://localhost:10350

# Teardown
tilt down
```

### Environment Files

```
.env.development    # Local dev (Tilt)
.env.staging        # Staging cluster
.env.production     # Production cluster
```
