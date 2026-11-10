const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";

async function measurePerformance() {
  console.log('================================================================');
  console.log('PHASE 14: PERFORMANCE, METRICS & STABILITY AUDIT');
  console.log('================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Authenticate first
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle2' });
  await page.type('#email', 'admin@resolvegraph.demo');
  await page.type('#password', 'Admin@ResolveGraph2026!');
  await page.click("button[type='submit']");
  await page.waitForFunction(() => window.location.pathname.startsWith('/overview'), { timeout: 15000 });

  const pagesToBenchmark = ['/overview', '/payments', '/cases', '/evidence', '/dashboard'];
  const webVitalsResults = [];

  for (const route of pagesToBenchmark) {
    console.log(`\nBenchmarking Core Web Vitals for: ${route}...`);
    
    // Track asset sizes
    let totalJsBytes = 0;
    let totalCssBytes = 0;
    let totalImgBytes = 0;
    const assets = [];

    const responseHandler = (res) => {
      const url = res.url();
      const headers = res.headers();
      const length = parseInt(headers['content-length'] || '0', 10);
      if (url.endsWith('.js') || url.includes('/_next/static/chunks/')) totalJsBytes += length;
      if (url.endsWith('.css') || url.includes('/_next/static/css/')) totalCssBytes += length;
      if (url.match(/\.(png|jpg|jpeg|webp|svg|gif)$/i)) totalImgBytes += length;
      if (length > 250000) { // Large asset > 250KB
        assets.push({ url: url.slice(0, 100), sizeKb: (length / 1024).toFixed(1) });
      }
    };

    page.on('response', responseHandler);

    const startNav = Date.now();
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle2' });
    const loadTimeMs = Date.now() - startNav;

    page.off('response', responseHandler);

    // Extract Performance Timing and Web Vitals
    const vitals = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let fcp = null;
        let lcp = null;
        let cls = 0;

        const perfObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              fcp = entry.startTime;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              lcp = entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        });

        perfObserver.observe({ type: 'paint', buffered: true });
        perfObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        perfObserver.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          const navTiming = performance.getEntriesByType('navigation')[0] || {};
          resolve({
            fcp: fcp ? Math.round(fcp) : null,
            lcp: lcp ? Math.round(lcp) : null,
            cls: parseFloat(cls.toFixed(4)),
            domContentLoaded: navTiming.domContentLoadedEventEnd ? Math.round(navTiming.domContentLoadedEventEnd) : null,
            duration: navTiming.duration ? Math.round(navTiming.duration) : null,
          });
        }, 1500);
      });
    });

    console.log(`  -> FCP: ${vitals.fcp}ms | LCP: ${vitals.lcp}ms | CLS: ${vitals.cls} | Full Load: ${loadTimeMs}ms`);
    console.log(`  -> JS Bundle: ${(totalJsBytes / 1024).toFixed(1)} KB | CSS: ${(totalCssBytes / 1024).toFixed(1)} KB`);

    webVitalsResults.push({
      route,
      loadTimeMs,
      vitals,
      assetTransfer: {
        totalJsKb: (totalJsBytes / 1024).toFixed(1),
        totalCssKb: (totalCssBytes / 1024).toFixed(1),
        largeAssetsCount: assets.length,
        largeAssets: assets,
      }
    });
  }

  // 2. API Latency & Concurrency Stress
  console.log('\n--- Measuring Core API Latency (5 iterations per endpoint) ---');
  const apiEndpoints = [
    '/api/health',
    '/api/overview/summary',
    '/api/cases?limit=10',
    '/api/payments?limit=10',
    '/api/evidence?limit=10',
    '/api/dashboard/summary',
  ];

  const apiMetrics = {};

  for (const ep of apiEndpoints) {
    const latencies = [];
    for (let i = 0; i < 5; i++) {
      const lat = await page.evaluate(async (url) => {
        const t0 = performance.now();
        const r = await fetch(url);
        const t1 = performance.now();
        return { duration: t1 - t0, status: r.status };
      }, ep);
      if (lat.status === 200) {
        latencies.push(lat.duration);
      }
    }
    const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    console.log(`  ${ep.padEnd(25)} -> Avg: ${avg.toFixed(1)}ms | Min: ${min.toFixed(1)}ms | Max: ${max.toFixed(1)}ms`);
    apiMetrics[ep] = {
      avgMs: parseFloat(avg.toFixed(1)),
      minMs: parseFloat(min.toFixed(1)),
      maxMs: parseFloat(max.toFixed(1)),
      samples: latencies.length,
    };
  }

  // 3. Concurrent Safe Read Test (15 simultaneous requests to /api/overview/summary)
  console.log('\n--- Testing 15 Concurrent Read Requests to /api/overview/summary ---');
  const concurrencyTest = await page.evaluate(async () => {
    const start = performance.now();
    const promises = Array.from({ length: 15 }, () => fetch('/api/overview/summary'));
    const responses = await Promise.all(promises);
    const totalDuration = performance.now() - start;
    const statuses = responses.map(r => r.status);
    const all200 = statuses.every(s => s === 200);
    return {
      all200,
      totalDurationMs: Math.round(totalDuration),
      avgPerReqMs: Math.round(totalDuration / 15),
      statusesSummary: statuses.filter(s => s === 200).length + '/15 passed',
    };
  });
  console.log(`  -> 15 Concurrent Requests: ${concurrencyTest.statusesSummary} in ${concurrencyTest.totalDurationMs}ms (Avg ${concurrencyTest.avgPerReqMs}ms/req)`);

  await browser.close();

  const finalOutput = {
    webVitals: webVitalsResults,
    apiLatencies: apiMetrics,
    concurrencyTest,
  };

  const outputPath = path.resolve('./audit_reports/performance_test_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
  console.log(`\nPerformance results written to: ${outputPath}`);
}

measurePerformance();
