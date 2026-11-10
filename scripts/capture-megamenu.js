const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\Bindudhara D\\.gemini\\antigravity\\brain\\23179f53-d5e4-4ba1-8c5f-7736bff5383d\\screenshots";

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto("http://localhost:3000/overview", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  // Find Product button and hover
  const productBtn = await page.$('button[aria-expanded="false"]');
  if (productBtn) {
    await productBtn.hover();
    await new Promise((r) => setTimeout(r, 600));
  }

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "cinematic-megamenu-product.png"),
  });

  await browser.close();
  console.log("Captured cinematic-megamenu-product.png!");
}

run();
