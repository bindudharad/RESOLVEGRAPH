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
  const bounds = await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]');
    const footer = document.querySelector('footer');
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    return {
      windowHeight: window.innerHeight,
      headerBottom: header ? header.getBoundingClientRect().bottom : null,
      submitBtnBottom: btn ? btn.getBoundingClientRect().bottom : null,
      mainBottom: main ? main.getBoundingClientRect().bottom : null,
      footerBottom: footer ? footer.getBoundingClientRect().bottom : null,
    };
  });
  console.log('Bounding boxes on 360x740:', bounds);
  await browser.close();
})();
