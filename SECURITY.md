# Security Policy & Vulnerability Disclosure

**ResolveGraph** takes platform security, data privacy, and financial safety seriously. Because this platform interacts with payment systems, confidential commercial records, and AI investigation pipelines, we adhere to strict security best practices.

---

## Supported Versions

| Version | Supported | Security Patch Status |
|---|---|---|
| `v1.0.x` (Pilot / Hackathon Release) | Yes | Active security support |
| `< 1.0.0` | No | Deprecated development versions |

---

## Reporting a Vulnerability

If you discover a security vulnerability, **do NOT open a public GitHub issue**.

Please report vulnerabilities privately via email:
- **Security Contact**: `security@resolvegraph.com`
- **Data Protection Officer**: `dpo@resolvegraph.com`

### Required Report Details
1. Description of the vulnerability and attack vector.
2. Steps to reproduce or proof-of-concept payload.
3. Potential impact on user confidentiality, data integrity, or financial rails.
4. Any proposed remediations.

We will acknowledge receipt within 24 hours and provide an estimated remediation timeline.

---

## Key Platform Security Controls

1. **Hard Financial Circuit Breakers**: `PAYPAL_LIVE_ENABLED=false` is enforced across all environments except authorized production deployments with partner underwriting.
2. **SSRF Webhook Protection**: PayPal webhook verification asserts that cert URLs resolve to trusted `*.paypal.com` hostnames over HTTPS before fetching certificates.
3. **Evidence Magic-Byte Sniffing**: Binary upload headers are inspected via byte signatures; disguised executables (`.exe`, `.sh`, `.svg`) are rejected upfront regardless of file extension.
4. **Automated PII Redaction**: Credit card PANs passing the Luhn check algorithm, CVV codes, and bearer tokens are automatically stripped from outgoing AI payloads and application logs.
5. **Cryptographic Action Hashing**: Sensitive agent actions require SHA-256 argument verification before human authorization.
