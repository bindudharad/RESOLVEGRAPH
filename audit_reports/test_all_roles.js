const fetch = globalThis.fetch;

async function testUsers() {
  const users = [
    { email: "admin@resolvegraph.demo", pass: "Admin@ResolveGraph2026!" },
    { email: "alex.morgan@consumer.demo", pass: "Buyer@ResolveGraph2026!" },
    { email: "disputes@techstore.demo", pass: "Merchant@TechStore2026!" },
  ];

  for (const u of users) {
    const res = await fetch("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000",
      },
      body: JSON.stringify({
        email: u.email,
        password: u.pass,
      }),
    });
    const data = await res.json();
    console.log(`User: ${u.email} -> role: ${data?.user?.role}, isPlatformAdmin: ${data?.user?.isPlatformAdmin}`);
  }
}

testUsers();
