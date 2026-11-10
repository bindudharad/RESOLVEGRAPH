const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve('./public/screenshots/auth-audit');

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'laptop-1366x768',  width: 1366, height: 768 },
  { name: 'tablet-768x1024',  width: 768,  height: 1024 },
  { name: 'mobile-390x844',   width: 390,  height: 844 },
  { name: 'small-mobile-360x740', width: 360, height: 740 },
];

async function captureBeforeScreenshots() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Capturing BEFORE screenshots at 5 viewports...');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 500));

    // Check scroll height vs client height
    const scrollInfo = await page.evaluate(() => {
      return {
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        bodyScrollHeight: document.body.scrollHeight,
        canScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
        overflowStyle: window.getComputedStyle(document.querySelector('div.min-h-screen')).overflowY,
      };
    });

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): clientHeight=${scrollInfo.clientHeight}, scrollHeight=${scrollInfo.scrollHeight}, canScroll=${scrollInfo.canScroll}, overflow=${scrollInfo.overflowStyle}`);

    const filePath = path.join(SCREENSHOT_DIR, `before-${vp.name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`Saved screenshot: ${filePath}`);
  }

  await browser.close();
}

captureBeforeScreenshots();
