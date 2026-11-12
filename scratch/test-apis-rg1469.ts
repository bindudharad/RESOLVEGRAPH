async function main() {
  const caseId = 'RG-1469';
  console.log('Testing APIs for caseId with PLATFORM auth:', caseId);

  // 0. Demo login as PLATFORM
  const loginRes = await fetch('http://localhost:3000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace: 'PLATFORM' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status, 'Cookie acquired:', !!cookie);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  // 1. /api/cases/RG-1469
  const resCase = await fetch(`http://localhost:3000/api/cases/${caseId}`, { headers });
  console.log('--- 1. /api/cases/RG-1469 ---', resCase.status);
  const dataCase = await resCase.json();
  console.log({
    id: dataCase.id,
    caseNumber: dataCase.caseNumber,
    sellerDisplayName: dataCase.sellerDisplayName,
    merchant: dataCase.merchant,
    status: dataCase.status
  });

  // 2. /api/cases/RG-1469/analysis
  const resAnalysis = await fetch(`http://localhost:3000/api/cases/${caseId}/analysis`, { headers });
  console.log('\n--- 2. /api/cases/RG-1469/analysis ---', resAnalysis.status);
  const dataAnalysis = await resAnalysis.json();
  console.log('Analysis data:', dataAnalysis);

  // 3. /api/cases/RG-1469/berr-v2
  const resBerr = await fetch(`http://localhost:3000/api/cases/${caseId}/berr-v2`, { headers });
  console.log('\n--- 3. /api/cases/RG-1469/berr-v2 ---', resBerr.status);
  const dataBerr = await resBerr.json();
  console.log('BERR-v2 data:', {
    overallStatus: dataBerr.overallStatus,
    version: dataBerr.version,
    assessmentId: dataBerr.assessmentId,
    begGraphVersion: dataBerr.begGraphVersion,
    findingsCount: dataBerr.findings?.length,
    findings: dataBerr.findings?.map((f: any) => ({
      field: f.field,
      classification: f.classification,
      explanation: f.explanation
    }))
  });

  // 4. /api/cases/RG-1469/resolution-options
  const resOptions = await fetch(`http://localhost:3000/api/cases/${caseId}/resolution-options`, { headers });
  console.log('\n--- 4. /api/cases/RG-1469/resolution-options ---', resOptions.status);
  const dataOptions = await resOptions.json();
  console.log('Resolution Options:', JSON.stringify(dataOptions, null, 2));
}

main().catch(console.error);
