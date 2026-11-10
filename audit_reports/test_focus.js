const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 740 });
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });
  await page.focus('#email');
  const activeId = await page.evaluate(() => document.activeElement.id);
  console.log('Focused element id:', activeId);
  await page.type('#email', 'admin@resolvegraph.demo');
  const val = await page.$eval('#email', el => el.value);
  console.log('Typed value:', val);
  await page.focus('#password');
  const activePass = await page.evaluate(() => document.activeElement.id);
  console.log('Focused password id:', activePass);
  await browser.close();
})();
