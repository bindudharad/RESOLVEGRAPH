/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const AFTER_DIR = path.resolve(__dirname, '../public/screenshots/redesign-after');
const RESPONSIVE_DIR = path.resolve(__dirname, '../public/screenshots/redesign-responsive');

if (!fs.existsSync(AFTER_DIR)) {
  fs.mkdirSync(AFTER_DIR, { recursive: true });
}
if (!fs.existsSync(RESPONSIVE_DIR)) {
  fs.mkdirSync(RESPONSIVE_DIR, { recursive: true });
}

const routes = [
  { name: '01_overview', url: 'http://localhost:3000/overview' },
  { name: '02_payments', url: 'http://localhost:3000/payments' },
  { name: '03_investigations', url: 'http://localhost:3000/cases' },
  { name: '04_evidence', url: 'http://localhost:3000/evidence' },
  { name: '05_resolution', url: 'http://localhost:3000/resolution' },
  { name: '05_resolution_room', url: 'http://localhost:3000/resolution-room' },
  { name: '06_copilot', url: 'http://localhost:3000/copilot' },
  { name: '07_admin_organizations', url: 'http://localhost:3000/organizations' },
  { name: '07_admin_security', url: 'http://localhost:3000/admin/security' },
  { name: '07_admin_settings', url: 'http://localhost:3000/settings' }
];

const viewports = [
  { label: 'desktop_1920x1080', width: 1920, height: 1080 },
  { label: 'laptop_1440x900', width: 1440, height: 900 },
  { label: 'small_1280x720', width: 1280, height: 720 },
  { label: 'tablet_768x1024', width: 768, height: 1024 },
  { label: 'mobile_390x844', width: 390, height: 844 }
];

async function run() {
  console.log('Capturing AFTER screenshots of all 7 sections...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  try {
    // 1. Sign in as Platform Admin
    console.log('Logging in as Platform Admin...');
    await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const enterPlatformBtn = btns.find(b => b.innerText.includes('Enter Platform') || b.innerText.includes('Platform Administrator'));
      if (enterPlatformBtn) enterPlatformBtn.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // 2. Standard 1440x900 viewport & fullpage captures
    for (const r of routes) {
      console.log(`Navigating to ${r.name} (${r.url})...`);
      await page.goto(r.url, { waitUntil: 'networkidle2' });
      await new Promise(res => setTimeout(res, 1500));
      // First viewport
      await page.screenshot({ path: path.join(AFTER_DIR, `${r.name}_viewport.png`) });
      // Full page
      await page.screenshot({ path: path.join(AFTER_DIR, `${r.name}_fullpage.png`), fullPage: true });
    }
    console.log('Standard AFTER screenshots captured in', AFTER_DIR);

    // 3. Responsive captures across 5 viewports for key pages (Overview, Payments, Investigations, Resolution, Copilot, Admin)
    const responsivePages = [
      { name: '01_overview', url: 'http://localhost:3000/overview' },
      { name: '02_payments', url: 'http://localhost:3000/payments' },
      { name: '05_resolution', url: 'http://localhost:3000/resolution' },
      { name: '06_copilot', url: 'http://localhost:3000/copilot' }
    ];

    for (const vp of viewports) {
      console.log(`Setting viewport: ${vp.label} (${vp.width}x${vp.height})...`);
      await page.setViewport({ width: vp.width, height: vp.height });
      for (const p of responsivePages) {
        await page.goto(p.url, { waitUntil: 'networkidle2' });
        await new Promise(res => setTimeout(res, 1000));
        await page.screenshot({ path: path.join(RESPONSIVE_DIR, `${p.name}_${vp.label}.png`) });
      }
    }
    console.log('Responsive screenshots captured in', RESPONSIVE_DIR);

  } catch (err) {
    console.error('Capture failed:', err);
  } finally {
    await browser.close();
  }
}

run();
