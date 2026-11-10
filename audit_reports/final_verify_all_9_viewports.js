const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const FINAL_SCREENSHOT_DIR = path.resolve('./public/screenshots/auth-final');

const ALL_9_VIEWPORTS = [
  // Desktop & Laptop
  { name: 'desktop-1920x1080', width: 1920, height: 1080, type: 'Desktop Large' },
  { name: 'desktop-1600x900',  width: 1600, height: 900,  type: 'Desktop Standard' },
  { name: 'desktop-1440x900',  width: 1440, height: 900,  type: 'Desktop Widescreen' },
  { name: 'laptop-1366x768',   width: 1366, height: 768,  type: 'Laptop Standard' },
  { name: 'laptop-1280x720',   width: 1280, height: 720,  type: 'Laptop Compact' },
  // Mobile
  { name: 'mobile-430x932',    width: 430,  height: 932,  type: 'iPhone 15 Pro Max' },
  { name: 'mobile-390x844',    width: 390,  height: 844,  type: 'iPhone 14 / 15' },
  { name: 'mobile-375x812',    width: 375,  height: 812,  type: 'iPhone Mini / SE' },
  { name: 'mobile-360x740',    width: 360,  height: 740,  type: 'Android Small' },
];

async function runFinalVerification() {
  if (!fs.existsSync(FINAL_SCREENSHOT_DIR)) {
    fs.mkdirSync(FINAL_SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const reportRows = [];

  console.log('================================================================');
  console.log('FINAL SIGN-IN PAGE VERIFICATION ACROSS ALL 9 VIEWPORTS');
  console.log('================================================================');

  for (const vp of ALL_9_VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 500));

    const metrics = await page.evaluate((vpInfo) => {
      const doc = document.documentElement;
      const body = document.body;
      const win = window;

      const scrollHeight = doc.scrollHeight;
      const scrollWidth = doc.scrollWidth;
      const innerHeight = win.innerHeight;
      const innerWidth = win.innerWidth;

      const verticalOverflow = Math.max(0, scrollHeight - innerHeight);
      const horizontalOverflow = Math.max(0, scrollWidth - innerWidth);

      // Verify all required elements are present and unclipped
      const shieldCheck = !!document.querySelector('svg.lucide-shield-check');
      const userRound = !!document.querySelector('svg.lucide-user-round');
      const store = !!document.querySelector('svg.lucide-store');
      const logo = !!document.querySelector('header svg, a[href="/"] svg');
      const emailInput = document.querySelector('#email');
      const passInput = document.querySelector('#password');
      const submitBtn = document.querySelector('button[type="submit"]');
      const rememberMe = !!document.querySelector('input[type="checkbox"]');
      const forgotLink = !!document.querySelector('a[href="/forgot-password"]');
      const createAccountLink = !!document.querySelector('a[href="/sign-up"]');
      const footer = document.querySelector('footer');

      const submitRect = submitBtn ? submitBtn.getBoundingClientRect() : null;
      const footerRect = footer ? footer.getBoundingClientRect() : null;

      // Check clipping: elements are within viewport bounds
      const submitVisible = submitRect ? (submitRect.bottom <= innerHeight && submitRect.top >= 0) : false;
      const footerVisible = footerRect ? (footerRect.bottom <= innerHeight && footerRect.top >= 0) : false;

      const isDesktop = ['Desktop Large', 'Desktop Standard', 'Desktop Widescreen', 'Laptop Standard', 'Laptop Compact'].includes(vpInfo.type);
      const satisfiesDesktopConstraint = isDesktop ? (scrollHeight <= innerHeight && scrollWidth <= innerWidth) : (scrollWidth <= innerWidth);

      return {
        scrollHeight,
        scrollWidth,
        innerHeight,
        innerWidth,
        verticalOverflow,
        horizontalOverflow,
        isDesktop,
        satisfiesDesktopConstraint,
        elements: {
          shieldCheck,
          userRound,
          store,
          logo,
          emailPresent: !!emailInput,
          passPresent: !!passInput,
          submitPresent: !!submitBtn,
          rememberMe,
          forgotLink,
          createAccountLink,
          footerPresent: !!footer,
          submitVisible,
          footerVisible,
        }
      };
    }, vp);

    // Capture screenshot
    const screenshotPath = path.join(FINAL_SCREENSHOT_DIR, `final-${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const status = metrics.satisfiesDesktopConstraint && metrics.elements.shieldCheck && metrics.elements.userRound && metrics.elements.store ? 'PASS' : 'FAIL';

    console.log(`\nViewport: ${vp.name.padEnd(20)} (${vp.width}x${vp.height} - ${vp.type})`);
    console.log(`  ScrollHeight: ${metrics.scrollHeight}px | ViewportHeight: ${metrics.innerHeight}px | V-Overflow: ${metrics.verticalOverflow}px`);
    console.log(`  ScrollWidth:  ${metrics.scrollWidth}px | ViewportWidth:  ${metrics.innerWidth}px | H-Overflow: ${metrics.horizontalOverflow}px`);
    console.log(`  All 3 Icons:  ShieldCheck=${metrics.elements.shieldCheck}, UserRound=${metrics.elements.userRound}, Store=${metrics.elements.store}`);
    console.log(`  Visibility:   SubmitVisible=${metrics.elements.submitVisible}, FooterVisible=${metrics.elements.footerVisible}`);
    console.log(`  Result:       ${status}`);

    reportRows.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      type: vp.type,
      scrollHeight: metrics.scrollHeight,
      innerHeight: metrics.innerHeight,
      verticalOverflow: metrics.verticalOverflow,
      horizontalOverflow: metrics.horizontalOverflow,
      allIconsPresent: metrics.elements.shieldCheck && metrics.elements.userRound && metrics.elements.store,
      status,
      screenshot: screenshotPath,
    });
  }

  await browser.close();

  fs.writeFileSync(
    path.resolve('./audit_reports/final_signin_viewports_data.json'),
    JSON.stringify(reportRows, null, 2)
  );

  console.log('\n================================================================');
  console.log('SUMMARY TABLE:');
  console.log('================================================================');
  console.table(reportRows.map(r => ({
    Viewport: `${r.width}x${r.height}`,
    ScrollHeight: `${r.scrollHeight}px`,
    ViewportHeight: `${r.innerHeight}px`,
    VerticalOverflow: `${r.verticalOverflow}px`,
    HorizontalOverflow: `${r.horizontalOverflow}px`,
    IconsVisible: r.allIconsPresent,
    Result: r.status,
  })));
}

runFinalVerification();
