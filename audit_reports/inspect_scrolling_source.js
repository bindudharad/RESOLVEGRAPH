const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";

const DESKTOP_VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1600x900', width: 1600, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

async function inspectScrolling() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('================================================================');
  console.log('DIAGNOSING SCROLLING SOURCES ACROSS DESKTOP RESOLUTIONS');
  console.log('================================================================');

  for (const vp of DESKTOP_VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    const analysis = await page.evaluate(() => {
      const getElementMetrics = (el, name) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          name,
          tag: el.tagName.toLowerCase(),
          className: el.className || '',
          rect: {
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          computed: {
            marginTop: style.marginTop,
            marginBottom: style.marginBottom,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            overflowY: style.overflowY,
            height: style.height,
            minHeight: style.minHeight,
            maxHeight: style.maxHeight,
          }
        };
      };

      const doc = document.documentElement;
      const body = document.body;
      const rootDiv = document.querySelector('div.min-h-screen');
      const header = document.querySelector('header');
      const main = document.querySelector('main');
      const maxLgDiv = main ? main.querySelector('div') : null;
      const formContainer = maxLgDiv ? maxLgDiv.querySelector('div') : null;
      const editorialHeader = formContainer ? formContainer.children[0] : null;
      const roleCategories = formContainer ? formContainer.children[1] : null;
      const formCard = formContainer ? formContainer.children[2] : null;
      const footerNav = formContainer ? formContainer.children[3] : null;
      const footer = document.querySelector('footer');

      // Find all elements that overflow window.innerHeight
      const allElements = Array.from(document.querySelectorAll('*'));
      const overflowingElements = [];
      allElements.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom > window.innerHeight) {
          overflowingElements.push({
            tag: el.tagName.toLowerCase(),
            class: (el.className || '').toString().slice(0, 60),
            bottom: Math.round(r.bottom),
            height: Math.round(r.height),
          });
        }
      });

      return {
        window: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
        },
        document: {
          scrollHeight: doc.scrollHeight,
          scrollWidth: doc.scrollWidth,
          clientHeight: doc.clientHeight,
          clientWidth: doc.clientWidth,
        },
        body: {
          scrollHeight: body.scrollHeight,
          scrollWidth: body.scrollWidth,
        },
        hasVerticalOverflow: doc.scrollHeight > window.innerHeight,
        verticalOverflowPx: Math.max(0, doc.scrollHeight - window.innerHeight),
        hasHorizontalOverflow: doc.scrollWidth > window.innerWidth,
        horizontalOverflowPx: Math.max(0, doc.scrollWidth - window.innerWidth),
        hierarchy: [
          getElementMetrics(rootDiv, 'Root Layout Div'),
          getElementMetrics(header, 'Header'),
          getElementMetrics(main, 'Main Container'),
          getElementMetrics(maxLgDiv, 'Main Inner Div (max-w-lg)'),
          getElementMetrics(formContainer, 'Form Container'),
          getElementMetrics(editorialHeader, 'Editorial Header'),
          getElementMetrics(roleCategories, 'Role Categories'),
          getElementMetrics(formCard, 'Form Card'),
          getElementMetrics(footerNav, 'Footer Nav Links'),
          getElementMetrics(footer, 'Layout Footer'),
        ],
        deepestOverflowingElement: overflowingElements.sort((a, b) => b.bottom - a.bottom)[0] || null,
      };
    });

    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    console.log(`Window: ${analysis.window.innerWidth}x${analysis.window.innerHeight}`);
    console.log(`Doc scrollHeight: ${analysis.document.scrollHeight}px | clientHeight: ${analysis.document.clientHeight}px`);
    console.log(`Vertical overflow: ${analysis.verticalOverflowPx}px (hasOverflow: ${analysis.hasVerticalOverflow})`);
    console.log(`Horizontal overflow: ${analysis.horizontalOverflowPx}px`);

    console.log('\nBreakdown of Hierarchy Heights & Bounds:');
    analysis.hierarchy.forEach(item => {
      if (item) {
        console.log(`  ${item.name.padEnd(28)}: top=${item.rect.top}px, bottom=${item.rect.bottom}px, height=${item.rect.height}px (padding: ${item.computed.paddingTop}/${item.computed.paddingBottom}, margin: ${item.computed.marginTop}/${item.computed.marginBottom})`);
      }
    });

    if (analysis.deepestOverflowingElement) {
      console.log(`Deepest overflowing element: <${analysis.deepestOverflowingElement.tag} class="${analysis.deepestOverflowingElement.class}"> extending to bottom=${analysis.deepestOverflowingElement.bottom}px`);
    }
  }

  await browser.close();
}

inspectScrolling();
