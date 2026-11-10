const puppeteer = require('puppeteer-core');
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function checkSignInOptions() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });

  const info = await page.evaluate(async () => {
    // Check if better-auth redirects automatically
    return window.location.href;
  });

  console.log("Current url:", info);
  await browser.close();
}

checkSignInOptions();
