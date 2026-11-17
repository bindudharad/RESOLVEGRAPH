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

    const now = new Date();
    // Ping SQLite database counts
    const [
      userCount,
      caseCount,
      evidenceCount,
      claimsCount,
      orderCount,
      agentRunCount,
      queuedAnalysis,
      activeAnalysis,
      stalledAnalysis,
      completedAnalysis,
      failedAnalysis
    ] = await Promise.all([
      prisma.user.count(),
      prisma.caseRecord.count(),
      prisma.evidence.count(),
      prisma.claim.count(),
      prisma.commerceOrder.count(),
      prisma.agentRun.count(),
      prisma.aIAnalysisRun.count({ where: { status: 'QUEUED' } }),
      prisma.aIAnalysisRun.count({
        where: {
          status: 'PROCESSING',
          leaseExpiresAt: { gte: now }
        }
      }),
      prisma.aIAnalysisRun.count({
        where: {
          status: 'PROCESSING',
          leaseExpiresAt: { lt: now }
        }
      }),
      prisma.aIAnalysisRun.count({ where: { status: { in: ['COMPLETED', 'NEEDS_HUMAN_REVIEW'] } } }),
      prisma.aIAnalysisRun.count({ where: { status: 'FAILED' } }),
    ]);

    const paypalConfig = getPayPalConfig();
    const aiEnabled = isAIProcessingEnabled();
    const aiProvider = process.env.AI_PROVIDER || 'test';
    const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    const hasLiveKey =
      (aiProvider === 'gemini' && hasGeminiKey) ||
      (aiProvider === 'openai' && hasOpenAiKey);

    let aiMode: 'LIVE_AI' | 'DETERMINISTIC' | 'TEST_MOCK' | 'DISABLED' | 'DEGRADED' = 'DETERMINISTIC';
    if (!aiEnabled) {
      aiMode = 'DISABLED';
    } else if (aiProvider === 'mock' || process.env.NODE_ENV === 'test') {
      aiMode = 'TEST_MOCK';
    } else if (hasLiveKey) {
      aiMode = 'LIVE_AI';
    } else if ((aiProvider === 'gemini' && !hasGeminiKey) || (aiProvider === 'openai' && !hasOpenAiKey)) {
      aiMode = 'DEGRADED';
    } else {
      aiMode = 'DETERMINISTIC';
    }

    let workerStatus = 'IDLE';
    if (activeAnalysis > 0) {
      workerStatus = 'ACTIVE';
    } else if (queuedAnalysis > 0) {
      workerStatus = 'WAITING_FOR_WORKER';
    } else if (stalledAnalysis > 0) {
      workerStatus = 'STALLED_RECLAIMABLE';
    }

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
        mode: aiMode,
        processingEnabled: aiEnabled,
        hasProviderKey: hasLiveKey,
        hasOpenAiKey,
        hasGeminiKey,
        modelTier:
          aiProvider === 'openai'
            ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
            : aiProvider === 'gemini'
            ? process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash'
            : 'deterministic-berr-v2',
      },
      paypal: {
        mode: paypalConfig.providerType,
        configured: Boolean(paypalConfig.clientId && paypalConfig.clientSecret),
        environment: paypalConfig.env,
      },
      workerQueue: {
        queuedJobs: queuedAnalysis,
        activeJobs: activeAnalysis,
        stalledJobs: stalledAnalysis,
        completedJobs: completedAnalysis,
        failedJobs: failedAnalysis,
        status: workerStatus,
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
