const puppeteer = require('puppeteer-core');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function testSignInEmailClient() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });

  // Fill in form and submit
  await page.type('#email', 'admin@resolvegraph.demo');
  await page.type('#password', 'Admin@ResolveGraph2026!');

  // Intercept the request to /api/auth/sign-in/email
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/auth/sign-in/email')),
    page.click('button[type="submit"]'),
  ]);

  const json = await response.json();
  console.log('SignIn Response status:', response.status());
  console.log('SignIn Response User:', json.user);

  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  console.log('Current URL after login:', page.url());

  await browser.close();
}

testSignInEmailClient();
