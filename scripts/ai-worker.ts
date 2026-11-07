import os from 'node:os';
import { AnalysisQueue } from '../src/server/ai/jobs/analysis-queue';

const isOnce = process.argv.includes('--once');
const workerId = `worker-${os.hostname()}-${process.pid}`;

console.log(`[AI Worker] Starting ResolveGraph AI Worker (${workerId}) | Mode: ${isOnce ? 'ONCE' : 'CONTINUOUS_LOOP'}`);

let running = true;

process.on('SIGINT', () => {
  console.log('\n[AI Worker] Received SIGINT. Shutting down gracefully...');
  running = false;
});

process.on('SIGTERM', () => {
  console.log('\n[AI Worker] Received SIGTERM. Shutting down gracefully...');
  running = false;
});

async function main() {
  while (running) {
    try {
      const job = await AnalysisQueue.acquireNextJob(workerId);
      if (job) {
        console.log(`[AI Worker] Acquired Job ${job.id} for Case ${job.caseId} (Attempt ${job.attemptCount}/${job.maxAttempts})`);
        const result = await AnalysisQueue.processJob(job.id);
        console.log(`[AI Worker] Job ${job.id} Completed with Status: ${result.status} in ${result.durationMs}ms`);

        if (isOnce) break;
      } else {
        if (isOnce) {
          console.log('[AI Worker] No pending jobs in queue. Exiting.');
          break;
        }
        // Wait 2 seconds before next poll
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[AI Worker] Error processing job:', message);
      if (isOnce) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log('[AI Worker] Worker stopped.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[AI Worker] Fatal worker error:', err);
  process.exit(1);
});
