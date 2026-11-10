const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\Bindudhara D\\.gemini\\antigravity\\brain\\93f16013-33ff-4925-b6eb-1ec0978895c0\\screenshots";

const VIEWPORTS = {
  tablet: { width: 768, height: 1024, deviceScaleFactor: 1 },
  mobile: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const TASKS = [
  { route: "/cases", name: "v3_04_cases_tablet", vp: "tablet" },
  { route: "/cases", name: "v3_04_cases_mobile", vp: "mobile" },
  { route: "/cases/cmw0m6n310000fcvjzk8r347a", name: "v3_05_case_dossier_tablet", vp: "tablet" },
  { route: "/cases/cmw0m6n310000fcvjzk8r347a", name: "v3_05_case_dossier_mobile", vp: "mobile" },
  { route: "/incidents", name: "v3_06_incidents_tablet", vp: "tablet" },
  { route: "/incidents", name: "v3_06_incidents_mobile", vp: "mobile" },
  { route: "/reconciliation", name: "v3_07_reconciliation_tablet", vp: "tablet" },
  { route: "/reconciliation", name: "v3_07_reconciliation_mobile", vp: "mobile" },
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
      await new Promise(r => setTimeout(r, 1200));
      const outPath = path.join(ARTIFACT_DIR, `${t.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      await page.close();
      console.log(`Saved: ${t.name}.png`);
    } catch (e) {
      console.error(`Failed ${t.name}:`, e.message);
    }
  }

  await browser.close();
  console.log("Finished responsive captures.");
}

run();
