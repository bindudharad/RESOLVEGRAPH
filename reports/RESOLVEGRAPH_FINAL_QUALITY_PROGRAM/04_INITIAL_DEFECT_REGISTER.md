# REPORT 04 — INITIAL DEFECT REGISTER & REMEDIATION PLAN

## 1. Initial Findings
During repo discovery and testing, 9 specific integration defects were detected and resolved:
1. **Prisma CaseRecord Relation Naming:** Fixed `merchantOrganization` reference to `organization`.
2. **AuthError Status Property:** Updated `error.statusCode` to `error.status`.
3. **Agent Context Actor ID:** Fixed `ctx.userId` to `ctx.actor.id` in SecurityAndApprovalAgent.
4. **Design Token Alignment:** Replaced `variant` with `tone` on `Badge` component across 5 UI pages.
5. **React 19 Lint Invariant:** Resolved `react-hooks/set-state-in-effect` warning by encapsulating async loaders in `useEffect` with mounted cleanup flags.
6. **ESLint Strict Any Typing:** Fully typed `findingType` in root cause service.
7. **Audit Hash Field Names:** Standardized on `previousHash` and `currentHash`.
8. **Test Dynamic Nonces:** Added timestamp nonces to test files to guarantee deterministic test isolation across runs.
9. **Unused Import Cleanup:** Cleaned up unused variables in test files to achieve 0 ESLint warnings.
