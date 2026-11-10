const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET_URL = process.env.AUDIT_URL || "http://localhost:3000/";
const OUT_DIR = path.join(__dirname, "../qa/screenshots");

const VIEWPORTS = [
  { name: "desktop-1920x1080", width: 1920, height: 1080 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "laptop-1366x768", width: 1366, height: 768 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "mobile-360x740", width: 360, height: 740, isMobile: true, hasTouch: true },
];

async function captureScreenshots(prefix = "before") {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log(`Starting screenshot capture for ${prefix} across 6 viewports...`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader-webgl",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: Boolean(vp.isMobile),
        hasTouch: Boolean(vp.hasTouch),
      });

      console.log(`Loading ${TARGET_URL} at ${vp.name} (${vp.width}x${vp.height})...`);
      await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
      await new Promise((r) => setTimeout(r, 2000));

      const outPath = path.join(OUT_DIR, `${prefix}-${vp.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved screenshot: ${outPath}`);

      await page.close();
    }
    console.log("All screenshots captured successfully.");
  } finally {
    await browser.close();
  }
}

const prefix = process.argv[2] || "before";
captureScreenshots(prefix)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error capturing screenshots:", err);
    process.exit(1);
  });
