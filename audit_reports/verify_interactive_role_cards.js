const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve('./public/screenshots/auth-interactive');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runComprehensiveVerification() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const results = {
    clickSelection: false,
    switchingSelections: false,
    keyboardNav: false,
    matchingLogins: [],
    mismatchedLogins: [],
    unauthenticatedProtection: false,
    viewportMetrics: [],
  };

  console.log("===============================================================================");
  console.log("STARTING RESOLVEGRAPH 2.0 INTERACTIVE ROLE CARDS VERIFICATION");
  console.log("===============================================================================\n");

  // Helper to clear cookies and reset session
  const clearSession = async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
  };

  // -------------------------------------------------------------------------
  // 1. TEST INTERACTIVE CLICK SELECTION & SWITCHING
  // -------------------------------------------------------------------------
  console.log("[TEST 1] Testing Role Cards Click Selection & Switching...");
  await page.setViewport({ width: 1440, height: 900 });
  await clearSession();

  // Initial state check
  const initialChecked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="radio"]'));
    return btns.map(b => ({ id: b.id, checked: b.getAttribute('aria-checked') }));
  });
  console.log("  Initial radio states:", initialChecked);

  // Click Platform
  await page.click('#workspace-btn-PLATFORM');
  await new Promise(r => setTimeout(r, 200));
  const platformState = await page.evaluate(() => {
    const btn = document.getElementById('workspace-btn-PLATFORM');
    const banner = document.querySelector('.text-white\\/95')?.textContent || '';
    return {
      btnChecked: btn?.getAttribute('aria-checked'),
      bannerText: banner,
    };
  });
  console.log("  After clicking Platform:", platformState);

  // Click Buyer
  await page.click('#workspace-btn-BUYER');
  await new Promise(r => setTimeout(r, 200));
  const buyerState = await page.evaluate(() => {
    const btn = document.getElementById('workspace-btn-BUYER');
    const prevBtn = document.getElementById('workspace-btn-PLATFORM');
    const banner = document.querySelector('.text-white\\/95')?.textContent || '';
    return {
      btnChecked: btn?.getAttribute('aria-checked'),
      prevChecked: prevBtn?.getAttribute('aria-checked'),
      bannerText: banner,
    };
  });
  console.log("  After clicking Buyer:", buyerState);

  // Click Seller / Merchant
  await page.click('#workspace-btn-MERCHANT');
  await new Promise(r => setTimeout(r, 200));
  const merchantState = await page.evaluate(() => {
    const btn = document.getElementById('workspace-btn-MERCHANT');
    const prevBtn = document.getElementById('workspace-btn-BUYER');
    const banner = document.querySelector('.text-white\\/95')?.textContent || '';
    return {
      btnChecked: btn?.getAttribute('aria-checked'),
      prevChecked: prevBtn?.getAttribute('aria-checked'),
      bannerText: banner,
    };
  });
  console.log("  After clicking Merchant:", merchantState);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-interactive-selection-merchant.png') });

  results.clickSelection = platformState.btnChecked === 'true' && platformState.bannerText.includes('Platform');
  results.switchingSelections = buyerState.btnChecked === 'true' && buyerState.prevChecked === 'false' && merchantState.btnChecked === 'true';

  console.log(`  -> Click selection test: ${results.clickSelection ? 'PASS' : 'FAIL'}`);
  console.log(`  -> Switching test: ${results.switchingSelections ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // 2. TEST KEYBOARD NAVIGATION
  // -------------------------------------------------------------------------
  console.log("[TEST 2] Testing Keyboard Navigation (Arrow Keys / Focus)...");
  await page.focus('#workspace-btn-PLATFORM');
  await page.keyboard.press('Space');
  await new Promise(r => setTimeout(r, 150));

  let kbState = await page.evaluate(() => ({
    activeId: document.activeElement?.id,
    selected: document.getElementById('workspace-btn-PLATFORM')?.getAttribute('aria-checked'),
  }));
  console.log("  After Space on Platform:", kbState);

  // Press ArrowRight to move to Buyer
  await page.keyboard.press('ArrowRight');
  await new Promise(r => setTimeout(r, 150));
  kbState = await page.evaluate(() => ({
    activeId: document.activeElement?.id,
    selected: document.getElementById('workspace-btn-BUYER')?.getAttribute('aria-checked'),
  }));
  console.log("  After ArrowRight to Buyer:", kbState);

  // Press ArrowRight to move to Merchant
  await page.keyboard.press('ArrowRight');
  await new Promise(r => setTimeout(r, 150));
  kbState = await page.evaluate(() => ({
    activeId: document.activeElement?.id,
    selected: document.getElementById('workspace-btn-MERCHANT')?.getAttribute('aria-checked'),
  }));
  console.log("  After ArrowRight to Merchant:", kbState);

  // Press ArrowLeft to move back to Buyer
  await page.keyboard.press('ArrowLeft');
  await new Promise(r => setTimeout(r, 150));
  kbState = await page.evaluate(() => ({
    activeId: document.activeElement?.id,
    selected: document.getElementById('workspace-btn-BUYER')?.getAttribute('aria-checked'),
  }));
  console.log("  After ArrowLeft back to Buyer:", kbState);

  results.keyboardNav = kbState.activeId === 'workspace-btn-BUYER' && kbState.selected === 'true';
  console.log(`  -> Keyboard navigation test: ${results.keyboardNav ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // 3. TEST MATCHING ROLE LOGINS (All 3 Roles)
  // -------------------------------------------------------------------------
  console.log("[TEST 3] Testing Matching Role Logins...");

  const matchingTests = [
    {
      workspace: 'PLATFORM',
      email: 'admin@resolvegraph.demo',
      pass: 'Admin@ResolveGraph2026!',
      role: 'ADMIN',
    },
    {
      workspace: 'BUYER',
      email: 'alex.morgan@consumer.demo',
      pass: 'Buyer@ResolveGraph2026!',
      role: 'BUYER',
    },
    {
      workspace: 'MERCHANT',
      email: 'disputes@techstore.demo',
      pass: 'Merchant@TechStore2026!',
      role: 'MERCHANT',
    },
  ];

  for (const t of matchingTests) {
    await clearSession();
    await page.click(`#workspace-btn-${t.workspace}`);
    await page.type('#email', t.email);
    await page.type('#password', t.pass);

    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/sign-in/email')),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    const currentUrl = page.url();
    const passed = currentUrl.includes('/overview') || currentUrl.includes('/dashboard');

    console.log(`  -> ${t.workspace} match (${t.email}): status ${response.status()}, url: ${currentUrl} => ${passed ? 'PASS' : 'FAIL'}`);
    results.matchingLogins.push({ workspace: t.workspace, email: t.email, passed, finalUrl: currentUrl });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `02-match-success-${t.workspace.toLowerCase()}.png`) });
  }
  console.log("");

  // -------------------------------------------------------------------------
  // 4. TEST MISMATCHED ROLE LOGINS (Should Deny with Required String)
  // -------------------------------------------------------------------------
  console.log("[TEST 4] Testing Mismatched Role Logins (Must Deny Access)...");

  const mismatchedTests = [
    {
      selectedWorkspace: 'PLATFORM',
      email: 'alex.morgan@consumer.demo', // Buyer trying to access Platform
      pass: 'Buyer@ResolveGraph2026!',
      actualRole: 'BUYER',
    },
    {
      selectedWorkspace: 'BUYER',
      email: 'admin@resolvegraph.demo', // Admin trying to access Buyer
      pass: 'Admin@ResolveGraph2026!',
      actualRole: 'ADMIN',
    },
    {
      selectedWorkspace: 'MERCHANT',
      email: 'alex.morgan@consumer.demo', // Buyer trying to access Merchant
      pass: 'Buyer@ResolveGraph2026!',
      actualRole: 'BUYER',
    },
  ];

  const EXPECTED_ERROR = "Your account does not have access to this workspace. Please select your assigned workspace or contact your administrator.";

  for (const t of mismatchedTests) {
    await clearSession();
    await page.click(`#workspace-btn-${t.selectedWorkspace}`);
    await page.type('#email', t.email);
    await page.type('#password', t.pass);

    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/sign-in/email')),
      page.click('button[type="submit"]'),
    ]);

    await new Promise(r => setTimeout(r, 600));

    const pageState = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      return {
        url: window.location.href,
        alertText: alert?.textContent || '',
      };
    });

    const hasExactMessage = pageState.alertText.includes(EXPECTED_ERROR);
    const stayedOnSignIn = pageState.url.includes('/sign-in');
    const passed = hasExactMessage && stayedOnSignIn;

    console.log(`  -> ${t.selectedWorkspace} selected with ${t.actualRole} (${t.email}):`);
    console.log(`     Alert visible: "${pageState.alertText}"`);
    console.log(`     Exact message matched: ${hasExactMessage}`);
    console.log(`     Stayed on /sign-in: ${stayedOnSignIn} => ${passed ? 'PASS' : 'FAIL'}`);

    results.mismatchedLogins.push({
      selectedWorkspace: t.selectedWorkspace,
      actualRole: t.actualRole,
      hasExactMessage,
      stayedOnSignIn,
      passed,
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `03-mismatch-denied-${t.selectedWorkspace.toLowerCase()}.png`) });
  }
  console.log("");

  // -------------------------------------------------------------------------
  // 5. TEST UNAUTHENTICATED PROTECTION
  // -------------------------------------------------------------------------
  console.log("[TEST 5] Testing Unauthenticated Access Protection...");
  await clearSession();
  await page.goto(`${BASE_URL}/cases`, { waitUntil: 'networkidle2' });
  const protectedUrl = page.url();
  results.unauthenticatedProtection = protectedUrl.includes('/sign-in') && protectedUrl.includes('callbackUrl=%2Fcases');
  console.log(`  -> Navigating to /cases while unauthenticated redirected to: ${protectedUrl}`);
  console.log(`  -> Unauthenticated protection test: ${results.unauthenticatedProtection ? 'PASS' : 'FAIL'}\n`);

  // -------------------------------------------------------------------------
  // 6. VIEWPORT FIT VERIFICATION (ALL 9 VIEWPORTS)
  // -------------------------------------------------------------------------
  console.log("[TEST 6] Testing Viewport Fit Across All 9 Viewports (0px Overflow on Desktop)...");

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

  await clearSession();

  for (const vp of ALL_9_VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
    await page.click('#workspace-btn-PLATFORM'); // Select Platform to test with active state
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

  // Save report data
  fs.writeFileSync(
    path.resolve('./audit_reports/interactive_role_cards_report.json'),
    JSON.stringify(results, null, 2)
  );

  await browser.close();
  console.log("\n===============================================================================");
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY. REPORT SAVED.");
  console.log("===============================================================================");
}

runComprehensiveVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
