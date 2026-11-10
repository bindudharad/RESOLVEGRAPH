const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve('./public/screenshots/auth-audit');

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900, type: 'Desktop' },
  { name: 'laptop-1366x768',  width: 1366, height: 768,  type: 'Laptop' },
  { name: 'tablet-768x1024',  width: 768,  height: 1024, type: 'Tablet' },
  { name: 'mobile-390x844',   width: 390,  height: 844,  type: 'Mobile' },
  { name: 'small-mobile-360x740', width: 360, height: 740, type: 'Small Mobile' },
];

async function verifySignInViewports() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const results = [];

  console.log('================================================================');
  console.log('VERIFYING SIGN-IN PAGE RESPONSIVENESS & ICONS ACROSS 5 VIEWPORTS');
  console.log('================================================================');

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing ${vp.name} (${vp.width}x${vp.height} - ${vp.type}) ---`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // Audit icon rendering and layout bounds
    const audit = await page.evaluate((vpInfo) => {
      // 1. Role icons check
      const shieldCheckIcon = document.querySelector('svg.lucide-shield-check');
      const userRoundIcon = document.querySelector('svg.lucide-user-round');
      const storeIcon = document.querySelector('svg.lucide-store');

      const iconsPresent = {
        shieldCheck: !!shieldCheckIcon,
        userRound: !!userRoundIcon,
        store: !!storeIcon,
        allVisible: !!(shieldCheckIcon && userRoundIcon && storeIcon),
      };

      // 2. Labels check
      const bodyText = document.body.textContent;
      const labelsPresent = {
        platform: bodyText.includes('Platform'),
        buyer: bodyText.includes('Buyer'),
        merchant: bodyText.includes('Seller / Merchant'),
      };

      // 3. Scroll and overflow metrics
      const docHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const docWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;

      const hasHorizontalOverflow = docWidth > clientWidth;
      const needsVerticalScroll = docHeight > clientHeight;

      // 4. Bounding boxes of key interactive elements
      const emailInput = document.querySelector('#email');
      const passInput = document.querySelector('#password');
      const submitBtn = document.querySelector('button[type="submit"]');
      const footer = document.querySelector('footer');

      const emailRect = emailInput ? emailInput.getBoundingClientRect() : null;
      const passRect = passInput ? passInput.getBoundingClientRect() : null;
      const submitRect = submitBtn ? submitBtn.getBoundingClientRect() : null;
      const footerRect = footer ? footer.getBoundingClientRect() : null;

      // Check if button or inputs are clipped
      const isSubmitVisibleWithoutScroll = submitRect ? (submitRect.bottom <= clientHeight && submitRect.top >= 0) : false;

      return {
        iconsPresent,
        labelsPresent,
        docWidth,
        clientWidth,
        hasHorizontalOverflow,
        docHeight,
        clientHeight,
        needsVerticalScroll,
        submitRect,
        isSubmitVisibleWithoutScroll,
      };
    }, vp);

    console.log(`  ✓ Role Icons Rendered: ShieldCheck=${audit.iconsPresent.shieldCheck}, UserRound=${audit.iconsPresent.userRound}, Store=${audit.iconsPresent.store}`);
    console.log(`  ✓ Role Labels Rendered: Platform=${audit.labelsPresent.platform}, Buyer=${audit.labelsPresent.buyer}, Seller/Merchant=${audit.labelsPresent.merchant}`);
    console.log(`  ✓ Dimensions: docWidth=${audit.docWidth}px (vp: ${vp.width}px), docHeight=${audit.docHeight}px (vp: ${vp.height}px)`);
    console.log(`  ✓ Horizontal Overflow: ${audit.hasHorizontalOverflow ? 'FAIL (OVERFLOW)' : 'PASS (0px)'}`);
    console.log(`  ✓ Needs Vertical Scroll: ${audit.needsVerticalScroll} (Desktop unnecessary scroll: ${vp.type === 'Desktop' ? audit.needsVerticalScroll : 'N/A'})`);

    // Capture screenshot
    const filePath = path.join(SCREENSHOT_DIR, `after-${vp.name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  ✓ Saved screenshot: ${filePath}`);

    results.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      type: vp.type,
      audit,
      screenshotPath: filePath,
    });
  }

  await browser.close();

  fs.writeFileSync(
    path.resolve('./audit_reports/signin_verification_results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\nVerification complete! Results saved to ./audit_reports/signin_verification_results.json');
}

verifySignInViewports();
