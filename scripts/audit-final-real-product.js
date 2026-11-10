// Comprehensive Final Real-Product Audit & Screenshot Capture
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "..", "public", "screenshots");
const ARTIFACT_DIR = path.join(
  "C:",
  "Users",
  "Bindudhara D",
  ".gemini",
  "antigravity",
  "brain",
  "758c2de9-73ad-4d98-af3a-ea7168cd42b5"
);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runComprehensiveAudit() {
  console.log("================================================================================");
  console.log("RESOLVEGRAPH 2.0 — FINAL REAL-PRODUCT AUDIT & VERIFICATION SUITE");
  console.log("================================================================================");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader-webgl",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--window-size=1440,900",
    ],
  });

  const auditResults = {
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsFailed: 0,
    checks: [],
  };

  function recordCheck(name, passed, details = "") {
    if (passed) {
      auditResults.testsPassed++;
      console.log(`  [PASS] ${name} ${details}`);
    } else {
      auditResults.testsFailed++;
      console.error(`  [FAIL] ${name} ${details}`);
    }
    auditResults.checks.push({ name, passed, details });
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ------------------------------------------------------------------------
    // CHECK 1: Public Homepage Audit
    // ------------------------------------------------------------------------
    console.log("\n[1/7] Auditing Public Homepage (Unauthenticated)...");
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });

    // Verify page title
    const pageTitle = await page.title();
    recordCheck("Homepage Title Check", pageTitle.includes("RESOLVEGRAPH"), `(${pageTitle})`);

    // Verify absence of "Interactive Demo" text
    const pageContent = await page.content();
    const hasInteractiveDemo = pageContent.includes("Interactive Demo") || pageContent.includes("Try Demo");
    recordCheck("Absence of 'Interactive Demo' / 'Try Demo' in Landing", !hasInteractiveDemo, `(Found: ${hasInteractiveDemo})`);

    // Verify primary CTA is "Get Started"
    const ctaText = await page.$eval("a[href='/overview']", (el) => el.textContent.trim()).catch(() => "");
    recordCheck("Primary CTA is 'Get Started'", ctaText.includes("Get Started"), `(Text: "${ctaText}")`);

    // Save screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "real-product-homepage.png") });
    if (fs.existsSync(ARTIFACT_DIR)) {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "real-product-homepage.png") });
    }
    console.log("  Saved screenshot: real-product-homepage.png");

    // Click "Get Started" and verify redirect to /sign-in?callbackUrl=/overview
    await page.click("a[href='/overview']");
    await page.waitForFunction(() => window.location.pathname === "/sign-in", { timeout: 10000 });
    const afterCtaUrl = page.url();
    recordCheck(
      "Unauthenticated CTA Redirects to /sign-in?callbackUrl=/overview",
      afterCtaUrl.includes("/sign-in") && afterCtaUrl.includes("callbackUrl=%2Foverview"),
      `(Redirected to: ${afterCtaUrl})`
    );

    // ------------------------------------------------------------------------
    // CHECK 2: Protected Routes & Public Routes Perimeter Check
    // ------------------------------------------------------------------------
    console.log("\n[2/7] Checking Security Perimeter & Public Routes...");
    const protectedRoutes = [
      "/overview",
      "/dashboard",
      "/cases",
      "/evidence",
      "/payments",
      "/purchases",
      "/packages",
      "/resolution-room",
      "/analytics",
      "/admin/security",
      "/help", // /help is now strictly protected!
    ];

    for (const route of protectedRoutes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle2" });
      const currentUrl = page.url();
      const redirected = currentUrl.includes("/sign-in") && currentUrl.includes("callbackUrl=");
      recordCheck(`Protected Route '${route}' Redirects to Sign-In`, redirected, `(${currentUrl})`);
    }

    const publicRoutes = ["/", "/docs", "/methodology"];
    for (const pub of publicRoutes) {
      const res = await page.goto(`${BASE_URL}${pub}`, { waitUntil: "networkidle2" });
      recordCheck(`Public Route '${pub}' Returns HTTP 200`, res.status() === 200, `(Status: ${res.status()})`);
    }

    // Direct API 401 Check
    const apiRes = await page.evaluate(async () => {
      const r1 = await fetch("/api/overview/summary");
      const r2 = await fetch("/api/dashboard/summary");
      return { r1: r1.status, r2: r2.status };
    });
    recordCheck("API /api/overview/summary returns 401", apiRes.r1 === 401, `(Status: ${apiRes.r1})`);
    recordCheck("API /api/dashboard/summary returns 401", apiRes.r2 === 401, `(Status: ${apiRes.r2})`);

    // ------------------------------------------------------------------------
    // CHECK 3: Clean Sign-In Page Audit
    // ------------------------------------------------------------------------
    console.log("\n[3/7] Auditing Redesigned Sign-In Page (/sign-in)...");
    await page.goto(`${BASE_URL}/sign-in?callbackUrl=/overview`, { waitUntil: "networkidle2" });

    const emailValue = await page.$eval("#email", (el) => el.value);
    const passwordValue = await page.$eval("#password", (el) => el.value);
    recordCheck("Sign-In Email Default is Blank", emailValue === "", `(Value: "${emailValue}")`);
    recordCheck("Sign-In Password Default is Blank", passwordValue === "", `(Value: "${passwordValue}")`);

    const hasDemoPersonas = await page.evaluate(() => {
      return document.body.textContent.includes("Interactive Demo Personas") ||
             document.body.textContent.includes("Alex Morgan (Buyer)");
    });
    recordCheck("Sign-In Demo Persona Switcher Purged", !hasDemoPersonas, `(Found: ${hasDemoPersonas})`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "real-product-signin.png") });
    if (fs.existsSync(ARTIFACT_DIR)) {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "real-product-signin.png") });
    }
    console.log("  Saved screenshot: real-product-signin.png");

    // ------------------------------------------------------------------------
    // CHECK 4: Platform Admin Workspace & Sidebar Geometry
    // ------------------------------------------------------------------------
    console.log("\n[4/7] Authenticating Platform Admin (Priya Raghavan)...");
    await page.type("#email", "admin@resolvegraph.demo");
    await page.type("#password", "Admin@ResolveGraph2026!");
    await page.click("button[type='submit']");
    await page.waitForFunction(() => window.location.pathname === "/overview", { timeout: 15000 });

    await page.waitForSelector("[data-testid='overview-header']", { timeout: 15000 });
    await sleep(800);

    const overviewUser = await page.$eval("[data-testid='overview-header'] h1", (el) => el.textContent.trim());
    recordCheck("Overview displays Priya Raghavan", overviewUser.includes("Priya Raghavan"), `(Header: "${overviewUser}")`);

    // Geometry Check: Brand Header Height & Topbar Height
    const sidebarBrandHeight = await page.$eval("#app-sidebar > div:first-child", (el) => el.getBoundingClientRect().height);
    const topbarHeight = await page.$eval("header.sticky", (el) => el.getBoundingClientRect().height);
    recordCheck(
      "Sidebar Brand Header Height matches Topbar (56px h-14)",
      Math.abs(sidebarBrandHeight - 56) < 2 && Math.abs(topbarHeight - 56) < 2,
      `(Sidebar Header: ${sidebarBrandHeight}px, Topbar: ${topbarHeight}px)`
    );

    // Sidebar Width: Expanded (260px)
    const expandedWidth = await page.$eval("#app-sidebar", (el) => el.getBoundingClientRect().width);
    recordCheck("Sidebar Expanded Width is 260px", Math.abs(expandedWidth - 260) < 3, `(${expandedWidth}px)`);

    // Hardcoded case link check in sidebar
    const hasHardcodedCase = await page.$eval("#app-sidebar", (el) => el.innerHTML.includes("RG-2026-0412"));
    recordCheck("Hardcoded /cases/RG-2026-0412 removed from sidebar", !hasHardcodedCase, `(Found: ${hasHardcodedCase})`);

    // DemoBadge neutralization check on Overview
    const hasDemoDataPill = await page.evaluate(() => document.body.textContent.includes("Demo data"));
    recordCheck("Absence of 'Demo data' pill on Overview", !hasDemoDataPill, `(Found: ${hasDemoDataPill})`);

    // Save screenshots
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "platform-overview.png") });
    if (fs.existsSync(ARTIFACT_DIR)) {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "platform-overview.png") });
    }
    console.log("  Saved screenshot: platform-overview.png");

    // Test Collapse to 72px Rail
    const collapseBtn = await page.$("button[title*='Collapse sidebar']");
    if (collapseBtn) {
      await collapseBtn.click();
      await sleep(400);
      const collapsedWidth = await page.$eval("#app-sidebar", (el) => el.getBoundingClientRect().width);
      recordCheck("Sidebar Collapsed Width is 72px rail", Math.abs(collapsedWidth - 72) < 3, `(${collapsedWidth}px)`);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "platform-sidebar-collapsed.png") });
      if (fs.existsSync(ARTIFACT_DIR)) {
        await page.screenshot({ path: path.join(ARTIFACT_DIR, "platform-sidebar-collapsed.png") });
      }
      console.log("  Saved screenshot: platform-sidebar-collapsed.png");

      // Expand back
      const expandBtn = await page.$("button[aria-label='Expand sidebar']");
      if (expandBtn) {
        await expandBtn.click();
        await sleep(400);
      }
    }

    // ------------------------------------------------------------------------
    // CHECK 5: Clean Workspace Pages (Cases, Evidence, Investigation, Help, Dashboard)
    // ------------------------------------------------------------------------
    console.log("\n[5/7] Auditing Workspace Pages for Clean Nomenclature...");

    // 5a. /cases: Export CSV check
    await page.goto(`${BASE_URL}/cases`, { waitUntil: "networkidle2" });
    const casesContent = await page.content();
    const hasExportDemo = casesContent.includes("Export (Demo)");
    const hasExportCsv = casesContent.includes("Export CSV");
    recordCheck("Cases Page has 'Export CSV' (not 'Export (Demo)')", !hasExportDemo && hasExportCsv);
    recordCheck("Cases Page has no 'Demo data' pill", !casesContent.includes("Demo data"));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "platform-cases.png") });
    if (fs.existsSync(ARTIFACT_DIR)) {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "platform-cases.png") });
    }

    // 5b. /evidence: Fictional demonstration items check
    await page.goto(`${BASE_URL}/evidence`, { waitUntil: "networkidle2" });
    const evidenceContent = await page.content();
    const hasFictionalDemonstration = evidenceContent.includes("Fictional demonstration items");
    recordCheck("Evidence Vault has no 'Fictional demonstration items'", !hasFictionalDemonstration);
    recordCheck("Evidence Vault has no 'Demo data' pill", !evidenceContent.includes("Demo data"));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "platform-evidence.png") });
    if (fs.existsSync(ARTIFACT_DIR)) {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "platform-evidence.png") });
    }

    // 5c. /investigation: Inspect Case RG-1001 check
    await page.goto(`${BASE_URL}/investigation`, { waitUntil: "networkidle2" });
    const investigationContent = await page.content();
    const hasOpenGuidedDemo = investigationContent.includes("Open Guided Demo");
    recordCheck("Investigation Page has no 'Open Guided Demo'", !hasOpenGuidedDemo);
    recordCheck("Investigation Page has no 'Demo data' pill", !investigationContent.includes("Demo data"));

    // 5d. /help: Authenticated & cryptographic security explanation
    await page.goto(`${BASE_URL}/help`, { waitUntil: "networkidle2" });
    const helpContent = await page.content();
    const hasFictionalDisclaimer = helpContent.includes("purely fictional demonstration records");
    const hasCryptoExplanation = helpContent.includes("PayPal Sandbox test accounts") && helpContent.includes("SHA-256");
    recordCheck("Help Page replaced fictional disclaimer with cryptographic security explanation", !hasFictionalDisclaimer && hasCryptoExplanation);

    // 5e. /dashboard redirects to /overview
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    const dashboardRedirectUrl = page.url();
    recordCheck("Navigating to /dashboard cleanly redirects to /overview", dashboardRedirectUrl.endsWith("/overview"), `(${dashboardRedirectUrl})`);

    // ------------------------------------------------------------------------
    // CHECK 6: Role-Based Workspaces (Buyer & Merchant)
    // ------------------------------------------------------------------------
    console.log("\n[6/7] Auditing Buyer & Merchant Scoped Workspaces...");

    // Sign in as Buyer (Alex Morgan) in a fresh isolated context
    const buyerContext = await browser.createBrowserContext();
    const buyerPage = await buyerContext.newPage();
    await buyerPage.setViewport({ width: 1440, height: 900 });

    await buyerPage.goto(`${BASE_URL}/sign-in?callbackUrl=/overview`, { waitUntil: "networkidle2" });
    await buyerPage.type("#email", "alex.morgan@consumer.demo");
    await buyerPage.type("#password", "Buyer@ResolveGraph2026!");
    await buyerPage.click("button[type='submit']");
    await buyerPage.waitForFunction(() => window.location.pathname === "/overview", { timeout: 15000 });

    await buyerPage.waitForSelector("[data-testid='overview-header']", { timeout: 15000 });
    await sleep(800);
    const buyerHeader = await buyerPage.$eval("[data-testid='overview-header'] h1", (el) => el.textContent.trim());
    recordCheck("Buyer Workspace greets Alex Morgan", buyerHeader.includes("Alex Morgan"), `("${buyerHeader}")`);
    await buyerPage.screenshot({ path: path.join(SCREENSHOT_DIR, "buyer-overview.png") });
    if (fs.existsSync(ARTIFACT_DIR)) {
      await buyerPage.screenshot({ path: path.join(ARTIFACT_DIR, "buyer-overview.png") });
    }
    await buyerContext.close();

    // Sign in as Merchant (TechStore Global) in a fresh isolated context
    const merchantContext = await browser.createBrowserContext();
    const merchantPage = await merchantContext.newPage();
    await merchantPage.setViewport({ width: 1440, height: 900 });

    await merchantPage.goto(`${BASE_URL}/sign-in?callbackUrl=/overview`, { waitUntil: "networkidle2" });
    await merchantPage.type("#email", "disputes@techstore.demo");
    await merchantPage.type("#password", "Merchant@TechStore2026!");
    await merchantPage.click("button[type='submit']");
    await merchantPage.waitForFunction(() => window.location.pathname === "/overview", { timeout: 15000 });

    await merchantPage.waitForSelector("[data-testid='overview-header']", { timeout: 15000 });
    await sleep(800);
    const merchantHeader = await merchantPage.$eval("[data-testid='overview-header'] h1", (el) => el.textContent.trim());
    recordCheck("Merchant Workspace greets TechStore Global", merchantHeader.includes("TechStore"), `("${merchantHeader}")`);
    await merchantPage.screenshot({ path: path.join(SCREENSHOT_DIR, "merchant-overview.png") });
    if (fs.existsSync(ARTIFACT_DIR)) {
      await merchantPage.screenshot({ path: path.join(ARTIFACT_DIR, "merchant-overview.png") });
    }
    await merchantContext.close();

    // ------------------------------------------------------------------------
    // CHECK 7: Mobile Viewport & Drawer Audit
    // ------------------------------------------------------------------------
    console.log("\n[7/7] Auditing Mobile Drawer & Responsiveness...");
    await page.setViewport({ width: 390, height: 844 });
    await sleep(400);

    const mobileDrawerBtn = await page.$("button[aria-label='Open full workspace navigation'], button[aria-label='Open navigation menu']");
    if (mobileDrawerBtn) {
      await mobileDrawerBtn.click();
      await sleep(400);
      const drawerIsOpen = await page.evaluate(() => {
        const dialog = document.querySelector("div[role='dialog']");
        return dialog && !dialog.classList.contains("-translate-x-full");
      });
      recordCheck("Mobile Drawer Opens Smoothly", Boolean(drawerIsOpen));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-drawer-clean.png") });
      if (fs.existsSync(ARTIFACT_DIR)) {
        await page.screenshot({ path: path.join(ARTIFACT_DIR, "mobile-drawer-clean.png") });
      }
    }

    console.log("\n================================================================================");
    console.log(`FINAL AUDIT COMPLETED: ${auditResults.testsPassed} PASSED, ${auditResults.testsFailed} FAILED`);
    console.log("================================================================================");

    fs.writeFileSync(
      path.join(__dirname, "..", "public", "final-audit-results.json"),
      JSON.stringify(auditResults, null, 2)
    );

    return auditResults;
  } finally {
    await browser.close();
  }
}

runComprehensiveAudit()
  .then((res) => {
    if (res.testsFailed > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("FATAL Audit Error:", err);
    process.exit(1);
  });
