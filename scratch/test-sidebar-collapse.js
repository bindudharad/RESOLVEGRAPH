/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer-core');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Enter Platform'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.goto('http://localhost:3000/overview', { waitUntil: 'networkidle2' });
  
  // Click collapse button
  await page.click('button[aria-label="Collapse sidebar"]');
  await new Promise(r => setTimeout(r, 800));
  
  const collapsedInfo = await page.evaluate(() => {
    const el = document.querySelector('#app-sidebar');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const links = Array.from(el.querySelectorAll('a')).map(a => ({
      href: a.getAttribute('href'),
      text: a.innerText,
      width: a.getBoundingClientRect().width,
      height: a.getBoundingClientRect().height
    }));
    return {
      width: rect.width,
      classList: Array.from(el.classList),
      innerText: el.innerText,
      links
    };
  });
  console.log('COLLAPSED STATE INFO:');
  console.log(JSON.stringify(collapsedInfo, null, 2));
  await page.screenshot({ path: 'scratch/collapsed-test.png' });
  await browser.close();
}

test();
