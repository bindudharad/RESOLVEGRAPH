/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { InvestigationReportService } from '@/server/services/investigation-report.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    if (format === 'markdown' || format === 'md' || format === 'pdf') {
      const md = await InvestigationReportService.generateMarkdownReport(caseId, {
        includeSensitivePii: user.isPlatformAdmin,
        requestingUserRole: user.role as any,
      });

      return new NextResponse(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `inline; filename="investigation_report_${caseId}.md"`,
        },
      });
    }

    if (format === 'csv') {
      const csv = await InvestigationReportService.generateCsvReconciliation(caseId);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="reconciliation_${caseId}.csv"`,
        },
      });
    }

    // Default: JSON report
    const jsonReport = await InvestigationReportService.generateJsonReport(caseId, {
      includeSensitivePii: user.isPlatformAdmin,
      requestingUserRole: user.role as any,
    });

    return NextResponse.json({ success: true, data: jsonReport });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Report generation failed' }, { status: 500 });
  }
}
