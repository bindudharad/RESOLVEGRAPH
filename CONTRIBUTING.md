# Contributing to RESOLVEGRAPH

Thank you for your interest in contributing to **ResolveGraph — Evidence-First Commerce Resolution Infrastructure**!

We welcome contributions from developers, researchers, fintech specialists, and UI/UX designers.

---

## Code of Conduct

All contributors are expected to uphold a respectful, inclusive, and professional environment. Harassment, discrimination, or abusive conduct will not be tolerated.

---

## Development Workflow

### 1. Prerequisites
- **Node.js**: `v20.x` or higher (`v24.x` recommended)
- **Package Manager**: `npm v10.x` or higher
- **Operating Systems**: macOS, Linux, Windows 10/11

### 2. Fork and Clone
```bash
git clone https://github.com/your-username/resolvegraph.git
cd resolvegraph
```

### 3. Environment & Database Setup
```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:seed
```

### 4. Running the Dev Server
```bash
npm run dev
```
Visit `http://localhost:3000` or `http://localhost:3000/demo`.

---

## Coding Standards & Verification Gates

Before submitting a Pull Request, all of the following checks must pass with zero errors:

```bash
# 1. Static Type Checking (Strict Zero Errors)
npx tsc --noEmit

# 2. Code Quality & Linting
npm run lint

# 3. Automated Unit & Integration Tests (100% Passing)
npm test

# 4. Next.js Production Build
npm run build
```

### PR Guidelines
1. **Branch Naming**: Use descriptive prefixes: `feat/`, `fix/`, `docs/`, `refactor/`.
2. **Commit Messages**: Follow Conventional Commits: `feat(berr): add unit normalization for metric volumes`.
3. **Additive Schema Migrations**: Do not submit breaking database migrations. Use additive migrations with safe defaults.
4. **Never Commit Secrets**: Never push real API keys, tokens, or personal identifiers.
