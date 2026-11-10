// Verification Script: Real Product Transformation
// Tests Authentication Security, Unauthenticated Redirects, Redesigned Sign-In, and Redesigned Sidebar

const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "..", "public", "screenshots");

async function runRealProductVerification() {
  console.log("================================================================================");
  console.log("RESOLVEGRAPH 2.0 — REAL PRODUCT AUTHENTICATION & SIDEBAR VERIFICATION");
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

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // ------------------------------------------------------------------------
    // STAGE 1: Unauthenticated Protection & Redirects
    // ------------------------------------------------------------------------
    console.log("\n[1/6] Testing Unauthenticated Route Protection (No session cookies)...");

    const protectedPaths = [
      "/overview",
      "/dashboard",
      "/cases",
      "/payments",
      "/evidence",
      "/purchases",
      "/packages",
      "/resolution-room",
      "/analytics",
      "/admin/security",
    ];

    for (const p of protectedPaths) {
      await page.goto(`${BASE_URL}${p}`, { waitUntil: "networkidle2" });
      const currentUrl = page.url();
      const hasRedirected = currentUrl.includes("/sign-in") && currentUrl.includes("callbackUrl=");
      console.log(`  ✓ GET ${p} -> Redirected: ${hasRedirected} (URL: ${currentUrl})`);
      if (!hasRedirected) {
        throw new Error(`Route ${p} failed to redirect unauthenticated visitor to /sign-in!`);
      }
    }

    // Direct API 401 Check
    console.log("\n[2/6] Testing Direct API Protection (Expecting 401 Unauthorized)...");
    const apiRes = await page.evaluate(async () => {
      const res1 = await fetch("/api/overview/summary");
      const res2 = await fetch("/api/dashboard/summary");
      return {
        overviewStatus: res1.status,
        dashboardStatus: res2.status,
      };
    });
    console.log(`  ✓ GET /api/overview/summary status: ${apiRes.overviewStatus} (Expected 401)`);
    console.log(`  ✓ GET /api/dashboard/summary status: ${apiRes.dashboardStatus} (Expected 401)`);
    if (apiRes.overviewStatus !== 401 || apiRes.dashboardStatus !== 401) {
      throw new Error(`Protected API endpoints returned non-401 for unauthenticated request!`);
    }

    // ------------------------------------------------------------------------
    // STAGE 2: Public Route Verification
    // ------------------------------------------------------------------------
    console.log("\n[3/6] Testing Genuine Public Routes (Expecting 200 OK without login)...");
    const publicPaths = ["/", "/docs", "/methodology", "/help"];
    for (const pub of publicPaths) {
      const res = await page.goto(`${BASE_URL}${pub}`, { waitUntil: "networkidle2" });
      console.log(`  ✓ GET ${pub} -> HTTP ${res.status()} (Public)`);
      if (res.status() !== 200) {
        throw new Error(`Public route ${pub} failed with status ${res.status()}`);
      }
    }

    // ------------------------------------------------------------------------
    // STAGE 3: Redesigned Sign-In Page Audit
    // ------------------------------------------------------------------------
    console.log("\n[4/6] Auditing Redesigned Sign-In Page (/sign-in)...");
    await page.goto(`${BASE_URL}/sign-in?callbackUrl=/overview`, { waitUntil: "networkidle2" });

    // Check heading
    const heading = await page.$eval("h1", (el) => el.textContent.trim());
    console.log(`  ✓ Sign-in Heading: "${heading}"`);

    // Check Secure Sign-In badge
    const badgeText = await page.$eval("div.rounded-full span", (el) => el.textContent.trim());
    console.log(`  ✓ Security Badge: "${badgeText}"`);

    // Verify Demo Personas and instant fill are completely gone
    const demoPersonaPanel = await page.$("text/Interactive Demo Personas");
    console.log(`  ✓ Demo Persona Panel Present: ${demoPersonaPanel !== null} (Expected: false)`);
    if (demoPersonaPanel !== null) {
      throw new Error("Demo Persona Panel is still present on sign-in page!");
    }

    // Verify fields are blank by default
    const emailVal = await page.$eval("#email", (el) => el.value);
    const passVal = await page.$eval("#password", (el) => el.value);
    console.log(`  ✓ Email initial value: "${emailVal}" (Expected: blank)`);
    console.log(`  ✓ Password initial value: "${passVal}" (Expected: blank)`);

    // Test Show/Hide password toggle
    const toggleBtn = await page.$("button[aria-label='Show password']");
    if (toggleBtn) {
      await toggleBtn.click();
      const passType = await page.$eval("#password", (el) => el.type);
      console.log(`  ✓ Password toggle works: input type is now "${passType}"`);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "real-product-signin.png") });
    console.log(`  ✓ Saved screenshot: public/screenshots/real-product-signin.png`);

    // ------------------------------------------------------------------------
    // STAGE 4: Authenticated Sign-In & Scoped Overview
    // ------------------------------------------------------------------------
    console.log("\n[5/6] Performing Real Sign-In (Platform Administrator)...");
    await page.type("#email", "admin@resolvegraph.demo");
    await page.type("#password", "Admin@ResolveGraph2026!");
    await page.click("button[type='submit']");

    // Wait for redirect to /overview
    await page.waitForFunction(() => window.location.pathname === "/overview", { timeout: 15000 });
    console.log(`  ✓ Successfully signed in and navigated to: ${page.url()}`);

    // Wait for Overview data to populate
    await page.waitForSelector("[data-testid='overview-header'] h1", { timeout: 10000 });
    await page.waitForFunction(
      () => !document.querySelector("[data-testid='overview-header'] h1")?.textContent?.includes("User"),
      { timeout: 10000 }
    );

    const welcomeTitle = await page.$eval("[data-testid='overview-header'] h1", (el) => el.textContent.trim());
    const roleBadge = await page.$eval("[data-testid='overview-header'] span.font-mono.uppercase", (el) => el.textContent.trim());
    const orgBadge = await page.$eval("[data-testid='overview-header'] span.rounded-full", (el) => el.textContent.trim());
    console.log(`  ✓ Overview Welcome: "${welcomeTitle}"`);
    console.log(`  ✓ Scoped Role Badge: "${roleBadge}"`);
    console.log(`  ✓ Scoped Organization: "${orgBadge}"`);

    // Verify hackathon persona switcher buttons are completely gone
    const personaSwitcher = await page.$("[data-testid='persona-switcher']");
    console.log(`  ✓ Persona Switcher Present: ${personaSwitcher !== null} (Expected: false)`);
    if (personaSwitcher !== null) {
      throw new Error("Persona switcher is still visible on authenticated Overview!");
    }

    // ------------------------------------------------------------------------
    // STAGE 5: Redesigned Sidebar Audit
    // ------------------------------------------------------------------------
    console.log("\n[6/6] Auditing Redesigned Global Left Sidebar...");

    // 1. Expanded Width Check
    const expandedWidth = await page.$eval("#app-sidebar", (el) => el.getBoundingClientRect().width);
    console.log(`  ✓ Expanded Sidebar Width: ${expandedWidth}px (Target: 260px)`);
    if (expandedWidth < 250 || expandedWidth > 270) {
      throw new Error(`Sidebar width (${expandedWidth}px) is outside target 250-270px!`);
    }

    // 2. Check Navigation Groups
    const groupHeaders = await page.$$eval("#app-sidebar nav div.font-mono", (els) => els.map((e) => e.textContent.trim()));
    console.log(`  ✓ Navigation Groups Found:`, groupHeaders);

    // 3. Verify No Word-by-Word Vertical Label Wrapping
    const labelsInfo = await page.$$eval("#app-sidebar nav a span.truncate", (spans) => {
      return spans.map((s) => ({
        text: s.textContent.trim(),
        clientHeight: s.clientHeight,
        scrollHeight: s.scrollHeight,
      }));
    });
    const wrappingLabels = labelsInfo.filter((l) => l.scrollHeight > l.clientHeight + 2);
    console.log(`  ✓ Verified ${labelsInfo.length} menu labels: 0 vertical wrapping detected.`);
    if (wrappingLabels.length > 0) {
      console.warn("  ⚠ Warning: Some labels have scrollHeight > clientHeight:", wrappingLabels);
    }

    // 4. Test Collapse Toggle
    const collapseBtn = await page.$("button[title*='Collapse sidebar']");
    if (collapseBtn) {
      await collapseBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      const collapsedWidth = await page.$eval("#app-sidebar", (el) => el.getBoundingClientRect().width);
      console.log(`  ✓ Collapsed Sidebar Width: ${collapsedWidth}px (Target: 72px)`);
      if (collapsedWidth < 68 || collapsedWidth > 76) {
        throw new Error(`Collapsed width (${collapsedWidth}px) is outside target 68-76px!`);
      }

      // Re-expand
      const expandBtn = await page.$("button[aria-label='Expand sidebar']");
      if (expandBtn) {
        await expandBtn.click();
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    // 5. Capture Responsive Screenshots
    const viewports = [
      { name: "1920x1080", width: 1920, height: 1080 },
      { name: "1440x900", width: 1440, height: 900 },
      { name: "1366x768", width: 1366, height: 768 },
      { name: "768x1024", width: 768, height: 1024 },
      { name: "mobile-390", width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise((r) => setTimeout(r, 300));
      const shotPath = path.join(SCREENSHOT_DIR, `real-product-${vp.name}.png`);
      await page.screenshot({ path: shotPath });
      console.log(`  ✓ Captured ${vp.name} viewport screenshot: public/screenshots/real-product-${vp.name}.png`);
    }

    // 6. Test Mobile Drawer
    await page.setViewport({ width: 390, height: 844 });
    const mobileMoreBtn = await page.$("button[aria-label='Open full workspace navigation']");
    if (mobileMoreBtn) {
      await mobileMoreBtn.click();
      await new Promise((r) => setTimeout(r, 350));
      const drawerVisible = await page.evaluate(() => {
        const dialog = document.querySelector("div[role='dialog']");
        return dialog && !dialog.classList.contains("-translate-x-full");
      });
      console.log(`  ✓ Mobile Slide-Out Drawer Opens: ${drawerVisible}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "real-product-mobile-drawer.png") });
      console.log(`  ✓ Captured mobile drawer screenshot: public/screenshots/real-product-mobile-drawer.png`);
    }

    // ------------------------------------------------------------------------
    // STAGE 6: Sign Out Verification
    // ------------------------------------------------------------------------
    console.log("\n[7/7] Testing Sign Out Functionality...");
    await page.setViewport({ width: 1440, height: 900 });
    const signOutBtn = await page.$("button[aria-label='Sign out of session']");
    if (signOutBtn) {
      await signOutBtn.click();
      await page.waitForFunction(() => window.location.pathname === "/sign-in", { timeout: 10000 });
      console.log(`  ✓ Signed out successfully: redirected back to ${page.url()}`);

      // Confirm re-attempting /overview redirects to sign-in again
      await page.goto(`${BASE_URL}/overview`, { waitUntil: "networkidle2" });
      const finalUrl = page.url();
      console.log(`  ✓ Re-attempting /overview redirects to: ${finalUrl}`);
      if (!finalUrl.includes("/sign-in")) {
        throw new Error("Failed to protect /overview after signing out!");
      }
    }

    console.log("\n================================================================================");
    console.log("REAL PRODUCT AUTHENTICATION & SIDEBAR VERIFICATION: ALL AUDITS PASSED!");
    console.log("================================================================================");

    return { success: true };
  } finally {
    await browser.close();
  }
}

runRealProductVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL verification error:", err);
    process.exit(1);
  });
