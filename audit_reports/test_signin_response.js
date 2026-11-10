const fetch = globalThis.fetch;

async function testSignIn() {
  try {
    const res = await fetch("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "admin@resolvegraph.demo",
        password: "Admin@ResolveGraph2026!",
      }),
    });

    console.log("Status:", res.status);
    const headers = Object.fromEntries(res.headers.entries());
    console.log("Set-Cookie:", headers["set-cookie"]);
    const text = await res.text();
    console.log("Body text:", text);
    try {
      console.log("Parsed JSON:", JSON.parse(text));
    } catch (e) {
      // not json
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testSignIn();
