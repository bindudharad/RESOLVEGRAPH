import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/Bindudhara D/.gemini/antigravity/brain/3ecb247a-bcdc-49f8-bca9-86d45ad068d8';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE_URL = 'http://localhost:3000';

async function loginViaApi(email: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE_URL,
    },
    body: JSON.stringify({ email, password: pass }),
  });
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error(`No cookie for ${email}`);
  const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
  if (!match) throw new Error(`session_token not found for ${email}`);
  return match[1];
}

async function capture() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  try {
    const adminToken = await loginViaApi('admin@resolvegraph.demo', 'Admin@ResolveGraph2026!');
    const techStoreToken = await loginViaApi('disputes@techstore.demo', 'Merchant@TechStore2026!');
    const digitalMartToken = await loginViaApi('support@digitalmart.demo', 'Merchant@DigitalMart2026!');

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1.5 });

    // SCREENSHOT 1: Platform Workspace - Cases -> RG-1001 -> Seller Outreach
    console.log('Navigating to Platform Case RG-1001 Seller Outreach...');
    await page.setCookie({
      name: 'better-auth.session_token',
      value: adminToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    });

    await page.goto(`${BASE_URL}/cases/RG-1001`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    // Click on "Seller Outreach" tab if available
    const tabs = await page.$$('button');
    for (const tab of tabs) {
      const text = await page.evaluate((el) => el.textContent, tab);
      if (text && text.includes('Seller Outreach')) {
        await tab.click();
        await new Promise((r) => setTimeout(r, 1500));
        break;
      }
    }

    const file1 = path.join(ARTIFACT_DIR, '01-platform-seller-outreach-overview.png');
    await page.screenshot({ path: file1, fullPage: false });
    console.log('Saved:', file1);

    // SCREENSHOT 2: Open "Create Evidence Request (Demo)" Modal
    console.log('Opening Create Evidence Request Modal...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Create Evidence Request')) {
        await btn.click();
        await new Promise((r) => setTimeout(r, 1000));
        break;
      }
    }

    const file2 = path.join(ARTIFACT_DIR, '02-platform-create-request-modal.png');
    await page.screenshot({ path: file2, fullPage: false });
    console.log('Saved:', file2);

    // Close modal
    const closeBtn = await page.$('button[class*="hover:bg-surface-2"]');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise((r) => setTimeout(r, 500));
    }

    // SCREENSHOT 3: Seller Workspace - Evidence Requests (/seller/requests) as TechStore
    console.log('Switching to TechStore Seller Workspace...');
    await page.setCookie({
      name: 'better-auth.session_token',
      value: techStoreToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    });

    await page.goto(`${BASE_URL}/seller/requests`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    const file3 = path.join(ARTIFACT_DIR, '03-seller-requests-inbox.png');
    await page.screenshot({ path: file3, fullPage: false });
    console.log('Saved:', file3);

    // SCREENSHOT 4: Open Notification Panel in Seller Workspace
    console.log('Opening Notification Panel in Seller Workspace...');
    const notifBtn = await page.$('button[aria-label*="notification" i], button:has(svg.lucide-bell)');
    if (notifBtn) {
      await notifBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
    }

    const file4 = path.join(ARTIFACT_DIR, '04-seller-notifications.png');
    await page.screenshot({ path: file4, fullPage: false });
    console.log('Saved:', file4);

    // Close notification dropdown by clicking background or body
    await page.mouse.click(10, 10);
    await new Promise((r) => setTimeout(r, 500));

    // SCREENSHOT 5: Open Request Detail View as Seller (/seller/requests/[latestId])
    console.log('Opening Request Detail View as TechStore Seller...');
    // Click on "View Request" or "Respond to Request" link
    const requestLink = await page.$('a[href^="/seller/requests/cmw"]');
    if (requestLink) {
      await requestLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
    }

    const file5 = path.join(ARTIFACT_DIR, '05-seller-request-detail-view.png');
    await page.screenshot({ path: file5, fullPage: false });
    console.log('Saved:', file5);

    // SCREENSHOT 6: Seller Workspace - Submitted Responses (/seller/responses)
    console.log('Navigating to TechStore Submitted Responses...');
    await page.goto(`${BASE_URL}/seller/responses`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    const file6 = path.join(ARTIFACT_DIR, '06-seller-submitted-responses.png');
    await page.screenshot({ path: file6, fullPage: false });
    console.log('Saved:', file6);

    // SCREENSHOT 7: Platform Workspace - Response Received & Synchronized
    console.log('Navigating back to Platform Workspace to inspect received response...');
    await page.setCookie({
      name: 'better-auth.session_token',
      value: adminToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    });

    await page.goto(`${BASE_URL}/cases/RG-1001`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    const outreachTabs = await page.$$('button');
    for (const tab of outreachTabs) {
      const text = await page.evaluate((el) => el.textContent, tab);
      if (text && text.includes('Seller Outreach')) {
        await tab.click();
        await new Promise((r) => setTimeout(r, 1500));
        break;
      }
    }

    // Scroll down to show Seller Responses section
    await page.evaluate(() => window.scrollBy(0, 600));
    await new Promise((r) => setTimeout(r, 800));

    const file7 = path.join(ARTIFACT_DIR, '07-platform-response-received.png');
    await page.screenshot({ path: file7, fullPage: false });
    console.log('Saved:', file7);

    // SCREENSHOT 8: DigitalMart Tenant-Isolation Verification (Accessing TechStore Request -> 403 Forbidden)
    console.log('Testing DigitalMart Tenant Isolation...');
    await page.setCookie({
      name: 'better-auth.session_token',
      value: digitalMartToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    });

    // Extract the request ID that TechStore was on
    const techStoreReqId = 'cmwdsunv300cr14vjkpa9kdbg';
    await page.goto(`${BASE_URL}/seller/requests/${techStoreReqId}`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    const file8 = path.join(ARTIFACT_DIR, '08-tenant-isolation-digitalmart.png');
    await page.screenshot({ path: file8, fullPage: false });
    console.log('Saved:', file8);

    console.log('\nAll 8 screenshots successfully captured and saved to artifact directory!');
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
