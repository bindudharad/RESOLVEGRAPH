const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\Bindudhara D\\.gemini\\antigravity\\brain\\93f16013-33ff-4925-b6eb-1ec0978895c0\\screenshots";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 1 },
  mobile: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const TASKS = [
  { route: "/", name: "v4_01_homepage_command_center_desktop", vp: "desktop" },
  { route: "/", name: "v4_01_homepage_command_center_tablet", vp: "tablet" },
  { route: "/", name: "v4_01_homepage_command_center_mobile", vp: "mobile" },
  { route: "/dashboard", name: "v4_02_dashboard_command_center_desktop", vp: "desktop" },
  { route: "/overview", name: "v4_03_overview_landing_desktop", vp: "desktop" },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  for (const t of TASKS) {
    try {
      console.log(`Capturing ${t.name}...`);
      const page = await browser.newPage();
      await page.setViewport(VIEWPORTS[t.vp]);
      await page.setExtraHTTPHeaders({ "x-demo-user-email": "admin@resolvegraph.demo" });
      await page.goto(`http://localhost:3000${t.route}`, { waitUntil: ["domcontentloaded", "networkidle0"], timeout: 25000 });
      await new Promise(r => setTimeout(r, 1500));
      const outPath = path.join(ARTIFACT_DIR, `${t.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      
      // Also take full page screenshot for desktop command center to inspect all sections A through K!
      if (t.name === "v4_01_homepage_command_center_desktop") {
        const fullOutPath = path.join(ARTIFACT_DIR, `${t.name}_full.png`);
        await page.screenshot({ path: fullOutPath, fullPage: true });
        console.log(`Saved: ${t.name}_full.png`);
      }

      await page.close();
      console.log(`Saved: ${t.name}.png`);
    } catch (e) {
      console.error(`Failed ${t.name}:`, e.message);
    }
  }

  await browser.close();
  console.log("All command center captures finished.");
}

run();
