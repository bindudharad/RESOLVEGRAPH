/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BEFORE_DIR = path.resolve(__dirname, '../public/screenshots/redesign-before');
if (!fs.existsSync(BEFORE_DIR)) {
  fs.mkdirSync(BEFORE_DIR, { recursive: true });
}

async function run() {
  console.log('Capturing BEFORE screenshots of all 7 sections...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  try {
    // Sign in as Platform Admin
    console.log('Logging in as Platform Admin...');
    await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const enterPlatformBtn = btns.find(b => b.innerText.includes('Enter Platform') || b.innerText.includes('Platform Administrator'));
      if (enterPlatformBtn) enterPlatformBtn.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

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

    for (const r of routes) {
      console.log(`Navigating to ${r.name} (${r.url})...`);
      await page.goto(r.url, { waitUntil: 'networkidle2' });
      await new Promise(res => setTimeout(res, 1500));
      // First viewport
      await page.screenshot({ path: path.join(BEFORE_DIR, `${r.name}_viewport.png`) });
      // Full page
      await page.screenshot({ path: path.join(BEFORE_DIR, `${r.name}_fullpage.png`), fullPage: true });
    }

    console.log('All BEFORE screenshots captured successfully in', BEFORE_DIR);
  } catch (err) {
    console.error('Capture failed:', err);
  } finally {
    await browser.close();
  }
}

run();
