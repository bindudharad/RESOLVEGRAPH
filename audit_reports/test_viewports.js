const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";

const VIEWPORTS = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080, type: 'Desktop' },
  { name: 'desktop-1600x900',  width: 1600, height: 900,  type: 'Desktop' },
  { name: 'desktop-1440x900',  width: 1440, height: 900,  type: 'Desktop' },
  { name: 'desktop-1366x768',  width: 1366, height: 768,  type: 'Desktop' },
  { name: 'desktop-1280x720',  width: 1280, height: 720,  type: 'Desktop' },
  { name: 'tablet-768x1024',   width: 768,  height: 1024, type: 'Tablet' },
  { name: 'mobile-430x932',    width: 430,  height: 932,  type: 'Mobile' },
  { name: 'mobile-390x844',    width: 390,  height: 844,  type: 'Mobile' },
  { name: 'mobile-375x812',    width: 375,  height: 812,  type: 'Mobile' },
  { name: 'mobile-360x800',    width: 360,  height: 800,  type: 'Mobile' },
];

const PAGES_TO_TEST = ['/overview', '/payments', '/cases', '/evidence', '/sign-in'];

async function runResponsiveTests() {
  console.log('================================================================');
  console.log('PHASE 13: RESPONSIVE VIEWPORT & OVERFLOW AUDIT');
  console.log('================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Sign in as Platform Admin first to have access to all routes
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@resolvegraph.demo');
  await page.type('#password', 'Admin@ResolveGraph2026!');
  await page.click("button[type='submit']");
  await page.waitForFunction(() => window.location.pathname.startsWith('/overview'), { timeout: 15000 });

  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height} - ${vp.type})`);
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const route of PAGES_TO_TEST) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 600));

      const overflowMetrics = await page.evaluate((vpWidth) => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const innerWidth = window.innerWidth;
        const hasHorizontalOverflow = docWidth > innerWidth || bodyWidth > innerWidth;
        const overflowPixels = Math.max(0, docWidth - innerWidth, bodyWidth - innerWidth);

        // Check if sidebar is rendered / visible or collapsed / hamburger
        const sidebar = document.getElementById('app-sidebar');
        const sidebarVisible = sidebar ? window.getComputedStyle(sidebar).display !== 'none' : false;
        const mobileNav = document.querySelector('[aria-label="Mobile navigation"]') || document.querySelector('header button');

        return {
          docWidth,
          bodyWidth,
          innerWidth,
          hasHorizontalOverflow,
          overflowPixels,
          sidebarVisible,
          mobileNavPresent: !!mobileNav,
        };
      }, vp.width);

      const status = overflowMetrics.hasHorizontalOverflow ? 'OVERFLOW_FAIL' : 'PASS';
      console.log(`  [${status}] ${route.padEnd(12)} -> docWidth: ${overflowMetrics.docWidth}px, vpWidth: ${vp.width}px, overflow: ${overflowMetrics.overflowPixels}px`);

      results.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        type: vp.type,
        route,
        status,
        metrics: overflowMetrics,
      });
    }
  }

  await browser.close();

  const outputPath = path.resolve('./audit_reports/responsive_test_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResponsive results written to: ${outputPath}`);
}

runResponsiveTests();
