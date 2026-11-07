# ResolveGraph Multi-Tenant Authorization & RBAC

## 1. Architectural Philosophy

ResolveGraph enforces an **evidence-first, deny-by-default multi-tenant access control architecture**. Every data query touching cases, claims, evidence, or organizational resources is partitioned directly at the database and Data Access Layer (DAL), rather than relying on frontend view filtering.

---

## 2. Role Taxonomy & Scopes

ResolveGraph operates with two complementary role dimensions:

### Global Roles (`UserRole`)
- **`BUYER`**: Individual consumer filing purchase disputes. Access is strictly scoped to cases where `buyerId == user.id`.
- **`MERCHANT`**: Business entity managing disputes. Access is determined by organization membership.
- **`RESOLUTION_MANAGER`**: Neutral mediator coordinating dispute reconciliation.
- **`ADMIN`**: Platform operator. Can manage users, global settings, and platform health.

### Organization Roles (`OrganizationRole`)
Users belong to organizations with scoped tenant privileges:
- **`OWNER`**: Full administrative ownership of the organization workspace, member roster, billing, and cases.
- **`ORG_ADMIN`**: Can invite colleagues, update member roles, and manage cases for that tenant.
- **`MERCHANT_AGENT`**: Operational role. Can inspect assigned tenant cases, submit claims, and upload merchant evidence.
- **`RESOLUTION_MANAGER`**: Tenant-assigned mediator. Can view internal investigation notes and recommend remedies.
- **`VIEWER`**: Read-only observation of tenant cases.

### Platform Administrator Flag (`isPlatformAdmin`)
A boolean property on `User`. When `true`, bypasses tenant boundaries to support emergency interventions and platform-wide compliance audits.

---

## 3. Data Access Layer (DAL) Query Enforcement

All operational queries pass through isolated DAL helper functions located in `src/server/dal/`:

### A. Case Scoping (`getAccessibleCases`)
```typescript
// If Platform Admin:
accessFilter = []; // View all cases across all organizations

// If Standard User:
accessFilter = [
  {
    OR: [
      { buyerId: user.id },
      { organizationId: { in: user.orgMemberships.map(m => m.organizationId) } }
    ]
  }
];
```
This query-level constraint ensures that even if an attacker guesses or supplies a valid `caseNumber` from a different tenant, SQLite will return an empty set.

### B. Single Case Access Verification (`canAccessCase`)
Defined in [src/server/auth/permissions.ts](file:///c:/Projects/resolvegraph/src/server/auth/permissions.ts):
```typescript
export function canAccessCase(user: AuthenticatedUser, c: MinimalCase): boolean {
  if (user.isPlatformAdmin) return true;
  if (c.buyerId === user.id) return true;
  if (c.organizationId && user.orgMemberships.some(m => m.organizationId === c.organizationId)) {
    return true;
  }
  if (c.merchantId === user.id) return true;
  return false;
}
```

---

## 4. Evidence Visibility Matrix

Evidence documents carry fine-grained confidentiality tiers defined by `EvidenceVisibility`:

| Visibility Tier | Buyer | Merchant Agent | Resolution Manager | Platform Admin |
| :--- | :---: | :---: | :---: | :---: |
| **`SHARED_WITH_PARTICIPANTS`** | ✅ View / Download | ✅ View / Download | ✅ View / Download | ✅ View / Download |
| **`BUYER_ONLY`** | ✅ View / Download | ❌ Hidden | ❌ Hidden | ✅ View / Download |
| **`MERCHANT_ONLY`** | ❌ Hidden | ✅ View / Download | ✅ View / Download | ✅ View / Download |
| **`INTERNAL`** | ❌ Hidden | ❌ Hidden | ✅ View / Download | ✅ View / Download |

### Rules:
1. `BUYER_ONLY` protects consumer privacy (e.g. personal identification, unredacted banking statements).
2. `MERCHANT_ONLY` protects merchant proprietary data (e.g. supplier costs, wholesale contracts).
3. `INTERNAL` preserves mediator investigation memos and supervisor fulfillments logs.

---

## 5. Privilege Escalation Prevention

ResolveGraph incorporates defense-in-depth against role escalation:
- **Public Registration**: Accepts only `name`, `email`, and `password`. The role is hardcoded to `BUYER` and `isPlatformAdmin` defaults to `false`. Any client-injected `role` or `isAdmin` fields are ignored.
- **Organization Invitation**: Regular organization administrators can invite members up to `ORG_ADMIN`, but cannot grant `OWNER` status or create platform admins.
- **Session Re-verification**: State-changing endpoints do not trust client cookies blindly; they reload the user's active memberships from SQLite via `getSessionContext(request)` on each invocation.
