/**
 * API Route: /api/demo/paypal-investigation
 * 
 * Executes the complete 13-stage end-to-end PayPal demonstration scenario.
 */

import { NextResponse } from 'next/server';
import { PayPalDemoService } from '@/server/services/paypal-demo.service';

export async function POST() {
  try {
    const result = await PayPalDemoService.executeFullDemonstration();
    return NextResponse.json({
      success: true,
      message: 'PayPal Hackathon Demonstration executed successfully.',
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Demo] Error executing PayPal demo scenario:', err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
