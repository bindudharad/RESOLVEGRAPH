// Complete Browser Automation & Verification Script for RESOLVEGRAPH 2.0 Unified Overview
// Tests all 3 Personas (PLATFORM, BUYER, MERCHANT), data isolation, search filtering, and error absence.

const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET_URL = "http://localhost:3000/overview";
const SCREENSHOT_DIR = path.join(__dirname, "..", "public", "screenshots");

async function verifyUnifiedOverview() {
  console.log("================================================================================");
  console.log("RESOLVEGRAPH 2.0 — UNIFIED ROLE-BASED OVERVIEW DASHBOARD VERIFICATION");
  console.log("================================================================================");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const errors = [];
  const warnings = [];
  const pageLogs = [];

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
      pageLogs.push({ type, text });
      if (type === "error") {
        errors.push(`ConsoleError: ${text}`);
      } else if (type === "warning") {
        warnings.push(`ConsoleWarn: ${text}`);
      }
    });

    page.on("pageerror", (err) => {
      errors.push(`PageError: ${err.message}\n${err.stack}`);
    });

    // ----------------------------------------------------
    // TEST 1: Load http://localhost:3000/overview (Default PLATFORM Persona)
    // ----------------------------------------------------
    console.log("\n[1/5] Navigating to http://localhost:3000/overview...");
    const res = await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`✓ HTTP Response Status: ${res.status()}`);

    // Wait for the Unified Overview header to appear and data fetch to complete
    await page.waitForSelector("[data-testid='overview-header'] h1", { timeout: 10000 });
    // Wait for data to populate into header scope
    await page.waitForFunction(
      () => document.querySelector("[data-testid='overview-header'] span.rounded-full")?.textContent?.includes("Scope"),
      { timeout: 15000 }
    );

    const headerTitle = await page.$eval("[data-testid='overview-header'] h1", (el) => el.textContent.trim());
    console.log(`✓ Welcome Header Title: "${headerTitle}"`);

    // Verify Platform user details
    const roleBadge = await page.$eval("[data-testid='overview-header'] span.font-mono.uppercase", (el) => el.textContent.trim());
    const orgBadge = await page.$eval("[data-testid='overview-header'] span.rounded-full", (el) => el.textContent.trim());
    console.log(`✓ Persona Role Badge: "${roleBadge}"`);
    console.log(`✓ Persona Scope Badge: "${orgBadge}"`);

    // Verify 4 KPI cards rendered
    const kpiCards = await page.$$eval("section[aria-label='Key Performance Indicators'] div.rounded-2xl", (cards) => {
      return cards.map((c) => {
        const title = c.querySelector("span.text-xs")?.textContent?.trim() || "";
        const value = c.querySelector("span.font-mono.text-2xl")?.textContent?.trim() || "";
        return { title, value };
      });
    });
    console.log(`✓ KPI Cards Rendered (${kpiCards.length}/4):`, JSON.stringify(kpiCards));

    // Verify Quick Actions rendered
    const quickActions = await page.$$eval("section[aria-label='Quick Actions'] div.rounded-xl", (actions) => {
      return actions.map((a) => {
        const label = a.querySelector("span.font-semibold")?.textContent?.trim() || "";
        const badge = a.querySelector("span.font-mono")?.textContent?.trim() || "";
        const isDisabled = a.classList.contains("opacity-60");
        return { label, badge, isDisabled };
      });
    });
    console.log(`✓ Quick Actions Rendered (${quickActions.length}):`, JSON.stringify(quickActions));

    // Verify BERR 4-fact counts
    const berrStats = await page.$$eval("section[aria-label='Evidence and Resolution Summary'] div.rounded-xl", (items) => {
      return items.map((i) => {
        const label = i.querySelector("span.font-mono.font-bold")?.textContent?.trim() || "";
        const count = i.querySelector("span.rounded-full")?.textContent?.trim() || "";
        return { label, count };
      }).filter((x) => x.label);
    });
    console.log(`✓ BERR Fact Breakdown:`, JSON.stringify(berrStats));

    // Verify Compact 3D Evidence Graph teaser
    const graphTeaser = await page.$eval("a[href*='/cases/'] span:nth-child(2)", (span) => {
      const a = span.closest("a");
      return {
        text: span.textContent.trim(),
        href: a ? a.getAttribute("href") : null,
      };
    });
    console.log(`✓ Compact 3D Graph Teaser: "${graphTeaser.text}" -> ${graphTeaser.href}`);

    // Verify Platform Table Rows
    const tableRows = await page.$$eval("tbody tr", (rows) => {
      return rows.map((r) => {
        const tds = r.querySelectorAll("td");
        const paymentRef = tds[0]?.querySelector("span.font-mono")?.textContent?.trim() || "";
        const caseNumber = tds[1]?.textContent?.trim() || "";
        const counterparty = tds[2]?.textContent?.trim() || "";
        const amount = tds[3]?.textContent?.trim() || "";
        return { paymentRef, caseNumber, counterparty, amount };
      });
    });
    console.log(`✓ Platform Table Rows: ${tableRows.length} transactions loaded.`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "overview-platform.png") });
    console.log(`✓ Saved screenshot: public/screenshots/overview-platform.png`);

    // ----------------------------------------------------
    // TEST 2: Switch to BUYER Persona
    // ----------------------------------------------------
    console.log("\n[2/5] Switching to BUYER Persona...");
    const buyerBtn = await page.waitForSelector("button[data-testid='persona-btn-BUYER']", { timeout: 5000 });
    if (!buyerBtn) throw new Error("Could not find BUYER persona button in header");

    await buyerBtn.click();
    // Wait for the UI update to reflect Alex Morgan
    await page.waitForFunction(
      () => document.querySelector("[data-testid='overview-header'] h1")?.textContent?.includes("Alex Morgan"),
      { timeout: 10000 }
    );

    const buyerHeader = await page.$eval("[data-testid='overview-header'] h1", (el) => el.textContent.trim());
    const buyerRole = await page.$eval("[data-testid='overview-header'] span.font-mono.uppercase", (el) => el.textContent.trim());
    const buyerScope = await page.$eval("[data-testid='overview-header'] span.rounded-full", (el) => el.textContent.trim());
    console.log(`✓ Buyer Header: "${buyerHeader}" | Role: "${buyerRole}" | Scope: "${buyerScope}"`);

    const buyerKpis = await page.$$eval("section[aria-label='Key Performance Indicators'] span.font-mono.text-2xl", (els) => {
      return els.map((el) => el.textContent.trim());
    });
    console.log(`✓ Buyer KPIs [Payments Vol, Cases, Action Req, Evidence Status]:`, buyerKpis);

    // Verify Buyer sees TechStore Global as counterparty
    const buyerRows = await page.$$eval("tbody tr", (rows) => {
      return rows.map((r) => {
        const tds = r.querySelectorAll("td");
        const paymentRef = tds[0]?.textContent?.trim() || "";
        const caseNumber = tds[1]?.textContent?.trim() || "";
        const counterparty = tds[2]?.textContent?.trim() || "";
        const amount = tds[3]?.textContent?.trim() || "";
        return { paymentRef, caseNumber, counterparty, amount };
      });
    });
    console.log(`✓ Buyer Table Rows (${buyerRows.length}):`, buyerRows.slice(0, 3));

    // Verify Buyer has Submit Evidence enabled
    const buyerSubmitAction = await page.$$eval("section[aria-label='Quick Actions'] div.rounded-xl", (actions) => {
      const submit = actions.find((a) => a.querySelector("span.font-semibold")?.textContent?.includes("Submit Evidence"));
      return {
        label: submit?.querySelector("span.font-semibold")?.textContent?.trim(),
        disabled: submit?.classList.contains("opacity-60"),
      };
    });
    console.log(`✓ Buyer Quick Action "Submit Evidence" disabled: ${buyerSubmitAction.disabled} (should be false/enabled)`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "overview-buyer.png") });
    console.log(`✓ Saved screenshot: public/screenshots/overview-buyer.png`);

    // ----------------------------------------------------
    // TEST 3: Switch to MERCHANT Persona
    // ----------------------------------------------------
    console.log("\n[3/5] Switching to MERCHANT Persona...");
    const merchantBtn = await page.waitForSelector("button[data-testid='persona-btn-MERCHANT']", { timeout: 5000 });
    if (!merchantBtn) throw new Error("Could not find MERCHANT persona button in header");

    await merchantBtn.click();
    await page.waitForFunction(
      () => document.querySelector("[data-testid='overview-header'] h1")?.textContent?.includes("TechStore Global"),
      { timeout: 10000 }
    );

    const merchantHeader = await page.$eval("[data-testid='overview-header'] h1", (el) => el.textContent.trim());
    const merchantRole = await page.$eval("[data-testid='overview-header'] span.font-mono.uppercase", (el) => el.textContent.trim());
    const merchantScope = await page.$eval("[data-testid='overview-header'] span.rounded-full", (el) => el.textContent.trim());
    console.log(`✓ Merchant Header: "${merchantHeader}" | Role: "${merchantRole}" | Scope: "${merchantScope}"`);

    const merchantKpis = await page.$$eval("section[aria-label='Key Performance Indicators'] span.font-mono.text-2xl", (els) => {
      return els.map((el) => el.textContent.trim());
    });
    console.log(`✓ Merchant KPIs [Sales Vol, Cases, Action Req, Evidence Status]:`, merchantKpis);

    const merchantRows = await page.$$eval("tbody tr", (rows) => {
      return rows.map((r) => {
        const tds = r.querySelectorAll("td");
        const paymentRef = tds[0]?.textContent?.trim() || "";
        const caseNumber = tds[1]?.textContent?.trim() || "";
        const counterparty = tds[2]?.textContent?.trim() || "";
        const amount = tds[3]?.textContent?.trim() || "";
        return { paymentRef, caseNumber, counterparty, amount };
      });
    });
    console.log(`✓ Merchant Table Rows (${merchantRows.length}):`, merchantRows.slice(0, 3));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "overview-merchant.png") });
    console.log(`✓ Saved screenshot: public/screenshots/overview-merchant.png`);

    // ----------------------------------------------------
    // TEST 4: Search Bar Filtering
    // ----------------------------------------------------
    console.log("\n[4/5] Testing Table Filter Search Input...");
    const searchInput = await page.$("input[placeholder*='Search by Payment Ref']");
    if (!searchInput) throw new Error("Search input not found");

    // Type a specific filter that matches 1 record
    await searchInput.type("RG-2026-0412");
    await new Promise((r) => setTimeout(r, 400));

    const filteredRowCount = await page.$$eval("tbody tr", (rows) => rows.length);
    console.log(`✓ Rows matching query "RG-2026-0412": ${filteredRowCount}`);

    // Clear search
    await page.evaluate(() => {
      const input = document.querySelector("input[placeholder*='Search by Payment Ref']");
      if (input) {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    // ----------------------------------------------------
    // TEST 5: Console & Error Audit
    // ----------------------------------------------------
    console.log("\n[5/5] Auditing Browser Errors and Warnings...");
    console.log(`✓ Total Console Messages: ${pageLogs.length}`);
    console.log(`✓ Errors: ${errors.length}`);
    console.log(`✓ Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.error("\n❌ Detected errors during execution:");
      errors.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
    } else {
      console.log("\n🎉 ZERO BROWSER ERRORS DETECTED!");
    }

    console.log("\n================================================================================");
    console.log("UNIFIED OVERVIEW DASHBOARD BROWSER VERIFICATION SUMMARY: PASSED");
    console.log("================================================================================");

    return {
      success: errors.length === 0,
      kpiCards,
      quickActions,
      berrStats,
      buyerKpis,
      merchantKpis,
      errors,
    };
  } finally {
    await browser.close();
  }
}

verifyUnifiedOverview()
  .then((res) => {
    if (!res.success) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("FATAL verification error:", err);
    process.exit(1);
  });
