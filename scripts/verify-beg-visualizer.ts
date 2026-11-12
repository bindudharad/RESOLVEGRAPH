import puppeteer from 'puppeteer-core';
import * as path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testBeg() {
  console.log('Launching Chrome via puppeteer-core to test RG-1001 BEG visualizer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });

    // Login as platform admin
    await page.goto('http://localhost:3000/sign-in', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: 'PLATFORM' }),
      });
    });

    const start = Date.now();
    console.log('Navigating to http://localhost:3000/cases/RG-1001?tab=evidence_beg ...');
    await page.goto('http://localhost:3000/cases/RG-1001?tab=evidence_beg', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log(`Page DOM loaded in ${Date.now() - start} ms`);

    // Wait 4s for Cytoscape / BEG canvas rendering
    await new Promise((r) => setTimeout(r, 4000));

    const shotPath = path.resolve(process.cwd(), 'public/screenshots/rg1001_beg_visualizer.png');
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot to: ${shotPath}`);

    // Verify canvas or graph container is present
    const checkResult = await page.evaluate(() => {
      const canvas = document.querySelectorAll('canvas');
      const bodyText = document.body.innerText;
      return {
        canvasCount: canvas.length,
        hasBegText: bodyText.includes('Bilateral Evidence Graph') || bodyText.includes('Evidence') || bodyText.includes('Graph'),
        hasCaseNumber: bodyText.includes('RG-1001'),
        url: window.location.href,
      };
    });

    console.log('BEG rendering check:', checkResult);
  } finally {
    await browser.close();
  }
}

testBeg().catch((err) => {
  console.error('BEG test failed:', err);
  process.exit(1);
});
