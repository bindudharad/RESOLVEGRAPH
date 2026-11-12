import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/rg1469-audit.json', 'utf8'));
const c = data.case;

console.log('=== BERR ASSESSMENTS ===');
for (const b of c.berrAssessments) {
  console.log('Assessment ID:', b.id, 'Version:', b.version, 'Status:', b.overallStatus);
  console.log('Findings:');
  for (const f of b.findings) {
    console.log(`- Field: ${f.field} | Class: ${f.classification} | Conf: ${f.confidence}`);
    console.log(`  BuyerClaim: ${f.buyerClaim}`);
    console.log(`  SellerClaim: ${f.sellerClaim}`);
    console.log(`  Explanation: ${f.explanation}`);
  }
}

console.log('\n=== BEG NODES ===');
for (const n of c.begGraph.nodes) {
  console.log(`Node [${n.id}] Type: ${n.nodeType} | Label: ${n.label} | Party: ${n.party}`);
  if (n.claimText || n.metadataJson) {
    console.log(`  ClaimText: ${n.claimText}`);
    console.log(`  Metadata: ${n.metadataJson}`);
  }
}
