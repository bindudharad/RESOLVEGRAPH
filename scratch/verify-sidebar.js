/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../audit_reports/screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runVerification() {
  console.log('--- STARTING SIDEBAR COMPREHENSIVE VERIFICATION ---');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--window-size=1920,1080', '--no-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // 1. Authenticate as Platform Admin
  console.log('1. Signing in as Platform Admin...');
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Enter Platform'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // 2. Clear collapsed preference so desktop opens expanded by default
  await page.evaluate(() => {
    localStorage.removeItem('rg.sidebar.collapsed');
  });

  // VIEWPORT 1: 1920x1080 Expanded
  console.log('2. Testing Viewport: 1920x1080 (Desktop Expanded)...');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000/overview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const expanded1920Info = await page.evaluate(() => {
    const sidebar = document.querySelector('#app-sidebar');
    const header = document.querySelector('header');
    const brand = sidebar?.firstElementChild;
    const sRect = sidebar?.getBoundingClientRect();
    const hRect = header?.getBoundingClientRect();
    const bRect = brand?.getBoundingClientRect();

    const navLinks = Array.from(sidebar?.querySelectorAll('nav a') || []).map(a => {
      const rect = a.getBoundingClientRect();
      return {
        href: a.getAttribute('href'),
        text: a.innerText.trim(),
        width: rect.width,
        height: rect.height,
        scrollWidth: a.scrollWidth,
        clientWidth: a.clientWidth,
        isOverflowing: a.scrollWidth > a.clientWidth
      };
    });

    return {
      sidebarWidth: sRect?.width,
      brandHeight: bRect?.height,
      topbarHeight: hRect?.height,
      navLinks
    };
  });
  console.log('1920x1080 Expanded Info:', JSON.stringify(expanded1920Info, null, 2));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '1920x1080_expanded.png') });

  // Full page overview screenshot
  console.log('3. Capturing overview_fullpage_expanded.png...');
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'overview_fullpage_expanded.png'),
    fullPage: false // Executive viewport screenshot
  });

  // VIEWPORT 2: 1440x900 Expanded
  console.log('4. Testing Viewport: 1440x900 (Desktop Expanded)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/cases', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const expanded1440Info = await page.evaluate(() => {
    const sidebar = document.querySelector('#app-sidebar');
    const sRect = sidebar?.getBoundingClientRect();
    const subLinks = Array.from(sidebar?.querySelectorAll('nav a') || []).map(a => ({
      href: a.getAttribute('href'),
      text: a.innerText.trim()
    }));
    return {
      sidebarWidth: sRect?.width,
      subLinks
    };
  });
  console.log('1440x900 Expanded (on /cases with sub-navigation):', JSON.stringify(expanded1440Info, null, 2));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '1440x900_expanded.png') });

  // VIEWPORT 3: 1366x768 Expanded
  console.log('5. Testing Viewport: 1366x768 (Desktop Expanded)...');
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://localhost:3000/overview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '1366x768_expanded.png') });

  // VIEWPORT 4: 1440x900 Collapsed
  console.log('6. Testing Viewport: 1440x900 (Desktop Collapsed)...');
  await page.setViewport({ width: 1440, height: 900 });
  
  // Click collapse button
  const collapseBtn = await page.$('button[aria-label="Collapse sidebar"]');
  if (collapseBtn) {
    await collapseBtn.click();
  } else {
    // If already collapsed or using shortcut
    await page.keyboard.press('[');
  }
  await new Promise(r => setTimeout(r, 800));

  const collapsedInfo = await page.evaluate(() => {
    const sidebar = document.querySelector('#app-sidebar');
    const sRect = sidebar?.getBoundingClientRect();
    const navLinks = Array.from(sidebar?.querySelectorAll('nav a') || []).map(a => {
      const rect = a.getBoundingClientRect();
      return {
        href: a.getAttribute('href'),
        text: a.innerText.trim(),
        width: rect.width,
        height: rect.height,
        left: rect.left - (sRect?.left || 0)
      };
    });

    const footerButtons = Array.from(sidebar?.querySelectorAll('div:last-child button, div:last-child div[role="button"]') || []).map(b => {
      const rect = b.getBoundingClientRect();
      return {
        label: b.getAttribute('aria-label'),
        width: rect.width,
        height: rect.height,
        left: rect.left - (sRect?.left || 0)
      };
    });

    return {
      sidebarWidth: sRect?.width,
      innerText: sidebar?.innerText,
      navLinks,
      footerButtons
    };
  });
  console.log('1440x900 Collapsed Info:', JSON.stringify(collapsedInfo, null, 2));

  // Hover over the third item (Investigations) to verify tooltip
  const thirdIcon = (await page.$$('#app-sidebar nav a'))[2];
  if (thirdIcon) {
    await thirdIcon.hover();
    await new Promise(r => setTimeout(r, 300));
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '1440x900_collapsed.png') });

  // VIEWPORT 5: 390x844 Mobile Drawer
  console.log('7. Testing Viewport: 390x844 (Mobile Drawer)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/overview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Tap "More" button on bottom navigation
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const moreBtn = btns.find(b => b.innerText.includes('More') || b.getAttribute('aria-label')?.includes('full workspace'));
    if (moreBtn) moreBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const mobileInfo = await page.evaluate(() => {
    const drawer = document.querySelector('div[role="dialog"][aria-label="Navigation drawer"]');
    const rect = drawer?.getBoundingClientRect();
    return {
      isOpen: Boolean(drawer),
      drawerWidth: rect?.width,
      drawerVisible: rect && rect.left >= 0
    };
  });
  console.log('Mobile Drawer Info:', JSON.stringify(mobileInfo, null, 2));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '390x844_mobile_drawer.png') });

  // Save report data
  const reportData = {
    expanded1920: expanded1920Info,
    expanded1440: expanded1440Info,
    collapsed1440: collapsedInfo,
    mobileDrawer: mobileInfo,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, '../audit_reports/sidebar_verification_results.json'),
    JSON.stringify(reportData, null, 2)
  );

  console.log('--- VERIFICATION COMPLETE ---');
  await browser.close();
}

runVerification().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
