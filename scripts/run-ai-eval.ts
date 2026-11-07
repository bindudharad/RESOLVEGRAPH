import { EvaluationRunner } from '../src/server/ai/evaluation/evaluation-runner';

async function main() {
  console.log('========================================================================');
  console.log('           RESOLVEGRAPH — BERR AI BENCHMARK EVALUATION RUNNER           ');
  console.log('========================================================================');
  console.log('Running 30 labelled commerce resolution scenarios across 3 baselines...\n');

  const start = Date.now();
  const results = await EvaluationRunner.runBenchmark();
  const duration = Date.now() - start;

  console.table({
    'Baseline A (Exact Matching)': {
      'Total Scenarios': results.baselineA_Exact.totalScenarios,
      'Accuracy': `${(results.baselineA_Exact.accuracy * 100).toFixed(1)}%`,
      'Precision': `${(results.baselineA_Exact.precision * 100).toFixed(1)}%`,
      'Recall': `${(results.baselineA_Exact.recall * 100).toFixed(1)}%`,
      'F1 Score': results.baselineA_Exact.f1Score.toFixed(3),
      'Injection Defense': `${(results.baselineA_Exact.injectionDetectionRate * 100).toFixed(1)}%`,
      'Calibration MAE': results.baselineA_Exact.discrepancyCalibrationMAE.toFixed(3),
      'Avg Latency': `${results.baselineA_Exact.latencyAvgMs}ms`
    },
    'Baseline B (Raw LLM-Only)': {
      'Total Scenarios': results.baselineB_LLMOnly.totalScenarios,
      'Accuracy': `${(results.baselineB_LLMOnly.accuracy * 100).toFixed(1)}%`,
      'Precision': `${(results.baselineB_LLMOnly.precision * 100).toFixed(1)}%`,
      'Recall': `${(results.baselineB_LLMOnly.recall * 100).toFixed(1)}%`,
      'F1 Score': results.baselineB_LLMOnly.f1Score.toFixed(3),
      'Injection Defense': `${(results.baselineB_LLMOnly.injectionDetectionRate * 100).toFixed(1)}%`,
      'Calibration MAE': results.baselineB_LLMOnly.discrepancyCalibrationMAE.toFixed(3),
      'Avg Latency': `${results.baselineB_LLMOnly.latencyAvgMs}ms`
    },
    'Baseline C (BERR Hybrid)': {
      'Total Scenarios': results.baselineC_BERRHybrid.totalScenarios,
      'Accuracy': `${(results.baselineC_BERRHybrid.accuracy * 100).toFixed(1)}%`,
      'Precision': `${(results.baselineC_BERRHybrid.precision * 100).toFixed(1)}%`,
      'Recall': `${(results.baselineC_BERRHybrid.recall * 100).toFixed(1)}%`,
      'F1 Score': results.baselineC_BERRHybrid.f1Score.toFixed(3),
      'Injection Defense': `${(results.baselineC_BERRHybrid.injectionDetectionRate * 100).toFixed(1)}%`,
      'Calibration MAE': results.baselineC_BERRHybrid.discrepancyCalibrationMAE.toFixed(3),
      'Avg Latency': `${results.baselineC_BERRHybrid.latencyAvgMs}ms`
    }
  });

  console.log('\nBenchmark Summary:');
  console.log(results.summary);
  console.log(`\nCompleted in ${duration}ms with exit code 0.`);
}

main().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
