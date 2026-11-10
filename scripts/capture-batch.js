const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\Bindudhara D\\.gemini\\antigravity\\brain\\93f16013-33ff-4925-b6eb-1ec0978895c0\\screenshots";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 1 },
  mobile: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const TASKS = [
  { route: "/", name: "01_landing_desktop", vp: "desktop", userEmail: null },
  { route: "/", name: "01_landing_tablet", vp: "tablet", userEmail: null },
  { route: "/", name: "01_landing_mobile", vp: "mobile", userEmail: null },
  { route: "/sign-in", name: "02_signin_desktop", vp: "desktop", userEmail: null },
  { route: "/dashboard", name: "03_dashboard_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/dashboard", name: "03_dashboard_tablet", vp: "tablet", userEmail: "admin@resolvegraph.demo" },
  { route: "/dashboard", name: "03_dashboard_mobile", vp: "mobile", userEmail: "admin@resolvegraph.demo" },
  { route: "/cases", name: "04_cases_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/cases/cmw0m6n310000fcvjzk8r347a", name: "05_case_detail_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/incidents", name: "06_incidents_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/reconciliation", name: "07_reconciliation_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/resolution-room", name: "08_resolution_room_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/admin/security", name: "09_admin_security_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
];

async function runBatch() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  for (const t of TASKS) {
    try {
      console.log(`Capturing ${t.name} (${t.route} on ${t.vp})...`);
      const page = await browser.newPage();
      await page.setViewport(VIEWPORTS[t.vp]);

      if (t.userEmail) {
        await page.setExtraHTTPHeaders({
          "x-demo-user-email": t.userEmail,
        });
      }

      const url = `http://localhost:3000${t.route}`;
      await page.goto(url, { waitUntil: ["domcontentloaded", "networkidle0"], timeout: 25000 });
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
  console.log("All batch captures finished.");
}

runBatch();
