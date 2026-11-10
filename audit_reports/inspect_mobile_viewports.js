const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";

const MOBILE_VIEWPORTS = [
  { name: '430x932', width: 430, height: 932, type: 'iPhone 15 Pro Max' },
  { name: '390x844', width: 390, height: 844, type: 'iPhone 14 / 15' },
  { name: '375x812', width: 375, height: 812, type: 'iPhone Mini / SE' },
  { name: '360x740', width: 360, height: 740, type: 'Android Small' },
];

async function inspectMobile() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('================================================================');
  console.log('DIAGNOSING MOBILE VIEWPORTS & KEYBOARD SIMULATION');
  console.log('================================================================');

  for (const vp of MOBILE_VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const check = await page.evaluate((vpInfo) => {
      const doc = document.documentElement;
      const emailInput = document.querySelector('#email');
      const passInput = document.querySelector('#password');
      const submitBtn = document.querySelector('button[type="submit"]');
      const footer = document.querySelector('footer');

      const emailRect = emailInput ? emailInput.getBoundingClientRect() : null;
      const passRect = passInput ? passInput.getBoundingClientRect() : null;
      const submitRect = submitBtn ? submitBtn.getBoundingClientRect() : null;
      const footerRect = footer ? footer.getBoundingClientRect() : null;

      return {
        docHeight: doc.scrollHeight,
        docWidth: doc.scrollWidth,
        clientHeight: doc.clientHeight,
        clientWidth: doc.clientWidth,
        hasHorizontalOverflow: doc.scrollWidth > window.innerWidth,
        canScrollVertically: doc.scrollHeight > doc.clientHeight,
        submitVisible: submitRect ? submitRect.bottom <= doc.clientHeight : false,
        elements: {
          emailTop: emailRect ? Math.round(emailRect.top) : null,
          passTop: passRect ? Math.round(passRect.top) : null,
          submitBottom: submitRect ? Math.round(submitRect.bottom) : null,
          footerBottom: footerRect ? Math.round(footerRect.bottom) : null,
        }
      };
    }, vp);

    console.log(`\n--- Mobile Viewport: ${vp.name} (${vp.width}x${vp.height} - ${vp.type}) ---`);
    console.log(`Doc scrollHeight: ${check.docHeight}px | clientHeight: ${check.clientHeight}px`);
    console.log(`Horizontal overflow: ${check.docWidth - vp.width}px (hasOverflow: ${check.hasHorizontalOverflow})`);
    console.log(`Elements bounds: emailTop=${check.elements.emailTop}px, passTop=${check.elements.passTop}px, submitBottom=${check.elements.submitBottom}px, footerBottom=${check.elements.footerBottom}px`);
    console.log(`Submit button visible initially without scroll: ${check.submitVisible}`);

    // Simulate on-screen keyboard opening (viewport height shrinks to 420px)
    await page.setViewport({ width: vp.width, height: 420 });
    await page.focus('#password');
    const scrollAfterFocus = await page.evaluate(() => {
      const pass = document.querySelector('#password');
      pass.scrollIntoView({ block: 'center' });
      const rect = pass.getBoundingClientRect();
      const btn = document.querySelector('button[type="submit"]');
      const btnRect = btn.getBoundingClientRect();
      return {
        passTopInView: rect.top >= 0 && rect.bottom <= window.innerHeight,
        passRectTop: Math.round(rect.top),
        passRectBottom: Math.round(rect.bottom),
        btnRectTop: Math.round(btnRect.top),
        btnRectBottom: Math.round(btnRect.bottom),
        docScrollHeight: document.documentElement.scrollHeight,
      };
    });

    console.log(`Keyboard Simulated (height=420px): password in view=${scrollAfterFocus.passTopInView} (top=${scrollAfterFocus.passRectTop}px, bottom=${scrollAfterFocus.passRectBottom}px), docScrollHeight=${scrollAfterFocus.docScrollHeight}px`);
  }

  await browser.close();
}

inspectMobile();
