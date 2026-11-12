import puppeteer from 'puppeteer-core';
import * as path from 'path';
import * as fs from 'fs/promises';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.resolve(process.cwd(), 'public/screenshots/ui-qa');

const VIEWPORTS = {
  desktop: { width: 1440, height: 960 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runVisualQA() {
  console.log('Starting RESOLVEGRAPH Visual QA & Multi-Device Screenshot Capture...');
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // -------------------------------------------------------------------------
    // 1. PUBLIC HOMEPAGE (Desktop, Tablet, Mobile)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. PUBLIC HOMEPAGE ---');
    for (const [device, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewport(vp);
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await sleep(2500);
      const shotPath = path.join(OUT_DIR, `01_homepage_${device}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`Saved: 01_homepage_${device}.png (${vp.width}x${vp.height})`);
    }

    // -------------------------------------------------------------------------
    // 2. AUTHENTICATION PAGES (Sign-In & Sign-Up)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. AUTHENTICATION SCREENS ---');
    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '02_sign_in_desktop.png') });
    console.log('Saved: 02_sign_in_desktop.png');

    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '02_sign_in_mobile.png') });
    console.log('Saved: 02_sign_in_mobile.png');

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/sign-up`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '02_sign_up_desktop.png') });
    console.log('Saved: 02_sign_up_desktop.png');

    // -------------------------------------------------------------------------
    // 3. CUSTOMER WORKSPACE: INTAKE WIZARD & COMPLAINT TRACKING
    // -------------------------------------------------------------------------
    console.log('\n--- 3. CUSTOMER WORKSPACE ---');
    // Login as Customer Alex Morgan
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: 'BUYER' }),
      });
    });
    await sleep(1500);

    // Intake Step 1 (Desktop, Tablet, Mobile)
    for (const [device, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewport(vp);
      await page.goto(`${BASE_URL}/intake`, { waitUntil: 'domcontentloaded' });
      await sleep(2500);
      const shotPath = path.join(OUT_DIR, `03_customer_intake_${device}.png`);
      await page.screenshot({ path: shotPath });
      console.log(`Saved: 03_customer_intake_${device}.png`);
    }

    // Customer Case Detail: RG-1465 (Replacement Completed)
    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/cases/RG-1465`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '03_customer_case_rg1465_desktop.png') });
    console.log('Saved: 03_customer_case_rg1465_desktop.png');

    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/cases/RG-1465`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '03_customer_case_rg1465_mobile.png') });
    console.log('Saved: 03_customer_case_rg1465_mobile.png');

    // Customer Case Detail: RG-1462 (Flipkart Help Centre Fallback)
    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/cases/RG-1462`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '03_customer_case_rg1462_helpcentre_desktop.png') });
    console.log('Saved: 03_customer_case_rg1462_helpcentre_desktop.png');

    // -------------------------------------------------------------------------
    // 4. PLATFORM WORKSPACE: OVERVIEW, CASES & BEG / BERR
    // -------------------------------------------------------------------------
    console.log('\n--- 4. PLATFORM WORKSPACE ---');
    // Login as Platform Admin Priya Raghavan
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: 'PLATFORM' }),
      });
    });
    await sleep(1500);

    // Overview Dashboard (Desktop, Tablet, Mobile)
    for (const [device, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewport(vp);
      await page.goto(`${BASE_URL}/overview`, { waitUntil: 'domcontentloaded' });
      await sleep(2500);
      const shotPath = path.join(OUT_DIR, `04_platform_overview_${device}.png`);
      await page.screenshot({ path: shotPath });
      console.log(`Saved: 04_platform_overview_${device}.png`);
    }

    // Platform Cases Roster
    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/cases`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '04_platform_cases_roster_desktop.png') });
    console.log('Saved: 04_platform_cases_roster_desktop.png');

    // Platform Case Dossier Overview: RG-1001
    await page.goto(`${BASE_URL}/cases/RG-1001`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '04_platform_case_rg1001_overview.png') });
    console.log('Saved: 04_platform_case_rg1001_overview.png');

    // Platform Case Dossier: BEG Visualizer
    await page.goto(`${BASE_URL}/cases/RG-1001?tab=evidence_beg`, { waitUntil: 'domcontentloaded' });
    await sleep(3500);
    await page.screenshot({ path: path.join(OUT_DIR, '04_platform_case_rg1001_beg_graph.png') });
    console.log('Saved: 04_platform_case_rg1001_beg_graph.png');

    // Platform Case Dossier: BERR Matrix
    await page.goto(`${BASE_URL}/cases/RG-1001?tab=berr`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '04_platform_case_rg1001_berr_matrix.png') });
    console.log('Saved: 04_platform_case_rg1001_berr_matrix.png');

    // Platform Case Dossier: Seller Outreach (RG-1465)
    await page.goto(`${BASE_URL}/cases/RG-1465?tab=seller_outreach`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '04_platform_case_rg1465_seller_outreach.png') });
    console.log('Saved: 04_platform_case_rg1465_seller_outreach.png');

    // Platform Case Dossier: Resolution & Fulfillment (RG-1465)
    await page.goto(`${BASE_URL}/cases/RG-1465?tab=resolution`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '04_platform_case_rg1465_resolution.png') });
    console.log('Saved: 04_platform_case_rg1465_resolution.png');

    // -------------------------------------------------------------------------
    // 5. SELLER WORKSPACE: DASHBOARD, REQUESTS & RESPONSES
    // -------------------------------------------------------------------------
    console.log('\n--- 5. SELLER WORKSPACE ---');
    // Login as Merchant DigitalMart
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'support@digitalmart.demo',
          password: 'Merchant@DigitalMart2026!',
        }),
      });
    });
    await sleep(1500);

    // Seller Dashboard (Desktop & Mobile)
    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/seller`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '05_seller_dashboard_desktop.png') });
    console.log('Saved: 05_seller_dashboard_desktop.png');

    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/seller`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '05_seller_dashboard_mobile.png') });
    console.log('Saved: 05_seller_dashboard_mobile.png');

    // Seller Evidence Requests Table
    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/seller/requests`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '05_seller_requests_table_desktop.png') });
    console.log('Saved: 05_seller_requests_table_desktop.png');

    // Seller Submitted Responses History
    await page.goto(`${BASE_URL}/seller/responses`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, '05_seller_responses_history_desktop.png') });
    console.log('Saved: 05_seller_responses_history_desktop.png');

    console.log('\nVisual QA capture completed successfully!');
  } finally {
    await browser.close();
  }
}

runVisualQA().catch((err) => {
  console.error('Visual QA capture failed:', err);
  process.exit(1);
});
