import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/rg1469-audit.json', 'utf8'));
const c = data.case;

console.log('=== CLAIMS ===');
console.log(JSON.stringify(c.claims, null, 2));

console.log('=== SELLER EVIDENCE RESPONSES ===');
console.log(JSON.stringify(c.sellerEvidenceResponses, null, 2));

console.log('=== SELLER EVIDENCE REQUESTS ===');
console.log(JSON.stringify(c.sellerEvidenceRequests, null, 2));

console.log('=== SELLER IDENTITY MATCHES ===');
console.log(JSON.stringify(c.sellerIdentityMatches, null, 2));
