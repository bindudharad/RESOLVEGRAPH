const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\Bindudhara D\\.gemini\\antigravity\\brain\\23179f53-d5e4-4ba1-8c5f-7736bff5383d\\screenshots";

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  console.log("Navigating to http://localhost:3000/overview...");
  await page.goto("http://localhost:3000/overview", {
    waitUntil: ["domcontentloaded", "networkidle2"],
    timeout: 30000,
  }).catch((err) => console.log("Navigation warning:", err.message));

  // Wait for WebGL 3D scenes to hydrate
  await new Promise((r) => setTimeout(r, 3500));

  // 1. Hero View with 3D Convergence Engine
  console.log("Capturing 1: cinematic-hero-3d.png");
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "cinematic-hero-3d.png"),
    fullPage: false,
  });

  // 2. Scroll to Pinned Story Sequence
  console.log("Capturing 2: cinematic-scroll-story.png");
  await page.evaluate(() => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView();
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "cinematic-scroll-story.png"),
    fullPage: false,
  });

  // 3. Scroll to Interactive Evidence Graph
  console.log("Capturing 3: cinematic-evidence-graph.png");
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h2"));
    const target = headings.find((h) => h.innerText.includes("Navigate the relationship web"));
    if (target) target.scrollIntoView();
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "cinematic-evidence-graph.png"),
    fullPage: false,
  });

  // 4. Scroll to Package Passport 3D
  console.log("Capturing 4: cinematic-package-passport.png");
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h2"));
    const target = headings.find((h) => h.innerText.includes("Every millimeter of the box"));
    if (target) target.scrollIntoView();
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "cinematic-package-passport.png"),
    fullPage: false,
  });

  // 5. Scroll to Footer
  console.log("Capturing 5: cinematic-editorial-footer.png");
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "cinematic-editorial-footer.png"),
    fullPage: false,
  });

  // 6. Full Page Snapshot
  console.log("Capturing 6: cinematic-full-overview.png");
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "cinematic-full-overview.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("All cinematic audit captures completed!");
}

run().catch((err) => {
  console.error("Capture failure:", err);
  process.exit(1);
});
