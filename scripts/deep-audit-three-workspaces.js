// Deep Audit Script: Explore All Three Authenticated Workspaces & Sidebar Navigation
// RESOLVEGRAPH 2.0: Platform Admin, Buyer, and Merchant

const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const AUDIT_SCREENSHOT_DIR = path.join(__dirname, "..", "public", "audit-screenshots");
const AUDIT_DATA_FILE = path.join(__dirname, "..", "public", "audit-data.json");

const PERSONAS = [
  {
    role: "PLATFORM",
    email: "admin@resolvegraph.demo",
    password: "Admin@ResolveGraph2026!",
    expectedName: "Priya Raghavan",
    expectedRole: "Platform Admin",
    expectedOrg: "ResolveGraph Global",
  },
  {
    role: "BUYER",
    email: "alex.morgan@consumer.demo",
    password: "Buyer@ResolveGraph2026!",
    expectedName: "Alex Morgan",
    expectedRole: "Consumer",
    expectedOrg: "Individual Consumer",
  },
  {
    role: "MERCHANT",
    email: "disputes@techstore.demo",
    password: "Merchant@TechStore2026!",
    expectedName: "TechStore Global",
    expectedRole: "Merchant Agent",
    expectedOrg: "TechStore Retail LLC",
  },
];

const PAGES_TO_INSPECT = [
  { path: "/overview", name: "Overview" },
  { path: "/payments", name: "Payments" },
  { path: "/cases", name: "Investigations / Cases" },
  { path: "/evidence", name: "Evidence Vault" },
  { path: "/cases/RG-1001", name: "Case Detail & Evidence Graph" },
  { path: "/purchases", name: "Purchase Memory" },
  { path: "/packages", name: "Package & Delivery" },
  { path: "/resolution-room", name: "Resolution Room" },
  { path: "/analytics", name: "Reports & Analytics" },
  { path: "/copilot", name: "AI Copilot" },
  { path: "/organizations", name: "Organizations & Roles" },
  { path: "/admin/security", name: "Security & Audit" },
  { path: "/settings", name: "Settings" },
  { path: "/dashboard", name: "Command Center" },
  { path: "/reconciliation", name: "Cross-Platform Reconciliation" },
  { path: "/investigation", name: "Investigation Insights" },
  { path: "/incidents", name: "Payment Incidents" },
  { path: "/intake", name: "Universal Payment Intake" },
  { path: "/multilingual", name: "Multilingual Voice Intake" },
  { path: "/resolution", name: "Resolution Center" },
  { path: "/paypal/disputes", name: "PayPal Disputes" },
  { path: "/demo", name: "PayPal Demo" },
];

