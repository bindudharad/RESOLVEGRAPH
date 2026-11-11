/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');

async function testEndpoint(url, email) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (email) {
      headers['x-demo-user-email'] = email;
    }
    const req = http.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  const users = [
    { label: 'Unauthenticated', email: null },
    { label: 'Buyer', email: 'alex.morgan@consumer.demo' },
    { label: 'Merchant', email: 'disputes@techstore.demo' },
    { label: 'Platform Admin', email: 'admin@resolvegraph.demo' },
  ];

  console.log('| User | Kill Switch GET | Audit GET |');
  console.log('|---|---|---|');

  for (const u of users) {
    const ks = await testEndpoint('http://localhost:3000/api/admin/kill-switch', u.email);
    const audit = await testEndpoint('http://localhost:3000/api/audit/chained', u.email);
    console.log(`| ${u.label} | ${ks.status} | ${audit.status} |`);
  }
}

main().catch(console.error);
