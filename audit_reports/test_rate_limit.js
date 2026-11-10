const fetch = globalThis.fetch;

async function testRateLimit() {
  for (let i = 1; i <= 17; i++) {
    const res = await fetch("http://localhost:3000/api/auth/demo-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.42",
      },
      body: JSON.stringify({ workspace: "BUYER" }),
    });
    console.log(`Req ${i}: status ${res.status}`);
    if (res.status === 429) {
      console.log("Rate limit triggered successfully on request", i);
      break;
    }
  }
}

testRateLimit();