async function runAudit() {
  console.log("================================================================================");
  console.log("RESOLVEGRAPH 2.0: THREE-PERSONA WORKSPACE & SIDEBAR DEEP AUDIT");
  console.log("================================================================================");

  if (!fs.existsSync(AUDIT_SCREENSHOT_DIR)) {
    fs.mkdirSync(AUDIT_SCREENSHOT_DIR, { recursive: true });
  }

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

  const auditResults = {
    timestamp: new Date().toISOString(),
    personas: {},
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    for (const persona of PERSONAS) {
      console.log(`\n--------------------------------------------------------------------------------`);
      console.log(`AUDITING PERSONA: ${persona.role} (${persona.email})`);
      console.log(`--------------------------------------------------------------------------------`);

      // 1. Clear cookies to ensure completely fresh session
      const client = await page.target().createCDPSession();
      await client.send("Network.clearBrowserCookies");
      await client.send("Network.clearBrowserCache");

      // 2. Navigate to sign-in
      await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "networkidle2" });
      await page.waitForSelector("#email", { timeout: 10000 });

      // 3. Fill credentials & submit
      await page.type("#email", persona.email);
      await page.type("#password", persona.password);
      await page.click("button[type='submit']");

      // 4. Wait for redirection into workspace (/overview)
      try {
        await page.waitForFunction(() => window.location.pathname.startsWith("/overview") || window.location.pathname.startsWith("/dashboard"), { timeout: 15000 });
        console.log(`✓ Authenticated successfully as ${persona.role}. Current URL: ${page.url()}`);
      } catch (err) {
        console.error(`✗ Failed to authenticate as ${persona.role}:`, err.message);
        auditResults.personas[persona.role] = { authFailed: true, error: err.message };
        continue;
      }

      await new Promise((r) => setTimeout(r, 1500));

      // 5. Inspect Left Sidebar
      console.log(`  [Sidebar] Inspecting ${persona.role} Left Sidebar...`);
      const sidebarAudit = await page.evaluate(() => {
        const sidebar = document.getElementById("app-sidebar");
        if (!sidebar) return { present: false };

        const width = sidebar.getBoundingClientRect().width;

        // Brand
        const brandOrgEl = sidebar.querySelector("a[href='/overview'] span.font-mono");
        const brandOrg = brandOrgEl ? brandOrgEl.textContent.trim() : null;

        // Groups & Items
        const groups = [];
        const groupEls = sidebar.querySelectorAll("nav > div.flex.flex-col");
        groupEls.forEach((grp) => {
          const titleEl = grp.querySelector("div.font-mono");
          const groupTitle = titleEl ? titleEl.textContent.trim() : "UNNAMED";
          const items = [];
          const links = grp.querySelectorAll("ul li a");
          links.forEach((a) => {
            const labelEl = a.querySelector("span.truncate");
            const label = labelEl ? labelEl.textContent.trim() : a.textContent.trim();
            const href = a.getAttribute("href");
            const badgeEl = a.querySelector("span.rounded-full");
            const badge = badgeEl ? badgeEl.textContent.trim() : null;
            const svg = a.querySelector("svg");
            const iconClass = svg ? svg.getAttribute("class") : null;

            // Check if there are dropdown submenus
            const sublist = a.parentElement.querySelector("ul");
            const hasDropdown = Boolean(sublist);
            const submenus = [];
            if (sublist) {
              sublist.querySelectorAll("a").forEach((subA) => {
                submenus.push({
                  label: subA.textContent.trim(),
                  href: subA.getAttribute("href"),
                });
              });
            }

            items.push({
              label,
              href,
              badge,
              iconClass,
              hasDropdown,
              submenus,
            });
          });
          groups.push({
            label: groupTitle,
            items,
          });
        });

        // Footer Profile Card
        const footerEl = sidebar.querySelector("div.border-t");
        const avatarEl = footerEl ? footerEl.querySelector("div.font-mono") : null;
        const nameEl = footerEl ? footerEl.querySelector("div.font-semibold") : null;
        const roleEl = footerEl ? footerEl.querySelector("span.uppercase") : null;
        const logoutBtn = footerEl ? footerEl.querySelector("button[aria-label='Sign out of session']") : null;

        return {
          present: true,
          width,
          brandOrg,
          groups,
          totalItems: groups.reduce((acc, g) => acc + g.items.length, 0),
          footer: {
            avatarInitials: avatarEl ? avatarEl.textContent.trim() : null,
            name: nameEl ? nameEl.textContent.trim() : null,
            role: roleEl ? roleEl.textContent.trim() : null,
            hasLogout: Boolean(logoutBtn),
          },
        };
      });

      console.log(`  ✓ Found ${sidebarAudit.groups?.length || 0} groups, ${sidebarAudit.totalItems} navigation items.`);
      console.log(`  ✓ Footer profile: "${sidebarAudit.footer?.name}" (${sidebarAudit.footer?.role})`);

      // Capture Expanded Sidebar Screenshot
      const expSidebarShot = path.join(AUDIT_SCREENSHOT_DIR, `${persona.role.toLowerCase()}-sidebar-expanded.png`);
      await page.screenshot({ path: expSidebarShot });
      console.log(`  ✓ Saved screenshot: ${expSidebarShot}`);

      // Test Collapsed Sidebar
      const collapseBtn = await page.$("button[title*='Collapse sidebar']");
      let collapsedWidth = null;
      if (collapseBtn) {
        await collapseBtn.click();
        await new Promise((r) => setTimeout(r, 400));
        collapsedWidth = await page.$eval("#app-sidebar", (el) => el.getBoundingClientRect().width);
        const colSidebarShot = path.join(AUDIT_SCREENSHOT_DIR, `${persona.role.toLowerCase()}-sidebar-collapsed.png`);
        await page.screenshot({ path: colSidebarShot });
        console.log(`  ✓ Collapsed width: ${collapsedWidth}px. Saved: ${colSidebarShot}`);

        // Re-expand
        const expandBtn = await page.$("button[aria-label='Expand sidebar']");
        if (expandBtn) {
          await expandBtn.click();
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      // 6. Inspect Every Page for this Persona
      console.log(`\n  [Pages] Inspecting all accessible application pages for ${persona.role}...`);
      const pagesAudit = [];

      for (const target of PAGES_TO_INSPECT) {
        console.log(`    -> Opening: ${target.name} (${target.path})...`);
        const res = await page.goto(`${BASE_URL}${target.path}`, { waitUntil: "networkidle2" });
        await new Promise((r) => setTimeout(r, 1000));

        const finalUrl = page.url();
        const statusCode = res ? res.status() : null;
        const isRedirectedToSignIn = finalUrl.includes("/sign-in");
        const isAccessDenied = finalUrl.includes("/access-denied") || (await page.$("text/Access Denied")) !== null;

        const pageDetails = await page.evaluate((targetPath) => {
          // Heading
          const h1 = document.querySelector("h1");
          const h2 = document.querySelector("h2");
          const heading = h1 ? h1.textContent.trim() : (h2 ? h2.textContent.trim() : "No Heading Found");

          // Summary Cards / KPIs
          const cards = [];
          // Look for metric cards with numbers
          const metricElements = document.querySelectorAll("[data-testid*='metric'], .rounded-xl, .rounded-2xl");
          metricElements.forEach((el) => {
            const num = el.querySelector(".text-2xl, .text-3xl, .font-mono, .tabular-nums");
            const label = el.querySelector(".text-xs, .text-sm, .text-muted, .text-white\\/60");
            if (num && label && label.textContent.trim().length > 2 && label.textContent.trim().length < 40) {
              cards.push({
                label: label.textContent.trim(),
                value: num.textContent.trim(),
              });
            }
          });

          // Tables
          const tables = [];
          document.querySelectorAll("table").forEach((tbl) => {
            const headers = Array.from(tbl.querySelectorAll("th")).map((th) => th.textContent.trim()).filter(Boolean);
            const rowsCount = tbl.querySelectorAll("tbody tr").length;
            tables.push({
              headers,
              rowsCount,
            });
          });

          // Tabs
          const tabs = [];
          document.querySelectorAll("[role='tab'], button.tab, [data-state='active'], [data-state='inactive']").forEach((tab) => {
            const txt = tab.textContent.trim();
            if (txt && txt.length < 30) {
              tabs.push(txt);
            }
          });

          // Charts
          const charts = [];
          if (document.querySelector("canvas")) charts.push("HTML5 Canvas");
          if (document.querySelector("svg.recharts-surface")) charts.push("Recharts Surface");
          if (document.querySelector("[data-testid*='chart']")) charts.push("Metric Chart");
          if (document.querySelector("svg") && document.querySelector(".recharts-wrapper")) charts.push("Recharts Graph");

          // Buttons & Actions
          const buttons = [];
          document.querySelectorAll("button, a.btn").forEach((btn) => {
            const txt = btn.textContent.trim();
            if (txt && txt.length > 1 && txt.length < 35 && !buttons.includes(txt)) {
              buttons.push(txt);
            }
          });

          // Forms / Inputs
          const inputs = [];
          document.querySelectorAll("input, select, textarea").forEach((inp) => {
            const placeholder = inp.getAttribute("placeholder");
            const name = inp.getAttribute("name") || inp.getAttribute("id") || inp.getAttribute("type");
            inputs.push({ name, placeholder });
          });

          // Content text snippet to analyze scope
          const bodySnippet = document.body.innerText.slice(0, 1500);

          return {
            heading,
            cardsCount: cards.length,
            sampleCards: cards.slice(0, 6),
            tablesCount: tables.length,
            tables,
            tabsCount: tabs.length,
            tabs: Array.from(new Set(tabs)),
            charts,
            buttonsCount: buttons.length,
            sampleButtons: buttons.slice(0, 8),
            inputsCount: inputs.length,
            bodySnippet,
          };
        }, target.path);

        const pageRecord = {
          name: target.name,
          requestedPath: target.path,
          actualUrl: finalUrl,
          statusCode,
          isAccessible: !isRedirectedToSignIn && !isAccessDenied && statusCode === 200,
          isRedirectedToSignIn,
          isAccessDenied,
          details: pageDetails,
        };

        // Determine if this is a primary page to screenshot
        const screenshotPages = ["/overview", "/cases", "/evidence", "/payments", "/packages", "/purchases", "/resolution-room", "/admin/security"];
        if (screenshotPages.includes(target.path) && pageRecord.isAccessible) {
          const pageShotPath = path.join(AUDIT_SCREENSHOT_DIR, `${persona.role.toLowerCase()}-${target.path.replace(/\//g, "-").replace(/^-/, "")}.png`);
          await page.screenshot({ path: pageShotPath });
          pageRecord.screenshot = pageShotPath;
          console.log(`      ✓ Saved page screenshot: ${pageShotPath}`);
        }

        pagesAudit.push(pageRecord);
        console.log(`      -> Status: ${statusCode} | Heading: "${pageDetails.heading}" | Accessible: ${pageRecord.isAccessible}`);
      }

      // 7. Mobile Viewport Check (390x844)
      console.log(`\n  [Mobile] Inspecting ${persona.role} Mobile Viewport...`);
      await page.setViewport({ width: 390, height: 844 });
      await page.goto(`${BASE_URL}/overview`, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 600));

      const mobileShotPath = path.join(AUDIT_SCREENSHOT_DIR, `${persona.role.toLowerCase()}-mobile-390.png`);
      await page.screenshot({ path: mobileShotPath });
      console.log(`  ✓ Saved mobile screenshot: ${mobileShotPath}`);

      // Reset desktop viewport
      await page.setViewport({ width: 1440, height: 900 });

      // Save persona audit record
      auditResults.personas[persona.role] = {
        persona,
        sidebar: sidebarAudit,
        collapsedWidth,
        pages: pagesAudit,
      };

      // 8. Sign out before next persona
      console.log(`\n  [SignOut] Signing out ${persona.role}...`);
      await page.goto(`${BASE_URL}/overview`, { waitUntil: "networkidle2" });
      const signOutBtn = await page.$("button[aria-label='Sign out of session']");
      if (signOutBtn) {
        await signOutBtn.click();
        await page.waitForFunction(() => window.location.pathname === "/sign-in", { timeout: 10000 });
        console.log(`  ✓ Signed out successfully.`);
      }
    }

    // Write audit results JSON
    fs.writeFileSync(AUDIT_DATA_FILE, JSON.stringify(auditResults, null, 2));
    console.log(`\n✓ Audit data written to: ${AUDIT_DATA_FILE}`);
    console.log("================================================================================");
    console.log("THREE-PERSONA WORKSPACE AUDIT COMPLETED SUCCESSFULLY!");
    console.log("================================================================================");

    return auditResults;
  } finally {
    await browser.close();
  }
}

runAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Audit failure:", err);
    process.exit(1);
  });
