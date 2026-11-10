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
  { route: "/admin/security", name: "v3_09_admin_security_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/evidence", name: "v3_10_evidence_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/evidence", name: "v3_10_evidence_tablet", vp: "tablet", userEmail: "admin@resolvegraph.demo" },
  { route: "/evidence", name: "v3_10_evidence_mobile", vp: "mobile", userEmail: "admin@resolvegraph.demo" },
  { route: "/purchases", name: "v3_11_purchases_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/packages", name: "v3_12_packages_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/copilot", name: "v3_13_copilot_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/analytics", name: "v3_14_analytics_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/analytics", name: "v3_14_analytics_tablet", vp: "tablet", userEmail: "admin@resolvegraph.demo" },
  { route: "/analytics", name: "v3_14_analytics_mobile", vp: "mobile", userEmail: "admin@resolvegraph.demo" },
  { route: "/intake", name: "v3_15_intake_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/paypal", name: "v3_16_paypal_desktop", vp: "desktop", userEmail: "admin@resolvegraph.demo" },
  { route: "/", name: "v3_01_landing_desktop", vp: "desktop", userEmail: null },
];

async function run() {
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
  console.log("All captures completed.");
}

run();
