# ResolveGraph Authentication Architecture

## 1. Overview & Framework

ResolveGraph Step 3 implements enterprise-grade authentication built upon **Better Auth** (`1.7.15`) integrated directly with **Prisma ORM 7** and SQLite via the `@prisma/adapter-better-sqlite3` driver adapter.

The authentication layer provides:
- Secure email and password authentication with scrypt credential hashing.
- Append-only session management with cryptographically random 32-byte session tokens.
- Controlled administrator bootstrap CLI requiring an out-of-band master secret.
- Public self-registration strictly defaulting to standard `BUYER` role without public privilege escalation.
- Multi-persona fast-fill credential switcher for local evaluation and security audits.

---

## 2. Better Auth & Prisma Schema Integration

Better Auth manages sessions, accounts, and verifications using Prisma models defined directly in [prisma/schema.prisma](file:///c:/Projects/resolvegraph/prisma/schema.prisma):

```prisma
model User {
  id                  String               @id @default(cuid())
  email               String               @unique
  name                String?
  fullName            String
  role                UserRole             @default(BUYER)
  isPlatformAdmin     Boolean              @default(false)
  emailVerified       Boolean              @default(false)
  image               String?
  avatarUrl           String?
  organization        String?
  phone               String?
  isActive            Boolean              @default(true)
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt

  sessions            Session[]
  accounts            Account[]
  orgMemberships      OrganizationMember[]
  orgInvitationsSent  OrganizationInvitation[]
  securityAuditEvents SecurityAuditEvent[]
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?   // scrypt-hashed credentials
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

model Verification {
  id         String    @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime? @default(now())
  updatedAt  DateTime? @updatedAt
}
```

---

## 3. Configuration & Handlers

The server-side Better Auth instance is configured in [src/lib/auth.ts](file:///c:/Projects/resolvegraph/src/lib/auth.ts):
- **Base URL**: Configured via `BETTER_AUTH_URL` or `NEXT_PUBLIC_APP_URL`.
- **Secret**: `BETTER_AUTH_SECRET` (256-bit entropy).
- **Adapter**: `prismaAdapter(prisma, { provider: 'sqlite' })`.
- **Database Hooks**: On user registration, the system automatically copies the display name to `fullName`, normalizes the email, and logs a `USER_REGISTERED` audit event.

Client components interface with authentication via [src/lib/auth-client.ts](file:///c:/Projects/resolvegraph/src/lib/auth-client.ts):
```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

---

## 4. Protected Session Resolution (`getSessionContext`)

In [src/server/auth/session.ts](file:///c:/Projects/resolvegraph/src/server/auth/session.ts), incoming HTTP requests are resolved to an `AuthenticatedUser` object:
1. Better Auth session token is extracted from incoming cookies (`better-auth.session_token`).
2. The user record is retrieved from SQLite, including their active organization memberships from `OrganizationMember`.
3. In non-production development environments, an optional `x-demo-user-email` header enables automated test runners to impersonate specific personas without mocking cookies.

---

## 5. Administrator Bootstrap Tool

To prevent arbitrary administrator elevation in production, ResolveGraph includes a secure bootstrap CLI script:
[scripts/bootstrap-admin.ts](file:///c:/Projects/resolvegraph/scripts/bootstrap-admin.ts).

### Usage:
```bash
ADMIN_BOOTSTRAP_SECRET="your-high-entropy-secret" npm run auth:bootstrap -- \
  --email="admin@resolvegraph.demo" \
  --name="System Administrator" \
  --password="SecureAdminPassword2026!"
```

The script:
- Verifies that `ADMIN_BOOTSTRAP_SECRET` matches the server configuration.
- Checks if an active platform admin already exists.
- Hashes the password using Better Auth scrypt cryptography.
- Assigns `isPlatformAdmin: true` and `role: ADMIN`.
- Appends an immutable security audit event `ADMIN_BOOTSTRAP` to the database.

---

## 6. Seeded Demo Personas

For development, testing, and evaluation, the following credentials are pre-seeded in `dev.db`:

| Persona | Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Priya Raghavan** | Platform Admin | `admin@resolvegraph.demo` | `Admin@ResolveGraph2026!` | All Organizations & Cases |
| **Alex Morgan** | Buyer (Consumer) | `alex.morgan@consumer.demo` | `Buyer@ResolveGraph2026!` | Alex Morgan's Cases |
| **Sarah Johnson** | Buyer (Consumer) | `sarah.johnson@consumer.demo` | `Buyer@ResolveGraph2026!` | Sarah Johnson's Cases |
| **TechStore Global** | Merchant Owner | `disputes@techstore.demo` | `Merchant@TechStore2026!` | TechStore Workspace (`org_techstore`) |
| **DigitalMart Express** | Merchant Owner | `support@digitalmart.demo` | `Merchant@DigitalMart2026!` | DigitalMart Workspace (`org_digitalmart`) |
| **Nova Electronics** | Merchant Owner | `resolution@novaelectronics.demo` | `Merchant@Nova2026!` | Nova Electronics Workspace (`org_nova`) |
