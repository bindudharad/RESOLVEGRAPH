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

  // Scroll down to the 3D Inspection Studio
  await page.evaluate(() => window.scrollTo(0, 1600));
  await new Promise((r) => setTimeout(r, 2000));

  // 1. Capture Default GLTF Package Model with Studio Environment & Bloom
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen-3d-glb-package.png") });
  console.log("Captured screen-3d-glb-package.png");

  // 2. Click "Explode 3D Layers"
  const explodeBtn = await page.$('button[title="Explode 3D Package Layers"]');
  if (explodeBtn) {
    await explodeBtn.click();
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen-3d-glb-exploded.png") });
    console.log("Captured screen-3d-glb-exploded.png");
  }

  // 3. Switch to Security Core .GLB
  const coreTab = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const b = buttons.find((el) => el.textContent && el.textContent.includes("Security Core .GLB"));
    if (b) {
      b.click();
      return true;
    }
    return false;
  });

  if (coreTab) {
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen-3d-glb-security-core.png") });
    console.log("Captured screen-3d-glb-security-core.png");
  }

  // 4. Switch to Spline 3D Mode
  const splineBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const b = buttons.find((el) => el.textContent && el.textContent.includes("Spline 3D"));
    if (b) {
      b.click();
      return true;
    }
    return false;
  });

  if (splineBtn) {
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen-3d-spline-mode.png") });
    console.log("Captured screen-3d-spline-mode.png");
  }

  await browser.close();
  console.log("All Awwwards 3D screenshots captured!");
}

main().catch(console.error);
