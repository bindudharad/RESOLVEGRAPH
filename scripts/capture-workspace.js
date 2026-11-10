const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:/Users/Bindudhara D/.gemini/antigravity/brain/93f16013-33ff-4925-b6eb-1ec0978895c0/screenshots";

const TASKS = [
  { route: "/dashboard", name: "v2_03_dashboard_desktop" },
  { route: "/cases", name: "v2_04_cases_desktop" },
  { route: "/cases/cmw0m6n310000fcvjzk8r347a", name: "v2_05_case_dossier_desktop" },
  { route: "/incidents", name: "v2_06_incidents_desktop" },
  { route: "/reconciliation", name: "v2_07_reconciliation_desktop" },
  { route: "/resolution-room", name: "v2_08_resolution_room_desktop" },
  { route: "/admin/security", name: "v2_09_admin_security_desktop" },
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
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
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
  console.log("All done.");
}

run();
