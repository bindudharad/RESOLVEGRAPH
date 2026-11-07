/**
 * RESOLVEGRAPH — Step 5: Semantic Drift & Commercial Commitment Engine
 * Tracks exact, semantic, and temporal divergence across purchase, dispatch, delivery, and claim stages.
 */

export interface DriftObservation {
  driftCategory: "EXACT_ATTRIBUTE" | "SEMANTIC_SPECIFICATION" | "TEMPORAL_WINDOW";
  fieldKey: string;
  sourceStage: string;
  targetStage: string;
  expectedValue: string;
  observedValue: string;
  discrepancySeverity: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
  transitionPoint: string; // e.g. "ORDER_TO_DISPATCH"
}

export interface DriftAnalysisResult {
  hasDrift: boolean;
  overallDriftScore: number; // 0.0 to 1.0
  earliestTransitionWithDrift: string | null;
  observations: DriftObservation[];
  summary: string;
}

export interface CommercialStageFact {
  stage: "OFFER" | "ORDER" | "DISPATCH" | "DELIVERY" | "CLAIM";
  fieldKey: string;
  value: string;
  date?: string;
}

export class SemanticDriftEngine {
  /**
   * Evaluates drift across stages given a list of commercial facts.
   */
  public static analyzeDrift(facts: CommercialStageFact[]): DriftAnalysisResult {
    const observations: DriftObservation[] = [];

    // Group facts by fieldKey
    const byKey = new Map<string, Map<string, CommercialStageFact>>();
    for (const f of facts) {
      if (!byKey.has(f.fieldKey)) {
        byKey.set(f.fieldKey, new Map());
      }
      byKey.get(f.fieldKey)!.set(f.stage, f);
    }

    // Sequence of stages
    const stageSequence: Array<"OFFER" | "ORDER" | "DISPATCH" | "DELIVERY" | "CLAIM"> = [
      "OFFER",
      "ORDER",
      "DISPATCH",
      "DELIVERY",
      "CLAIM",
    ];

    for (const [key, stages] of byKey.entries()) {
      for (let i = 0; i < stageSequence.length - 1; i++) {
        const fromStage = stageSequence[i];
        const toStage = stageSequence[i + 1];

        const factFrom = stages.get(fromStage);
        const factTo = stages.get(toStage);

        if (factFrom && factTo) {
          const valA = factFrom.value.trim().toLowerCase();
          const valB = factTo.value.trim().toLowerCase();

          if (valA !== valB) {
            const isExactKey = ["sku", "serial_number", "tracking_number", "quantity", "price"].includes(
              key.toLowerCase()
            );

            const category: DriftObservation["driftCategory"] = isExactKey
              ? "EXACT_ATTRIBUTE"
              : "SEMANTIC_SPECIFICATION";

            let severity: DriftObservation["discrepancySeverity"] = "MEDIUM";
            if (isExactKey) {
              severity = key.toLowerCase() === "price" || key.toLowerCase() === "sku" ? "HIGH" : "MEDIUM";
            }

            observations.push({
              driftCategory: category,
              fieldKey: key,
              sourceStage: fromStage,
              targetStage: toStage,
              expectedValue: factFrom.value,
              observedValue: factTo.value,
              discrepancySeverity: severity,
              explanation: `Divergence in ${key} identified between ${fromStage} ("${factFrom.value}") and ${toStage} ("${factTo.value}").`,
              transitionPoint: `${fromStage}_TO_${toStage}`,
            });
          }
        }
      }
    }

    // Check delivery temporal drift if delivery_window and actual_delivery exist
    const orderFact = facts.find((f) => f.stage === "ORDER" && f.fieldKey === "promised_delivery_date");
    const deliveryFact = facts.find(
      (f) => f.stage === "DELIVERY" && f.fieldKey === "actual_delivery_date"
    );

    if (orderFact?.date && deliveryFact?.date) {
      const promised = new Date(orderFact.date).getTime();
      const actual = new Date(deliveryFact.date).getTime();
      if (actual > promised) {
        const delayDays = Math.round((actual - promised) / (1000 * 3600 * 24));
        if (delayDays > 2) {
          observations.push({
            driftCategory: "TEMPORAL_WINDOW",
            fieldKey: "delivery_date",
            sourceStage: "ORDER",
            targetStage: "DELIVERY",
            expectedValue: orderFact.date,
            observedValue: deliveryFact.date,
            discrepancySeverity: delayDays > 7 ? "HIGH" : "MEDIUM",
            explanation: `Delivery completed ${delayDays} days past the promised delivery window.`,
            transitionPoint: "ORDER_TO_DELIVERY",
          });
        }
      }
    }

    const hasDrift = observations.length > 0;
    let score = 0;
    if (hasDrift) {
      const highCount = observations.filter((o) => o.discrepancySeverity === "HIGH").length;
      const medCount = observations.filter((o) => o.discrepancySeverity === "MEDIUM").length;
      score = Math.min(1.0, highCount * 0.4 + medCount * 0.2 + 0.1);
    }

    const earliestTransition = observations.length > 0 ? observations[0].transitionPoint : null;

    const summary = hasDrift
      ? `${observations.length} commercial drift point(s) detected. Earliest transition: ${earliestTransition}.`
      : "No commercial specification or temporal drift detected across transaction stages.";

    return {
      hasDrift,
      overallDriftScore: Number(score.toFixed(2)),
      earliestTransitionWithDrift: earliestTransition,
      observations,
      summary,
    };
  }
}
