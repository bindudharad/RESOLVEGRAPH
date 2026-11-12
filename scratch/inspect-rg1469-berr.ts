import { prisma } from '../src/lib/prisma';

async function main() {
  const caseItem = await prisma.caseRecord.findFirst({
    where: { caseNumber: 'RG-1469' },
    include: {
      berrAssessments: {
        include: { findings: true }
      },
      aiAnalysisRuns: {
        include: { findings: true }
      },
      evidence: true,
      claims: true,
      sellerEvidenceRequests: true,
      sellerIdentityMatches: true,
      begGraph: {
        include: { nodes: true, edges: true }
      },
      extractedFacts: true,
      berrFindings: true,
      berrV2Findings: true
    }
  });

  if (!caseItem) {
    console.log('Case not found');
    return;
  }

  console.log('Case ID:', caseItem.id);
  console.log('Product in CaseRecord:', caseItem.productName);
  console.log('Description in CaseRecord:', caseItem.description);
  console.log('AI Analysis Runs count:', caseItem.aiAnalysisRuns.length);
  for (const run of caseItem.aiAnalysisRuns) {
    console.log('Run:', {
      id: run.id,
      status: run.status,
      trigger: run.trigger,
      totalDiscrepancy: run.totalDiscrepancy,
      exactDiscrepancy: run.exactDiscrepancy,
      semanticDiscrepancy: run.semanticDiscrepancy,
      temporalDiscrepancy: run.temporalDiscrepancy,
      confidenceScore: run.confidenceScore,
      createdAt: run.createdAt,
      findingsCount: run.findings?.length
    });
    for (const f of run.findings || []) {
      console.log('  Finding in Run:', {
        id: f.id,
        findingType: f.findingType,
        source: f.source,
        description: f.description,
        discrepancyType: f.discrepancyType,
        severity: f.severity,
        confidence: f.confidence
      });
    }
  }

  console.log('BERR Assessments count:', caseItem.berrAssessments.length);
  for (const b of caseItem.berrAssessments) {
    console.log('Assessment:', {
      id: b.id,
      version: b.version,
      overallStatus: b.overallStatus,
      agreementRatio: b.agreementRatio,
      contestedRatio: b.contestedRatio,
      missingRatio: b.missingRatio,
      createdAt: b.createdAt,
      findingsCount: b.findings.length,
      findings: b.findings.map(f => ({
        id: f.id,
        factKey: f.factKey,
        classification: f.classification,
        confidence: f.confidence,
        explanation: f.explanation
      }))
    });
  }

  console.log('berrV2Findings count:', caseItem.berrV2Findings.length);
  for (const f of caseItem.berrV2Findings) {
    console.log('berrV2Finding:', {
      id: f.id,
      factKey: f.factKey,
      classification: f.classification,
      confidence: f.confidence,
      explanation: f.explanation
    });
  }

  console.log('extractedFacts count:', caseItem.extractedFacts.length);
  for (const ef of caseItem.extractedFacts) {
    console.log('extractedFact:', {
      id: ef.id,
      factType: ef.factType,
      field: ef.field,
      value: ef.value,
      confidence: ef.confidence,
      sourceType: ef.sourceType
    });
  }

  console.log('berrFindings count:', caseItem.berrFindings.length);
  for (const bf of caseItem.berrFindings) {
    console.log('berrFinding (legacy):', {
      id: bf.id,
      findingType: bf.findingType,
      source: bf.source,
      description: bf.description,
      discrepancyType: bf.discrepancyType
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
