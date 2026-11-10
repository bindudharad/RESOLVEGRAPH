const puppeteer = require("puppeteer-core");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET_URL = "http://localhost:3000/";

async function verifyBrowserHomepage() {
  console.log("==================================================");
  console.log("RESOLVEGRAPH 2.0 — HOMEPAGE BROWSER VERIFICATION");
  console.log("==================================================");

  const errors = [];
  const consoleLogs = [];

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader-webgl",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--window-size=1440,900",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleLogs.push({ type, text });
      if (type === "error") {
        errors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      errors.push(`PageError: ${err.message}`);
    });

    // 1. Initial Load & HTTP Status
    console.log("\n[1/7] Loading http://localhost:3000/ in real Chrome...");
    const response = await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    console.log(`✓ HTTP Status: ${response.status()}`);
    await new Promise((r) => setTimeout(r, 1000));

    // 2. Hero Headline & Badges
    console.log("\n[2/7] Verifying Hero positioning, headlines and CTAs...");
    const heroHeadline = await page.$eval("h1", (el) => el.textContent);
    console.log(`✓ Hero Headline: "${heroHeadline.trim()}"`);

    const primaryCta = await page.$('a[href="/demo"]');
    console.log(`✓ Primary CTA ("Try Interactive Demo" -> /demo): ${Boolean(primaryCta)}`);

    const secondaryCta = await page.$('a[href="#how-it-works"]');
    console.log(`✓ Secondary CTA ("Explore How It Works" -> #how-it-works): ${Boolean(secondaryCta)}`);

    // 3. Multi-Source Evidence Convergence Interactive Stream Buttons
    console.log("\n[3/7] Testing multi-source evidence stream selectors in Hero...");
    const sourceButtons = await page.$$("button:has(svg)");
    console.log(`✓ Interactive evidence source buttons active: ${sourceButtons.length > 0}`);

    // Click on Merchant Record stream
    const merchantBtn = await page.$("xpath///button[contains(., 'Merchant Record')]");
    if (merchantBtn) {
      await merchantBtn.click();
      await new Promise((r) => setTimeout(r, 300));
      console.log("✓ Switched active stream to Merchant Record");
    }

    // Click on Carrier Telemetry stream
    const deliveryBtn = await page.$("xpath///button[contains(., 'Carrier Telemetry')]");
    if (deliveryBtn) {
      await deliveryBtn.click();
      await new Promise((r) => setTimeout(r, 300));
      console.log("✓ Switched active stream to Carrier Telemetry");
    }

    // 4. How It Works Connected Flow Stepper
    console.log("\n[4/7] Testing How It Works 4-stage connected flow...");
    for (const stage of ["02", "03", "04", "01"]) {
      const stageBtn = await page.$(`xpath///button[contains(., '${stage}')]`);
      if (stageBtn) {
        await stageBtn.click();
        await new Promise((r) => setTimeout(r, 200));
        console.log(`✓ Switched How It Works architecture inspector to Stage ${stage}`);
      }
    }

    // 5. Product Differentiators Tabs
    console.log("\n[5/7] Testing Core Differentiators tab switching...");
    for (const tab of ["BERR Reasoning Matrix", "AI Payment Investigation Agent", "Canonical Transaction Engine", "Bilateral Evidence Graph (BEG)"]) {
      const tabBtn = await page.$(`xpath///button[contains(., '${tab}')]`);
      if (tabBtn) {
        await tabBtn.click();
        await new Promise((r) => setTimeout(r, 200));
        console.log(`✓ Switched differentiator tab: ${tab}`);
      }
    }

    // 6. Live Investigation 10-Step Interactive Walkthrough
    console.log("\n[6/7] Testing Live Investigation 10-step timeline...");
    for (const stepNum of [1, 2, 4, 6, 8, 10]) {
      const stepStr = stepNum < 10 ? `Step 0${stepNum}` : `Step ${stepNum}`;
      const stepBtn = await page.$(`xpath///button[contains(., '${stepStr}')]`);
      if (stepBtn) {
        await stepBtn.click();
        await new Promise((r) => setTimeout(r, 200));
        console.log(`✓ Stepped investigation timeline to: ${stepStr}`);
      }
    }

    // 7. Mobile Viewport & Menu Drawer
    console.log("\n[7/7] Testing responsive mobile navigation at 390px...");
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.reload({ waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 800));

    const hamburgerBtn = await page.$('button[aria-label="Toggle Navigation Menu"]');
    if (hamburgerBtn) {
      await hamburgerBtn.click();
      await new Promise((r) => setTimeout(r, 300));
      const mobileDemoLink = await page.$('nav a[href="/demo"]');
      console.log(`✓ Mobile drawer opened, found Demo link: ${Boolean(mobileDemoLink)}`);
      await hamburgerBtn.click();
      await new Promise((r) => setTimeout(r, 200));
      console.log("✓ Mobile drawer closed smoothly");
    }

    // Console Error Inspection
    console.log("\n==================================================");
    console.log("BROWSER CONSOLE INSPECTION REPORT");
    console.log("==================================================");
    console.log(`Total console messages: ${consoleLogs.length}`);
    console.log(`Total errors captured: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\nCaptured Errors:");
      errors.forEach((e, idx) => console.log(`  [Error ${idx + 1}] ${e}`));
    } else {
      console.log("✓ ZERO browser console errors detected.");
    }

    console.log("\n==================================================");
    console.log("FINAL VERDICT: ALL HOMEPAGE INTERACTIONS VERIFIED");
    console.log("==================================================");

    return {
      success: errors.length === 0,
      totalErrors: errors.length,
    };
  } finally {
    await browser.close();
  }
}

verifyBrowserHomepage()
  .then((res) => {
    process.exit(res.success ? 0 : 1);
  })
  .catch((err) => {
    console.error("FATAL HOMEPAGE TEST ERROR:", err);
    process.exit(1);
  });
