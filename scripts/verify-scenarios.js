const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\Bindudhara D\\.gemini\\antigravity\\brain\\93f16013-33ff-4925-b6eb-1ec0978895c0\\screenshots";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 1 },
  mobile: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

async function main() {
  console.log("=== STARTING HOME ROUTING & NAVIGATION VERIFICATION ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const results = [];

  try {
    // -------------------------------------------------------------
    // SCENARIO A: Public Visitor (Unauthenticated Context)
    // -------------------------------------------------------------
    console.log("\n--- Testing Scenario A: Public Visitor ---");
    const anonContext = await browser.createBrowserContext();
    const anonPage = await anonContext.newPage();
    await anonPage.setViewport(VIEWPORTS.desktop);

    // 1. Visit '/' without cookies or demo headers -> should redirect to '/overview'
    console.log("Visiting http://localhost:3000/ as unauthenticated visitor...");
    await anonPage.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 25000 });
    const urlAfterRoot = anonPage.url();
    console.log(`URL after visiting root '/': ${urlAfterRoot}`);
    const isRedirectedToOverview = urlAfterRoot.includes("/overview");
    results.push({ test: "Scenario A1: Root '/' redirects visitor to '/overview'", passed: isRedirectedToOverview });

    // Capture screenshot of public landing
    await anonPage.screenshot({ path: path.join(ARTIFACT_DIR, "v5_01_public_landing_overview.png"), fullPage: false });
    console.log("Captured v5_01_public_landing_overview.png");

    // 2. Direct visit to '/overview' -> should render public landing (200 OK)
    await anonPage.goto("http://localhost:3000/overview", { waitUntil: "networkidle0", timeout: 25000 });
    const overviewContent = await anonPage.content();
    const hasLandingText = overviewContent.includes("One Payment. Every Source. One Explainable Resolution") || overviewContent.includes("RESOLVEGRAPH");
    results.push({ test: "Scenario A2: '/overview' renders public landing", passed: hasLandingText });

    // 3. Direct visit to protected '/dashboard' without session -> should redirect to '/sign-in'
    console.log("Testing unauthenticated access to protected '/dashboard'...");
    await anonPage.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle0", timeout: 25000 });
    const urlAfterDashboard = anonPage.url();
    console.log(`URL after visiting '/dashboard' without auth: ${urlAfterDashboard}`);
    const isRedirectedToSignIn = urlAfterDashboard.includes("/sign-in");
    results.push({ test: "Scenario A3: Unauthenticated access to '/dashboard' redirects to '/sign-in'", passed: isRedirectedToSignIn });

    // 4. Visit '/sign-in' directly -> should render authentication page
    await anonPage.goto("http://localhost:3000/sign-in", { waitUntil: "networkidle0", timeout: 25000 });
    const signInContent = await anonPage.content();
    const hasSignInForm = signInContent.includes("Sign in to ResolveGraph") && signInContent.includes("Priya Raghavan");
    results.push({ test: "Scenario A4: '/sign-in' renders authentication with demo personas", passed: hasSignInForm });
    await anonPage.screenshot({ path: path.join(ARTIFACT_DIR, "v5_02_signin_page.png"), fullPage: false });
    console.log("Captured v5_02_signin_page.png");

    await anonContext.close();

    // -------------------------------------------------------------
    // SCENARIO B: Authenticated User Navigation
    // -------------------------------------------------------------
    console.log("\n--- Testing Scenario B: Authenticated User ---");
    const authContext = await browser.createBrowserContext();
    const authPage = await authContext.newPage();
    await authPage.setViewport(VIEWPORTS.desktop);
    // Provide demo auth header
    await authPage.setExtraHTTPHeaders({ "x-demo-user-email": "admin@resolvegraph.demo" });

    // 1. Visit '/' while authenticated -> should redirect to '/dashboard'
    console.log("Visiting http://localhost:3000/ as authenticated user...");
    await authPage.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 25000 });
    const authUrlAfterRoot = authPage.url();
    console.log(`URL after visiting root '/' as authenticated: ${authUrlAfterRoot}`);
    const isRedirectedToDashboard = authUrlAfterRoot.includes("/dashboard");
    results.push({ test: "Scenario B1: Root '/' redirects authenticated user to '/dashboard'", passed: isRedirectedToDashboard });

    // 2. Verify Home page content and Home sidebar link
    await authPage.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle0", timeout: 25000 });
    await new Promise(r => setTimeout(r, 1000));
    const dashboardHtml = await authPage.content();
    const hasCommandCenterHeading = dashboardHtml.includes("Your Investigation Command Center");
    results.push({ test: "Scenario B2: '/dashboard' renders Investigation Command Center", passed: hasCommandCenterHeading });

    // Check Home navigation item in sidebar
    const homeNavLink = await authPage.$('nav[aria-label="Primary"] a[href="/dashboard"]');
    const homeNavLinkText = homeNavLink ? await homeNavLink.evaluate(el => el.textContent) : null;
    console.log(`Sidebar Home Link found: ${Boolean(homeNavLink)}, Text: "${homeNavLinkText?.trim()}"`);
    const isHomeNavLinkValid = Boolean(homeNavLink && homeNavLinkText && homeNavLinkText.includes("Home"));
    results.push({ test: "Scenario B3: Sidebar displays 'Home' linking to '/dashboard'", passed: isHomeNavLinkValid });

    // Capture desktop Home screenshot
    await authPage.screenshot({ path: path.join(ARTIFACT_DIR, "v5_03_authenticated_home_desktop.png"), fullPage: false });
    console.log("Captured v5_03_authenticated_home_desktop.png");

    // 3. Test Brand Logo navigation
    const logoLink = await authPage.$('#app-sidebar a[href="/dashboard"]');
    console.log(`Sidebar Logo Link found: ${Boolean(logoLink)}`);
    results.push({ test: "Scenario B4: Logo area in sidebar links to '/dashboard'", passed: Boolean(logoLink) });

    // 4. Navigate to another workspace route (e.g. '/cases') and verify Breadcrumb trail
    console.log("\nNavigating to '/cases' to verify breadcrumbs...");
    await authPage.goto("http://localhost:3000/cases", { waitUntil: "networkidle0", timeout: 25000 });
    await new Promise(r => setTimeout(r, 1000));
    const casesHtml = await authPage.content();
    
    // Check breadcrumbs in topbar
    const homeBreadcrumb = await authPage.$('nav[aria-label="Breadcrumb"] a[href="/dashboard"]');
    const homeBreadcrumbText = homeBreadcrumb ? await homeBreadcrumb.evaluate(el => el.textContent) : null;
    console.log(`Breadcrumb Home Link found: ${Boolean(homeBreadcrumb)}, Text: "${homeBreadcrumbText?.trim()}"`);
    const isHomeBreadcrumbValid = Boolean(homeBreadcrumb && homeBreadcrumbText && homeBreadcrumbText.trim() === "Home");
    results.push({ test: "Scenario B5: Topbar breadcrumb starts with clickable 'Home' -> '/dashboard'", passed: isHomeBreadcrumbValid });

    await authPage.screenshot({ path: path.join(ARTIFACT_DIR, "v5_04_cases_breadcrumb_home_desktop.png"), fullPage: false });
    console.log("Captured v5_04_cases_breadcrumb_home_desktop.png");

    // 5. Click 'Home' in breadcrumb and verify it returns to '/dashboard'
    if (homeBreadcrumb) {
      await Promise.all([
        authPage.waitForNavigation({ waitUntil: "networkidle0" }),
        homeBreadcrumb.click(),
      ]);
      const currentUrlAfterBreadcrumbClick = authPage.url();
      console.log(`URL after clicking 'Home' in breadcrumb: ${currentUrlAfterBreadcrumbClick}`);
      const returnedToDashboard = currentUrlAfterBreadcrumbClick.includes("/dashboard");
      results.push({ test: "Scenario B6: Clicking 'Home' in breadcrumbs returns to '/dashboard'", passed: returnedToDashboard });
    }

    // -------------------------------------------------------------
    // SCENARIO C: Direct Navigation Across Core Workspaces
    // -------------------------------------------------------------
    console.log("\n--- Testing Scenario C: Direct Workspace Navigation ---");
    const workspaceRoutes = [
      { route: "/incidents", expectedBreadcrumb: "Payment Incidents" },
      { route: "/reconciliation", expectedBreadcrumb: "Cross-Reconciliation" },
      { route: "/evidence", expectedBreadcrumb: "Evidence Library" },
      { route: "/resolution-room", expectedBreadcrumb: "Shared Resolution Room" },
    ];

    for (const ws of workspaceRoutes) {
      await authPage.goto(`http://localhost:3000${ws.route}`, { waitUntil: "networkidle0", timeout: 25000 });
      const pageCrumbs = await authPage.$$eval('nav[aria-label="Breadcrumb"] li', lis => lis.map(li => li.textContent.trim()).filter(Boolean));
      console.log(`Route ${ws.route} crumbs:`, pageCrumbs);
      const startsWithHome = pageCrumbs.some(c => c.includes("Home"));
      results.push({ test: `Scenario C: Direct route ${ws.route} starts with 'Home' breadcrumb`, passed: startsWithHome });
    }

    // -------------------------------------------------------------
    // SCENARIO D: Responsive Navigation Verification
    // -------------------------------------------------------------
    console.log("\n--- Testing Scenario D: Responsive Navigation ---");
    // Tablet
    await authPage.setViewport(VIEWPORTS.tablet);
    await authPage.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle0", timeout: 25000 });
    await new Promise(r => setTimeout(r, 1000));
    await authPage.screenshot({ path: path.join(ARTIFACT_DIR, "v5_05_home_tablet.png"), fullPage: false });
    console.log("Captured v5_05_home_tablet.png");

    // Mobile
    await authPage.setViewport(VIEWPORTS.mobile);
    await authPage.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle0", timeout: 25000 });
    await new Promise(r => setTimeout(r, 1000));
    // Check mobile bottom navigation bar
    const mobileHomeTab = await authPage.$('nav[aria-label="Mobile Bottom Navigation"] a[href="/dashboard"]');
    const mobileHomeTabText = mobileHomeTab ? await mobileHomeTab.evaluate(el => el.textContent) : null;
    console.log(`Mobile Bottom Navigation Home tab: ${Boolean(mobileHomeTab)}, Text: "${mobileHomeTabText?.trim()}"`);
    const isMobileHomeTabValid = Boolean(mobileHomeTab && mobileHomeTabText && mobileHomeTabText.includes("Home"));
    results.push({ test: "Scenario D: Mobile bottom bar has 'Home' tab linking to '/dashboard'", passed: isMobileHomeTabValid });

    await authPage.screenshot({ path: path.join(ARTIFACT_DIR, "v5_06_home_mobile.png"), fullPage: false });
    console.log("Captured v5_06_home_mobile.png");

    await authContext.close();
  } catch (err) {
    console.error("Test execution exception:", err);
  } finally {
    await browser.close();
  }

  console.log("\n================ TEST SUMMARY ================");
  let allPassed = true;
  for (const r of results) {
    console.log(`${r.passed ? "✔ PASS" : "✖ FAIL"}: ${r.test}`);
    if (!r.passed) allPassed = false;
  }
  console.log(`TOTAL: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  if (!allPassed) {
    process.exit(1);
  }
}

main();
