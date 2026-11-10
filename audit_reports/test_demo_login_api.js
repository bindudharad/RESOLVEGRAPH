const fetch = globalThis.fetch;

async function testDemoLogin() {
  const workspaces = ["PLATFORM", "BUYER", "MERCHANT", "INVALID"];

  for (const ws of workspaces) {
    const res = await fetch("http://localhost:3000/api/auth/demo-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000",
      },
      body: JSON.stringify({ workspace: ws }),
    });

    console.log(`Workspace ${ws}: status ${res.status}`);
    const cookies = res.headers.get("set-cookie");
    console.log(`  Set-Cookie exists: ${Boolean(cookies)}`);
    const data = await res.json();
    console.log(`  Response:`, data);
  }
}

testDemoLogin();
