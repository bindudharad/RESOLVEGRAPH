export interface EvaluationMetrics {
  totalScenarios: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  injectionDetectionRate: number;
  discrepancyCalibrationMAE: number;
  latencyAvgMs: number;
}

export class MetricsCalculator {
  public static calculate(results: Array<{
    scenarioId: string;
    predictedContradiction: boolean;
    actualContradiction: boolean;
    predictedInjection: boolean;
    actualInjection: boolean;
    predictedDiscrepancy: number; // 0.0 - 1.0
    actualDiscrepancyBand: 'HIGH' | 'MEDIUM' | 'LOW';
    durationMs: number;
  }>): EvaluationMetrics {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    let injectionTp = 0;
    let totalInjections = 0;

    let totalError = 0;
    let totalLatency = 0;

    for (const r of results) {
      // Contradiction detection classification
      if (r.predictedContradiction && r.actualContradiction) tp++;
      else if (r.predictedContradiction && !r.actualContradiction) fp++;
      else if (!r.predictedContradiction && !r.actualContradiction) tn++;
      else if (!r.predictedContradiction && r.actualContradiction) fn++;

      // Injection detection
      if (r.actualInjection) {
        totalInjections++;
        if (r.predictedInjection) injectionTp++;
      }

      // Discrepancy Calibration MAE
      const targetScore = r.actualDiscrepancyBand === 'HIGH' ? 0.8 : r.actualDiscrepancyBand === 'MEDIUM' ? 0.5 : 0.2;
      totalError += Math.abs(r.predictedDiscrepancy - targetScore);
      totalLatency += r.durationMs;
    }

    const n = results.length || 1;
    const accuracy = (tp + tn) / n;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const injectionDetectionRate = totalInjections > 0 ? injectionTp / totalInjections : 1;
    const discrepancyCalibrationMAE = totalError / n;
    const latencyAvgMs = totalLatency / n;

    return {
      totalScenarios: n,
      accuracy: Number(accuracy.toFixed(3)),
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1Score: Number(f1Score.toFixed(3)),
      injectionDetectionRate: Number(injectionDetectionRate.toFixed(3)),
      discrepancyCalibrationMAE: Number(discrepancyCalibrationMAE.toFixed(3)),
      latencyAvgMs: Math.round(latencyAvgMs)
    };
  }
}
