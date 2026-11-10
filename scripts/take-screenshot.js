const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "C:\\Users\\Bindudhara D\\.gemini\\antigravity\\brain\\23179f53-d5e4-4ba1-8c5f-7736bff5383d\\screenshots";

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 1 },
  mobile: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

async function capture() {
  const args = process.argv.slice(2);
  const route = args[0] || "/";
  const name = args[1] || "screen";
  const vpKey = args[2] || "desktop";
  const userEmail = args[3] || "admin@resolvegraph.demo";
  const fullPage = args[4] === "true";

  const viewport = VIEWPORTS[vpKey] || VIEWPORTS.desktop;
  const url = route.startsWith("http") ? route : `http://localhost:3000${route}`;
  const outPath = path.join(ARTIFACT_DIR, `${name}.png`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    if (userEmail && userEmail !== "none") {
      await page.setExtraHTTPHeaders({
        "x-demo-user-email": userEmail,
      });
    }

    await page.goto(url, { waitUntil: ["domcontentloaded", "networkidle2"], timeout: 15000 }).catch(() => {});
    // Additional wait for animations/canvas
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({ path: outPath, fullPage });
    console.log(`Saved screenshot to: ${outPath}`);
  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    await browser.close();
  }
}

capture();
