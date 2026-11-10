const puppeteer = require('puppeteer-core');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function testGetSession() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });

  // Test getSession endpoint directly
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/auth/get-session');
    return { status: r.status, json: await r.json() };
  });

  console.log('Get-session before login:', res);
  await browser.close();
}

testGetSession();
