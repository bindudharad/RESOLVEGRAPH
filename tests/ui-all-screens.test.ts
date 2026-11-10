import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const PORTS = [3005, 3000];
let activeBaseUrl = '';

describe('PHASE 8 — UI & Screen Rendering End-to-End Suite', () => {
  before(async () => {
    for (const port of PORTS) {
      try {
        const probe = await fetch(`http://localhost:${port}/api/health`, {
          signal: AbortSignal.timeout(4000),
        });
        if (probe.ok) {
          activeBaseUrl = `http://localhost:${port}`;
          break;
        }
      } catch {
        // Continue probing
      }
    }
  });

  const screens = [
    { name: '1. Login Screen', path: '/sign-in', expectedPattern: /Sign In|Welcome Back|Email/i },
    { name: '2. Registration Screen', path: '/sign-up', expectedPattern: /Create|Sign Up|Register/i },
    { name: '3. Dashboard Screen', path: '/dashboard', expectedPattern: /Dashboard|Overview|Cases/i },
    { name: '4. Customer Portal (Cases List)', path: '/cases', expectedPattern: /Dispute|Cases|Case/i },
    { name: '5. Case Intake / Creation Screen', path: '/intake', expectedPattern: /Intake|Evidence|Dispute/i },
    { name: '6. Case Detail Screen (Polymorphic RG-1001)', path: '/cases/RG-1001', expectedPattern: /Case|Evidence|Timeline|Resolution/i },
    { name: '7. Investigation Portal', path: '/investigation', expectedPattern: /Investigation|Forensic|Dispute/i },
    { name: '8. Evidence Vault & Preview', path: '/evidence', expectedPattern: /Evidence|Vault|Files/i },
    { name: '9. Transaction Reconciliation & Matching', path: '/reconciliation', expectedPattern: /Reconciliation|Transactions|Matching/i },
    { name: '10. AI Copilot & Approval Queue', path: '/copilot', expectedPattern: /Copilot|Agent|Approval/i },
    { name: '11. Payments & Orders Overview', path: '/payments', expectedPattern: /Payment|Order|Transaction/i },
    { name: '12. PayPal Disputes Management', path: '/paypal/disputes', expectedPattern: /PayPal|Dispute|Claim/i },
    { name: '13. Shared Resolution Room', path: '/resolution-room', expectedPattern: /Resolution|Room|Proposal/i },
    { name: '14. Analytics & Reporting', path: '/analytics', expectedPattern: /Analytics|Metrics|Report/i },
    { name: '15. Purchase Memory Screen', path: '/purchases', expectedPattern: /Purchase|Memory|Orders/i },
    { name: '16. Package Passport & Delivery', path: '/packages', expectedPattern: /Package|Passport|Tracking/i },
    { name: '17. Admin Security Console & Audit Ledger', path: '/admin/security', expectedPattern: /Security|Audit|Ledger|Kill/i },
    { name: '18. System Settings', path: '/settings', expectedPattern: /Settings|Profile|Organization/i },
    { name: '19. PayPal Live Investigation Demo', path: '/demo', expectedPattern: /Demo|PayPal|Investigation/i },
    { name: '20. Methodology & Science', path: '/methodology', expectedPattern: /Methodology|BERR|Graph/i },
    { name: '21. System Documentation', path: '/docs', expectedPattern: /Documentation|API|Guide/i },
    { name: '22. Help & Support Center', path: '/help', expectedPattern: /Help|Support|FAQ/i },
    { name: '23. Platform Landing Page', path: '/', expectedPattern: /RESOLVEGRAPH|Evidence/i },
    { name: '24. Platform Overview Page (3D Evidence Graph)', path: '/overview', expectedPattern: /RESOLVEGRAPH|Evidence|3D INTERACTIVE EVIDENCE GRAPH/i },
  ];

  for (const screen of screens) {
    it(`renders ${screen.name} at ${screen.path} with HTTP 200 OK`, async (t) => {
      if (!activeBaseUrl) {
        t.skip('Skipped: Requires running local Next.js server on port 3005 or 3000');
        return;
      }

      const isPublicAuthScreen = screen.path === '/sign-in' || screen.path === '/sign-up';
      const headers: Record<string, string> = {
        'Accept': 'text/html,application/xhtml+xml',
      };
      if (!isPublicAuthScreen) {
        headers['x-demo-user-email'] = 'alex.chen@example.com';
      }

      const res = await fetch(`${activeBaseUrl}${screen.path}`, { headers });
      assert.strictEqual(res.status, 200, `Expected HTTP 200 for ${screen.path}, got ${res.status}`);
      const text = await res.text();
      assert.ok(text.length > 500, `Expected non-empty HTML payload for ${screen.path}`);
      assert.match(text, /<!DOCTYPE html>|<html/i, `Response must be valid HTML for ${screen.path}`);
      assert.match(text, screen.expectedPattern, `HTML should contain expected content for ${screen.name}`);
    });
  }

  // API Health Check
  it('API Health endpoint responds with HTTP 200 and healthy status', async (t) => {
    if (!activeBaseUrl) {
      t.skip('Skipped: Requires running local Next.js server on port 3005 or 3000');
      return;
    }
    const res = await fetch(`${activeBaseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.status, 'healthy');
  });

  // Demo API Endpoint
  it('PayPal Demo API triggers end-to-end multi-stage pipeline cleanly', async (t) => {
    if (!activeBaseUrl) {
      t.skip('Skipped: Requires running local Next.js server on port 3005 or 3000');
      return;
    }
    const res = await fetch(`${activeBaseUrl}/api/demo/paypal-investigation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': 'alex.chen@example.com',
      },
      body: JSON.stringify({ simulateDispute: true }),
    });
    assert.strictEqual(res.status, 200);
    const result = await res.json();
    assert.strictEqual(result.success, true);
    assert.ok(result.data.timeline.length >= 5);
  });
});
