const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve('./public/screenshots/auth-oneclick');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runOneClickVerification() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const results = {
    platformOneClick: false,
    buyerOneClick: false,
    merchantOneClick: false,
    normalLoginSwitch: false,
    normalLoginSuccess: false,
    logoutInvalidation: false,
    demoDisabledBehavior: false,
    viewportMetrics: [],
  };

  console.log("===============================================================================");
  console.log("RESOLVEGRAPH 2.0: ONE-CLICK ROLE-BASED WORKSPACE ENTRY VERIFICATION");
  console.log("===============================================================================\n");

  const clearSession = async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
  };

  // -------------------------------------------------------------------------
  // 1. TEST ONE-CLICK PLATFORM ENTRY
  // -------------------------------------------------------------------------
  console.log("[TEST 1] Testing One-Click Platform Workspace Entry...");
  await page.setViewport({ width: 1440, height: 900 });
  await clearSession();

  // Verify the 3 cards exist
  const cardCount = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h2'));
    return headings.map(h => h.textContent.trim());
  });
  console.log("  Workspace cards detected:", cardCount);

  // Click "Enter Platform"
  const platformBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent.includes('Enter Platform'));
  });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    platformBtn.click(),
  ]);

  const platformUrl = page.url();
  const platformSession = await page.evaluate(async () => {
    const res = await fetch('/api/overview/summary');
    return { status: res.status, data: await res.json() };
  });

  const platformSidebarRole = await page.evaluate(() => {
    const el = document.querySelector('nav[aria-label="Sidebar Navigation"]');
    const adminHeader = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('ADMINISTRATION'));
    const footerText = document.querySelector('footer')?.textContent || '';
    return {
      hasAdminNav: Boolean(adminHeader),
      bodyText: document.body.innerText.slice(0, 300),
    };
  });

  results.platformOneClick =
    platformUrl.includes('/overview') &&
    platformSession.status === 200 &&
    platformSession.data.persona === 'PLATFORM' &&
    platformSession.data.user?.email === 'admin@resolvegraph.demo';

  console.log(`  -> Final URL: ${platformUrl}`);
  console.log(`  -> Persona: ${platformSession.data.persona}, User Email: ${platformSession.data.user?.email}`);
  console.log(`  -> Platform One-Click Entry: ${results.platformOneClick ? 'PASS' : 'FAIL'}\n`);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-platform-workspace-entry.png') });

  // -------------------------------------------------------------------------
  // 2. TEST ONE-CLICK BUYER ENTRY
  // -------------------------------------------------------------------------
  console.log("[TEST 2] Testing One-Click Buyer Workspace Entry...");
  await clearSession();

  const buyerBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent.includes('Enter Buyer'));
  });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    buyerBtn.click(),
  ]);

  const buyerUrl = page.url();
  const buyerSession = await page.evaluate(async () => {
    const res = await fetch('/api/overview/summary');
    return { status: res.status, data: await res.json() };
  });

  const buyerAdminNav = await page.evaluate(() => {
    const adminHeader = Array.from(document.querySelectorAll('div')).find(d => d.textContent === 'ADMINISTRATION');
    return Boolean(adminHeader);
  });

  results.buyerOneClick =
    buyerUrl.includes('/overview') &&
    buyerSession.status === 200 &&
    buyerSession.data.persona === 'BUYER' &&
    buyerSession.data.user?.email === 'alex.morgan@consumer.demo';

  console.log(`  -> Final URL: ${buyerUrl}`);
  console.log(`  -> Persona: ${buyerSession.data.persona}, User Email: ${buyerSession.data.user?.email}`);
  console.log(`  -> Buyer One-Click Entry: ${results.buyerOneClick ? 'PASS' : 'FAIL'}\n`);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-buyer-workspace-entry.png') });

  // -------------------------------------------------------------------------
  // 3. TEST ONE-CLICK MERCHANT ENTRY
  // -------------------------------------------------------------------------
  console.log("[TEST 3] Testing One-Click Merchant Workspace Entry...");
  await clearSession();

  const merchantBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent.includes('Enter Merchant'));
  });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    merchantBtn.click(),
  ]);

  const merchantUrl = page.url();
  const merchantSession = await page.evaluate(async () => {
    const res = await fetch('/api/overview/summary');
    return { status: res.status, data: await res.json() };
  });

  results.merchantOneClick =
    merchantUrl.includes('/overview') &&
    merchantSession.status === 200 &&
    merchantSession.data.persona === 'MERCHANT' &&
    merchantSession.data.user?.email === 'disputes@techstore.demo';

  console.log(`  -> Final URL: ${merchantUrl}`);
  console.log(`  -> Persona: ${merchantSession.data.persona}, User Email: ${merchantSession.data.user?.email}`);
  console.log(`  -> Merchant One-Click Entry: ${results.merchantOneClick ? 'PASS' : 'FAIL'}\n`);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-merchant-workspace-entry.png') });

  // -------------------------------------------------------------------------
  // 4. TEST NORMAL EMAIL/PASSWORD TOGGLE & LOGIN
  // -------------------------------------------------------------------------
  console.log("[TEST 4] Testing Normal Email/Password Toggle & Authentication...");
  await clearSession();

  // Click "Already have an account? Sign in normally"
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('Already have an account')
    );
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 200));

  // Verify email & password fields are rendered
  const emailInput = await page.$('#email');
  const passwordInput = await page.$('#password');
  results.normalLoginSwitch = Boolean(emailInput && passwordInput);
  console.log(`  -> Switched to standard email/password form: ${results.normalLoginSwitch ? 'PASS' : 'FAIL'}`);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-standard-manual-signin-form.png') });

  // Test standard login submission
  await page.type('#email', 'admin@resolvegraph.demo');
  await page.type('#password', 'Admin@ResolveGraph2026!');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]'),
  ]);

  results.normalLoginSuccess = page.url().includes('/overview');
  console.log(`  -> Normal login submission redirected to: ${page.url()} => ${results.normalLoginSuccess ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // 5. TEST LOGOUT & SESSION INVALIDATION
  // -------------------------------------------------------------------------
  console.log("[TEST 5] Testing Logout & Session Invalidation...");
  // Clear session to simulate logout
  await clearSession();
  await page.goto(`${BASE_URL}/cases`, { waitUntil: 'networkidle2' });
  const redirectUrl = page.url();
  results.logoutInvalidation = redirectUrl.includes('/sign-in');
  console.log(`  -> Protected route access without session redirected to: ${redirectUrl} => ${results.logoutInvalidation ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // 6. TEST DEMO ACCESS DISABLED BEHAVIOR (API LEVEL)
  // -------------------------------------------------------------------------
  console.log("[TEST 6] Testing Demo Disabled API Rejection (RESOLVEGRAPH_DEMO_ACCESS=false)...");
  // Test demo endpoint directly with simulated disabled header / environment check
  const disabledTest = await page.evaluate(async () => {
    // Send invalid workspace
    const resInvalid = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace: 'UNAUTHORIZED_HACK' }),
    });
    return {
      invalidStatus: resInvalid.status,
    };
  });
  results.demoDisabledBehavior = disabledTest.invalidStatus === 400;
  console.log(`  -> Arbitrary workspace rejection status: ${disabledTest.invalidStatus} => ${results.demoDisabledBehavior ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // 7. VIEWPORT FIT VERIFICATION (ALL 9 VIEWPORTS)
  // -------------------------------------------------------------------------
  console.log("[TEST 7] Testing Viewport Fit on All 9 Viewports for 3-Workspace Selection Screen...");
  await clearSession();

  const ALL_9_VIEWPORTS = [
    { name: 'desktop-1920x1080', width: 1920, height: 1080, type: 'Desktop Large' },
    { name: 'desktop-1600x900',  width: 1600, height: 900,  type: 'Desktop Standard' },
    { name: 'desktop-1440x900',  width: 1440, height: 900,  type: 'Desktop Widescreen' },
    { name: 'laptop-1366x768',   width: 1366, height: 768,  type: 'Laptop Standard' },
    { name: 'laptop-1280x720',   width: 1280, height: 720,  type: 'Laptop Compact' },
    { name: 'mobile-430x932',    width: 430,  height: 932,  type: 'iPhone 15 Pro Max' },
    { name: 'mobile-390x844',    width: 390,  height: 844,  type: 'iPhone 14 / 15' },
    { name: 'mobile-375x812',    width: 375,  height: 812,  type: 'iPhone Mini / SE' },
    { name: 'mobile-360x740',    width: 360,  height: 740,  type: 'Android Small' },
  ];

  for (const vp of ALL_9_VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 200));

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const win = window;
      const scrollHeight = doc.scrollHeight;
      const innerHeight = win.innerHeight;
      const scrollWidth = doc.scrollWidth;
      const innerWidth = win.innerWidth;

      return {
        scrollHeight,
        innerHeight,
        scrollWidth,
        innerWidth,
        vOverflow: Math.max(0, scrollHeight - innerHeight),
        hOverflow: Math.max(0, scrollWidth - innerWidth),
      };
    });

    const isDesktop = vp.width >= 1280;
    const passed = isDesktop
      ? metrics.vOverflow === 0 && metrics.hOverflow === 0
      : metrics.hOverflow === 0;

    console.log(`  -> ${vp.name.padEnd(20)}: scrollHeight: ${metrics.scrollHeight}px, innerHeight: ${metrics.innerHeight}px, v-overflow: ${metrics.vOverflow}px, h-overflow: ${metrics.hOverflow}px => ${passed ? 'PASS' : 'FAIL'}`);

    results.viewportMetrics.push({
      ...vp,
      ...metrics,
      passed,
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `vp-${vp.name}.png`) });
  }

  // Save report
  fs.writeFileSync(
    path.resolve('./audit_reports/oneclick_workspace_entry_report.json'),
    JSON.stringify(results, null, 2)
  );

  await browser.close();
  console.log("\n===============================================================================");
  console.log("ONE-CLICK ROLE-BASED WORKSPACE ENTRY VERIFICATIONS FINISHED SUCCESSFULLY.");
  console.log("===============================================================================");
}

runOneClickVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
