const puppeteer = require('puppeteer-core');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function testAuthClientResponse() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });

  // Evaluate signIn in the browser context
  const result = await page.evaluate(async () => {
    // import signIn from auth-client by triggering a fetch or inspecting window
    const response = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@resolvegraph.demo',
        password: 'Admin@ResolveGraph2026!',
      }),
    });
    const json = await response.json();
    return json;
  });

  console.log('API Response in browser:', JSON.stringify(result, null, 2));
  await browser.close();
}

testAuthClientResponse();
