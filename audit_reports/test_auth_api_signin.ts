import { auth } from '@/lib/auth';

async function testServerSignIn() {
  try {
    const res = await auth.api.signInEmail({
      body: {
        email: 'admin@resolvegraph.demo',
        password: 'Admin@ResolveGraph2026!',
      },
      asResponse: true,
    });
    console.log('asResponse status:', res.status);
    console.log('Set-Cookie headers:', res.headers.get('set-cookie'));
    const body = await res.json();
    console.log('Response body:', body);
  } catch (err) {
    console.error('Error:', err);
  }
}

testServerSignIn();
