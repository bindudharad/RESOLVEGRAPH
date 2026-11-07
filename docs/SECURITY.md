# ResolveGraph Security Architecture & Audit Ledger

## 1. Security Architecture Principles

ResolveGraph is architected for fintech-grade commerce dispute resolution where confidentiality, integrity, and non-repudiation are paramount.

Key tenets:
1. **Deny-by-default access control**: Endpoints reject unauthenticated and unauthorized requests before any business logic executes.
2. **Strict multi-tenant boundaries**: Buyer records and merchant organization records are segregated at the SQLite query level.
3. **Private evidence storage**: Binaries are never served directly via public URLs or static web roots.
4. **Immutable security audit ledger**: Security-critical actions are recorded in an append-only audit trail.

---

## 2. Threat Model & Mitigations

| Threat Vector | Potential Impact | ResolveGraph Defense |
| :--- | :--- | :--- |
| **Cross-Tenant Case Leakage** | A merchant or buyer accesses another party's dispute evidence. | Centralized DAL (`getAccessibleCases`, `getAccessibleEvidence`) binds queries to `buyerId` or `organizationId` list. |
| **Privilege Escalation** | An attacker submits `role: ADMIN` or `isPlatformAdmin: true` during sign-up. | Self-registration ignores client-supplied roles; strictly assigns `BUYER`. Administrator elevation requires CLI master secret. |
| **Arbitrary File Upload & Web Shells** | Malicious script uploaded to execute on the server. | Binary magic bytes verification blocks non-image/non-PDF files. Extension blocklist rejects executable and scripting formats (`.svg`, `.php`, `.sh`). |
| **Path Traversal Attacks** | Overwriting or downloading system files (`../../etc/passwd`). | Strict filename sanitization and runtime verification that destination paths remain inside `process.env.EVIDENCE_STORAGE_DIR`. |
| **Credential & Token Leakage in Logs** | Secrets accidentally printed to application logs or audit tables. | `SecurityAuditService` automatically redacts keys containing `password`, `token`, `secret`, `cookie`, or `authorization`. |
| **MIME Sniffing & XSS in Downloads** | Browser interprets uploaded binary as HTML/JavaScript. | Mandatory `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment` headers on download responses. |

---

## 3. Append-Only Security Audit Ledger

The `SecurityAuditEvent` model records all sensitive operations in SQLite:

```prisma
model SecurityAuditEvent {
  id           String    @id @default(cuid())
  actorId      String?
  action       String    // e.g. CASE_CREATED, EVIDENCE_DOWNLOAD
  targetType   String    // e.g. CaseRecord, Evidence, Organization
  targetId     String?
  status       String    // SUCCESS, DENIED, FAILURE
  ipAddress    String?
  userAgent    String?
  metadataJson String?
  createdAt    DateTime  @default(now())

  actor        User?     @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([actorId])
  @@index([action])
  @@index([createdAt])
}
```

### Registered Audit Actions Catalog:

| Audit Action | Target Type | Triggered When |
| :--- | :--- | :--- |
| `ADMIN_BOOTSTRAP` | `User` | One-time platform administrator account is provisioned via CLI tool. |
| `USER_REGISTERED` | `User` | A new consumer account is registered via public sign-up. |
| `CASE_CREATED` | `CaseRecord` | A dispute case is opened by a buyer or authorized agent. |
| `CASE_UPDATED` | `CaseRecord` | Case status, priority, or remedy is modified. |
| `EVIDENCE_UPLOAD` | `Evidence` | Evidence file is validated and stored in private vault. |
| `EVIDENCE_DOWNLOAD` | `Evidence` | Authorized user retrieves an evidence binary. |
| `EVIDENCE_ACCESS_DENIED` | `Evidence` | Unauthorized user attempts to download evidence. |
| `ORGANIZATION_CREATED` | `Organization` | A new tenant workspace is established. |
| `ORGANIZATION_MEMBER_ADDED` | `OrganizationMember` | Member is joined to an organization. |
| `ORGANIZATION_INVITATION_SENT` | `OrganizationInvitation` | An invite token is generated and emailed to an invitee. |
| `ORGANIZATION_MEMBER_REMOVED` | `OrganizationMember` | A member is removed from an organization. |

---

## 4. Secure Administrator Provisioning

Platform administrators cannot be created through the public web interface. To establish an administrator:
```bash
ADMIN_BOOTSTRAP_SECRET="your-high-entropy-secret" npm run auth:bootstrap -- \
  --email="admin@resolvegraph.demo" \
  --name="Security Administrator" \
  --password="SuperSecurePassword2026!"
```

The script verifies:
1. `ADMIN_BOOTSTRAP_SECRET` matches environment configuration.
2. No existing platform administrator is overwritten without explicit verification.
3. Password adheres to entropy guidelines.
4. An immutable audit record is saved with timestamp and IP origin.
