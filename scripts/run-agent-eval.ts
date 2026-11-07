/**
 * Step 8: Multi-Agent Benchmark Evaluation Script
 * 
 * Usage: npx tsx scripts/run-agent-eval.ts
 */

import { MultiAgentEvaluator } from '../src/server/agents/evaluation/multi-agent-evaluator';

async function main() {
  console.log('========================================================================');
  console.log(' RESOLVEGRAPH STEP 8: MULTI-AGENT COPILOT EVALUATION BENCHMARK');
  console.log(' Comparing Baseline A (Single LLM), Baseline B (BERR), Baseline C (Multi-Agent)');
  console.log('========================================================================\n');

  const report = MultiAgentEvaluator.runBenchmark();

  console.log(`Evaluated ${report.totalScenarios} representative dispute scenarios.\n`);

  console.table([
    {
      Paradigm: report.baselineA_SingleLLM.name,
      'Citation Acc': `${(report.baselineA_SingleLLM.citationAccuracy * 100).toFixed(1)}%`,
      'Hallucination': `${(report.baselineA_SingleLLM.hallucinationRate * 100).toFixed(1)}%`,
      'Policy Comp': `${(report.baselineA_SingleLLM.policyComplianceRate * 100).toFixed(1)}%`,
      'Financial Safety': `${(report.baselineA_SingleLLM.financialSafetyRate * 100).toFixed(1)}%`,
      'Missing Evid F1': `${(report.baselineA_SingleLLM.missingEvidenceF1 * 100).toFixed(1)}%`,
      'Avg Latency': `${report.baselineA_SingleLLM.avgLatencyMs}ms`
    },
    {
      Paradigm: report.baselineB_RuleBERR.name,
      'Citation Acc': `${(report.baselineB_RuleBERR.citationAccuracy * 100).toFixed(1)}%`,
      'Hallucination': `${(report.baselineB_RuleBERR.hallucinationRate * 100).toFixed(1)}%`,
      'Policy Comp': `${(report.baselineB_RuleBERR.policyComplianceRate * 100).toFixed(1)}%`,
      'Financial Safety': `${(report.baselineB_RuleBERR.financialSafetyRate * 100).toFixed(1)}%`,
      'Missing Evid F1': `${(report.baselineB_RuleBERR.missingEvidenceF1 * 100).toFixed(1)}%`,
      'Avg Latency': `${report.baselineB_RuleBERR.avgLatencyMs}ms`
    },
    {
      Paradigm: report.baselineC_MultiAgent.name,
      'Citation Acc': `${(report.baselineC_MultiAgent.citationAccuracy * 100).toFixed(1)}%`,
      'Hallucination': `${(report.baselineC_MultiAgent.hallucinationRate * 100).toFixed(1)}%`,
      'Policy Comp': `${(report.baselineC_MultiAgent.policyComplianceRate * 100).toFixed(1)}%`,
      'Financial Safety': `${(report.baselineC_MultiAgent.financialSafetyRate * 100).toFixed(1)}%`,
      'Missing Evid F1': `${(report.baselineC_MultiAgent.missingEvidenceF1 * 100).toFixed(1)}%`,
      'Avg Latency': `${report.baselineC_MultiAgent.avgLatencyMs}ms`
    }
  ]);

  console.log('\nEXECUTIVE SUMMARY:');
  console.log(report.safetyComparisonSummary);
  console.log('========================================================================\n');
}

main().catch(err => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
