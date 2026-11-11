/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '../public/screenshots/platform-audit');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching Chrome with puppeteer-core for Platform Remediation verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  // Track console errors
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')) {
        pageErrors.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.toString());
  });

  try {
    // 1. Enter as Platform Admin via /sign-in
    console.log('Step 1: Navigating to /sign-in');
    await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });
    
    console.log('Clicking "Enter Platform" one-click entrance...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const enterPlatformBtn = btns.find(b => b.innerText.includes('Enter Platform') || b.innerText.includes('Platform Administrator'));
      if (enterPlatformBtn) {
        enterPlatformBtn.click();
      } else {
        throw new Error('Enter Platform button not found');
      }
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    console.log('Current URL after login:', page.url());

    // 2. Capture Sidebar 7 sections
    console.log('Step 2: Capturing 00_sidebar_7sections.png');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00_sidebar_7sections.png') });

    // Verify sidebar items
    const navItems = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('nav[aria-label="Sidebar Navigation"] a'));
      return links.map(l => ({ text: l.innerText.trim(), href: l.getAttribute('href') }));
    });
    console.log('Detected Sidebar Navigation Items:', JSON.stringify(navItems, null, 2));

    // 3. Test Cases & Investigation Sub-navigation
    console.log('Step 3: Navigating to /cases');
    await page.goto('http://localhost:3000/cases', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03a_cases_roster_tabs.png') });

    console.log('Testing click on BERR Reasoning Engine tab...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const berrLink = links.find(l => l.innerText.includes('BERR Reasoning Engine'));
      if (berrLink) berrLink.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    console.log('Current URL after tab switch:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03b_investigation_berr_tabs.png') });

    // 4. Test Resolution & Resolution Room Sub-navigation
    console.log('Step 4: Navigating to /resolution');
    await page.goto('http://localhost:3000/resolution', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05b_resolution_center_tabs.png') });

    console.log('Testing click on Bilateral Resolution Room tab...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const roomLink = links.find(l => l.innerText.includes('Bilateral Resolution Room'));
      if (roomLink) roomLink.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    console.log('Current URL after tab switch to room:', page.url());

    // Verify Resolution Room content
    const roomState = await page.evaluate(() => {
      const header = document.querySelector('h1')?.innerText || '';
      const msgs = document.querySelectorAll('.message-bubble, [data-message-id], .bg-surface-2, .space-y-4');
      const errorBanner = document.body.innerText.includes('Error Loading Messages') || document.body.innerText.includes('500');
      const select = document.querySelector('select');
      const selectOptions = select ? Array.from(select.options).map(o => o.text) : [];
      return {
        header,
        msgElementsFound: msgs.length,
        hasErrorBanner: errorBanner,
        selectOptionsCount: selectOptions.length,
        firstFewOptions: selectOptions.slice(0, 3)
      };
    });
    console.log('Resolution Room Evaluation:', JSON.stringify(roomState, null, 2));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05a_resolution_room_fixed.png') });

    // 5. Test Settings dynamic binding
    console.log('Step 5: Navigating to /settings');
    await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const settingsState = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => i.value);
      return { inputs };
    });
    console.log('Settings Page Inputs:', settingsState);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07c_settings_dynamic.png') });

    // 6. Test Admin Security Page as Admin
    console.log('Step 6: Navigating to /admin/security as Admin');
    await page.goto('http://localhost:3000/admin/security', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07b_admin_security_protected.png') });
    console.log('Admin Security URL:', page.url());

    // 7. Test direct access to /admin/security as Buyer
    console.log('Step 7: Testing direct access to /admin/security as Buyer persona...');
    // Clear cookies first to terminate Admin session
    const cdp = await page.target().createCDPSession();
    await cdp.send('Network.clearBrowserCookies');

    await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const enterBuyerBtn = btns.find(b => b.innerText.includes('Enter Buyer') || b.innerText.includes('Buyer Portal'));
      if (enterBuyerBtn) enterBuyerBtn.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    console.log('Buyer logged in. Current URL:', page.url());

    // Try navigating to /admin/security directly
    await page.goto('http://localhost:3000/admin/security', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));
    console.log('URL when Buyer tries accessing /admin/security:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07d_buyer_access_denied.png') });

    console.log('Verification run complete!');
    if (pageErrors.length > 0) {
      console.warn('Page errors observed during run:', pageErrors);
    } else {
      console.log('Zero page errors detected.');
    }
  } catch (err) {
    console.error('Puppeteer verification failed:', err);
  } finally {
    await browser.close();
  }
}

run();
