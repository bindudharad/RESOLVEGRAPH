const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\Bindudhara D\\.gemini\\antigravity\\brain\\23179f53-d5e4-4ba1-8c5f-7736bff5383d\\screenshots";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto("http://localhost:3000/overview", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 2000));

  // Scroll down to 3D Perspective Showcase
  await page.evaluate(() => window.scrollTo(0, 850));
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen-perspective-showcase.png") });

  // Scroll down to 3D Inspection Lab
  await page.evaluate(() => window.scrollTo(0, 1600));
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen-3d-inspection-lab.png") });

  // Scroll down to Stats & Features
  await page.evaluate(() => window.scrollTo(0, 2700));
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen-stats-features.png") });

  // Scroll down to Case Walkthrough & Dossier
  await page.evaluate(() => window.scrollTo(0, 4200));
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen-walkthrough-dossier.png") });

  await browser.close();
  console.log("Screenshots captured successfully!");
}

main().catch(console.error);
