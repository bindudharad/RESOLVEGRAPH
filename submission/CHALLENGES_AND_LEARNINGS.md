# Engineering Challenges & Technical Learnings

Building **ResolveGraph** across ten continuous development phases presented complex challenges across artificial intelligence, fintech security, and multi-tenant systems.

---

## 1. Challenge 1: Non-Standardized Multimodal Units
- **The Challenge**: Physical products use varying units across international commerce (e.g. `1TB`, `1000GB`, `1024MB`, or `₹6,499` vs `$79.99`). Early zero-shot LLM prompts frequently misclassified `1000GB` and `1TB` as a severe contradiction because the string tokens differed.
- **The Solution**: We engineered the deterministic `FactNormalizer` utility, which converts storage capacities to decimal gigabytes, monetary values to integer minor currency units (cents/paise), and dates to ISO 8601 strings prior to contradiction scoring.

---

## 2. Challenge 2: Avoiding the "Autonomous AI Fund Leakage" Trap
- **The Challenge**: Autonomous agent frameworks (e.g. ReAct loops) often drift or make unauthorized tool calls when handling financial APIs, risking accidental refunds or unrecoverable ledger mutations.
- **The Solution**: We instituted a strict **Human-in-the-Loop Gatekeeper**. High-risk actions require a materialized `AgentApprovalRequest` protected by a SHA-256 argument hash. Financial actions cannot execute without an authorized human manager signature.

---

## 3. Challenge 3: Windows SQLite File Locking in Test Drills
- **The Challenge**: When developing the automated disaster recovery drill (`scripts/db-backup-restore-drill.ts`), Windows OS file locking caused `EBUSY` errors when unlinking temporary database files because Prisma connection pools remained open.
- **The Solution**: We updated the drill runner to explicitly call `await prisma.$disconnect()` and safely close underlying database adapters before executing filesystem cleanup routines.

---

## 4. Challenge 4: Preventing Server-Side Request Forgery (SSRF) in Webhook Certs
- **The Challenge**: PayPal webhook verification relies on fetching public certificates from a URL supplied in the HTTP request headers (`PAYPAL-CERT-URL`). Unrestricted fetching exposes systems to SSRF attacks.
- **The Solution**: We implemented strict hostname and protocol assertions in `PayPalWebhookService`, verifying that all cert URLs belong to trusted `*.paypal.com` domains over HTTPS before initiating outbound fetch calls.
