async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/health', { cache: 'no-store' }).catch(() => null);
    if (res) {
      console.log('Health status:', res.status);
    } else {
      const homeRes = await fetch('http://localhost:3000/', { cache: 'no-store' });
      console.log('Home status:', homeRes.status);
    }
  } catch (e: any) {
    console.log('Fetch error:', e.message);
  }
}
run();
