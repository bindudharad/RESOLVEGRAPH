import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { getPayPalConfig } from '@/server/paypal/paypal-config';
import { isAIProcessingEnabled } from '@/server/ai/providers/provider-factory';

const START_TIME = Date.now();

export async function GET() {
  try {
    const dbPath = path.resolve(process.cwd(), 'dev.db');
    const dbExists = fs.existsSync(dbPath);
    let dbSize = 0;
    if (dbExists) {
      const stats = fs.statSync(dbPath);
      dbSize = stats.size;
    }

    // Ping SQLite database counts
    const [
      userCount,
      caseCount,
      evidenceCount,
      claimsCount,
      orderCount,
      agentRunCount,
      queuedAnalysis,
      runningAnalysis
    ] = await Promise.all([
      prisma.user.count(),
      prisma.caseRecord.count(),
      prisma.evidence.count(),
      prisma.claim.count(),
      prisma.commerceOrder.count(),
      prisma.agentRun.count(),
      prisma.aIAnalysisRun.count({ where: { status: 'QUEUED' } }),
      prisma.aIAnalysisRun.count({ where: { status: 'RUNNING' } }),
    ]);

    const paypalConfig = getPayPalConfig();
    const aiEnabled = isAIProcessingEnabled();
    const aiProvider = process.env.AI_PROVIDER || 'test';

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      database: {
        type: 'sqlite',
        adapter: '@prisma/adapter-better-sqlite3',
        connected: true,
        sqliteFileExists: dbExists,
        sqliteSizeBytes: dbSize,
        stats: {
          users: userCount,
          cases: caseCount,
          evidence: evidenceCount,
          claims: claimsCount,
          commerceOrders: orderCount,
          agentRuns: agentRunCount,
        },
      },
      aiEngine: {
        provider: aiProvider,
        processingEnabled: aiEnabled,
        hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
        modelTier: aiProvider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') : 'deterministic-test-v1',
      },
      paypal: {
        mode: paypalConfig.providerType,
        configured: Boolean(paypalConfig.clientId && paypalConfig.clientSecret),
        environment: paypalConfig.env,
      },
      workerQueue: {
        queuedJobs: queuedAnalysis,
        activeJobs: runningAnalysis,
        status: queuedAnalysis > 0 ? 'PROCESSING' : 'IDLE',
      },
      prismaVersion: '7.10.1',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database connection error',
        database: {
          connected: false,
        },
      },
      { status: 500 }
    );
  }
}
