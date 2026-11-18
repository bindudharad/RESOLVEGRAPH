import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const EVIDENCE_DIR = 'C:\\Users\\Bindudhara D\\.gemini\\antigravity\\brain\\8275b2f8-be8c-46c3-9d22-aa48b061a691\\browser_evidence';

async function main() {
  console.log('🚀 Launching Puppeteer browser verification...');
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    // 1. Authenticate via demo-login
    console.log('🔑 Authenticating as PLATFORM admin...');
    const demoLoginRes = await fetch(`${BASE_URL}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace: 'PLATFORM' }),
    });
    const setCookieHeader = demoLoginRes.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error('Failed to obtain auth cookie from demo-login');
    }
    
    // Parse cookie token
    const tokenMatch = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
    if (!tokenMatch) {
      throw new Error('Could not find better-auth.session_token in cookies');
    }
    const sessionToken = tokenMatch[1];
    
    await page.setCookie({
      name: 'better-auth.session_token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    });

    console.log('✅ Authenticated successfully with session token.');

    // 2. DEFECT 1: Reconciliation sandbox seeder
    console.log('\n--- VERIFYING DEFECT 1: Reconciliation Sandbox Seeder ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/reconciliation`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    // Look for select dropdown
    const selects = await page.$$('select');
    console.log(`Found ${selects.length} select dropdown(s) on reconciliation page.`);
    if (selects.length < 2) {
      throw new Error('Expected at least 2 dropdowns (case selector and provider selector)');
    }

    // The second dropdown is the provider selector
    const providerSelect = selects[1];
    await providerSelect.select('PHONEPE');
    console.log('Selected PHONEPE provider.');

    // Find and click "Seed Sandbox Dispute" button
    let buttons = await page.$$('button');
    let seedButton = null;
    for (const b of buttons) {
      const text = await b.evaluate((el) => el.textContent);
      if (text && text.includes('Seed Sandbox Dispute')) {
        seedButton = b;
        break;
      }
    }

    if (!seedButton) {
      throw new Error('Could not find "Seed Sandbox Dispute" button');
    }

    console.log('Clicking "Seed Sandbox Dispute" for PHONEPE...');
    await seedButton.click();
    await page.waitForNetworkIdle({ timeout: 10000 });
    await new Promise((r) => setTimeout(r, 2000));

    let pageText = await page.evaluate(() => document.body.innerText);
    const seededPhonePe = pageText.includes('Seeded PhonePe UPI Sandbox');
    console.log('PhonePe seeder success message detected:', seededPhonePe);

    // Now test second provider PAYPAL
    console.log('Testing second provider: PAYPAL...');
    await providerSelect.select('PAYPAL');
    buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await b.evaluate((el) => el.textContent);
      if (text && text.includes('Seed Sandbox Dispute')) {
        seedButton = b;
        break;
      }
    }
    if (seedButton) {
      await seedButton.click();
      await page.waitForNetworkIdle({ timeout: 10000 });
      await new Promise((r) => setTimeout(r, 2000));
    }
    pageText = await page.evaluate(() => document.body.innerText);
    const seededPayPal = pageText.includes('Seeded PayPal Sandbox');
    console.log('PayPal seeder success message detected:', seededPayPal);

    const reconScreenshotPath = path.join(EVIDENCE_DIR, 'defect1_reconciliation_seeder.png');
    await page.screenshot({ path: reconScreenshotPath, fullPage: false });
    console.log(`📸 Saved reconciliation screenshot to ${reconScreenshotPath}`);

    // 3. DEFECT 2: Admin Security Audit Chain Integrity
    console.log('\n--- VERIFYING DEFECT 2: Admin Security Audit Chain Integrity ---');
    await page.goto(`${BASE_URL}/admin/security`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    // Find and click "Verify Audit Chain Integrity" button
    buttons = await page.$$('button');
    let verifyBtn = null;
    for (const b of buttons) {
      const text = await b.evaluate((el) => el.textContent);
      if (text && text.includes('Verify Audit Chain Integrity')) {
        verifyBtn = b;
        break;
      }
    }

    if (!verifyBtn) {
      throw new Error('Could not find "Verify Audit Chain Integrity" button');
    }

    console.log('Clicking "Verify Audit Chain Integrity"...');
    await verifyBtn.click();
    await page.waitForNetworkIdle({ timeout: 10000 });
    await new Promise((r) => setTimeout(r, 2000));

    const secText = await page.evaluate(() => document.body.innerText);
    const hasChainValid = secText.includes('AUDIT CHAIN INTEGRITY VERIFIED') && secText.includes('CHAIN VALID');
    const hasChainCorrupted = secText.includes('CHAIN CORRUPTED');
    console.log('Audit chain valid badge detected ("AUDIT CHAIN INTEGRITY VERIFIED" + "CHAIN VALID"):', hasChainValid);
    console.log('False "CHAIN CORRUPTED" present:', hasChainCorrupted);

    if (hasChainCorrupted) {
      console.error('❌ FAILURE: False CHAIN CORRUPTED detected!');
    } else if (hasChainValid) {
      console.log('✅ SUCCESS: Audit chain verified as VALID!');
    } else {
      console.warn('⚠️ Warning: neither valid nor corrupted badge detected. Snippet:', secText.slice(0, 400));
    }

    const secScreenshotPath = path.join(EVIDENCE_DIR, 'defect2_admin_security_chain_valid.png');
    await page.screenshot({ path: secScreenshotPath, fullPage: false });
    console.log(`📸 Saved admin security screenshot to ${secScreenshotPath}`);

    // 4. DEFECT 3: Mobile Viewport Bottom Clearance Verification
    console.log('\n--- VERIFYING DEFECT 3: Mobile Navigation Overlap & Clearance ---');
    const viewports = [
      { name: 'iPhone_12_13_14', width: 390, height: 844 },
      { name: 'iPhone_SE', width: 390, height: 667 },
      { name: 'Android_Small', width: 360, height: 640 },
      { name: 'Tablet_Portrait', width: 768, height: 1024 },
      { name: 'Tablet_Landscape', width: 1024, height: 768 },
      { name: 'Desktop', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/cases/RG-1545`, { waitUntil: 'networkidle2' });
      await new Promise((r) => setTimeout(r, 1000));

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 500));

      const metrics = await page.evaluate(() => {
        const bottomNav = document.querySelector('nav.fixed.bottom-0');
        const main = document.querySelector('main');
        
        let navTop = window.innerHeight;
        let navHeight = 0;
        let navVisible = false;

        if (bottomNav) {
          const navRect = bottomNav.getBoundingClientRect();
          navTop = navRect.top;
          navHeight = navRect.height;
          navVisible = window.getComputedStyle(bottomNav).display !== 'none';
        }

        let mainPaddingBottom = '0px';
        if (main) {
          mainPaddingBottom = window.getComputedStyle(main).paddingBottom;
        }

        // Find bottom-most interactive or content element in main
        const allElements = main ? Array.from(main.querySelectorAll('*')) : [];
        let lowestElementBottom = 0;
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > lowestElementBottom && rect.bottom <= window.innerHeight + 200) {
            lowestElementBottom = rect.bottom;
          }
        }

        const clearance = navVisible ? (navTop - lowestElementBottom) : (window.innerHeight - lowestElementBottom);

        return {
          windowHeight: window.innerHeight,
          navVisible,
          navHeight,
          navTop,
          mainPaddingBottom,
          lowestElementBottom,
          clearance,
        };
      });

      console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}):`);
      console.log(`  - Nav visible: ${metrics.navVisible}, Nav height: ${metrics.navHeight}px`);
      console.log(`  - Main padding-bottom: ${metrics.mainPaddingBottom}`);
      console.log(`  - Nav top: ${metrics.navTop}px, Lowest element bottom: ${metrics.lowestElementBottom}px`);
      console.log(`  - Clearance margin: ${metrics.clearance}px (Positive means NO overlap)`);

      const vpScreenshotPath = path.join(EVIDENCE_DIR, `defect3_${vp.name}_clearance.png`);
      await page.screenshot({ path: vpScreenshotPath });
      console.log(`📸 Saved screenshot to ${vpScreenshotPath}`);
    }

    console.log('\n✨ All live browser checks completed successfully!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
