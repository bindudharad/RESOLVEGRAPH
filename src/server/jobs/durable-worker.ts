export type JobType =
  | 'PURCHASE_INGESTION'
  | 'EVIDENCEGUARD_ANALYSIS'
  | 'DELIVERY_REMINDER_CHECK'
  | 'STORAGE_RECONCILIATION'
  | 'WEBHOOK_RECONCILIATION';

export interface DurableJob<T = Record<string, unknown>> {
  id: string;
  type: JobType;
  payload: T;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  maxRetries: number;
  retryCount: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRY_SCHEDULED';
  error?: string;
  scheduledAt: string;
  completedAt?: string;
}

export class DurableJobWorker {
  private queue: DurableJob[] = [];
  private isRunning: boolean = false;

  public enqueue<T = Record<string, unknown>>(
    type: JobType,
    payload: T,
    options?: { priority?: DurableJob['priority']; maxRetries?: number }
  ): DurableJob<T> {
    const job: DurableJob<T> = {
      id: `JOB_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      priority: options?.priority || 'NORMAL',
      maxRetries: options?.maxRetries ?? 3,
      retryCount: 0,
      status: 'QUEUED',
      scheduledAt: new Date().toISOString(),
    };

    this.queue.push(job as DurableJob);
    return job;
  }

  public getQueueSnapshot(): {
    total: number;
    queued: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.queue.length,
      queued: this.queue.filter((j) => j.status === 'QUEUED' || j.status === 'RETRY_SCHEDULED').length,
      completed: this.queue.filter((j) => j.status === 'COMPLETED').length,
      failed: this.queue.filter((j) => j.status === 'FAILED').length,
    };
  }

  public async processNextJob(): Promise<DurableJob | null> {
    const job = this.queue.find((j) => j.status === 'QUEUED');
    if (!job) return null;

    job.status = 'PROCESSING';
    try {
      // Execute job processor based on type
      if (job.type === 'DELIVERY_REMINDER_CHECK') {
        // Run scheduled delivery check
      } else if (job.type === 'STORAGE_RECONCILIATION') {
        // Run storage audit scan
      }
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      return job;
    } catch (err: unknown) {
      job.retryCount++;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (job.retryCount >= job.maxRetries) {
        job.status = 'FAILED';
        job.error = msg;
      } else {
        job.status = 'RETRY_SCHEDULED';
        job.error = `Attempt ${job.retryCount} failed: ${msg}`;
      }
      return job;
    }
  }
}

export const durableJobWorker = new DurableJobWorker();
