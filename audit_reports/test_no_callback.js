const puppeteer = require('puppeteer-core');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function testSignInWithoutCallbackUrl() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });

  // Test what Better-Auth client does when callbackURL is omitted vs included
  const result = await page.evaluate(async () => {
    // We can call /api/auth/sign-in/email directly or check better-auth client behavior
    const res = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex.morgan@consumer.demo',
        password: 'Buyer@ResolveGraph2026!',
      }),
    });
    return await res.json();
  });

  console.log("Direct API response:", result);
  await browser.close();
}

testSignInWithoutCallbackUrl();
