/**
 * Controlled Agent Tool Registry
 * 
 * Provides type-safe registration, permission validation, execution timing,
 * and immutable tool invocation auditing.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ToolDefinition, AgentExecutionContext, ToolExecutionStatus } from '../types/agent.types';
import { FinancialActionGuardrails } from '../guardrails/financial-action-guardrails';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolDefinition> = new Map();

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!this.instance) {
      this.instance = new ToolRegistry();
    }
    return this.instance;
  }

  /**
   * Registers a strongly-typed tool into the registry.
   */
  public registerTool<TInput = Record<string, unknown>, TOutput = unknown>(
    tool: ToolDefinition<TInput, TOutput>
  ): void {
    if (this.tools.has(tool.name)) {
      // Overwrite or update tool registration cleanly
      this.tools.set(tool.name, tool as unknown as ToolDefinition);
      return;
    }
    this.tools.set(tool.name, tool as unknown as ToolDefinition);
  }

  /**
   * Retrieves a registered tool definition by name.
   */
  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Returns all registered tools.
   */
  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Checks whether the current user context is authorized to invoke this tool.
   */
  public isAuthorized(tool: ToolDefinition, ctx: AgentExecutionContext): { allowed: boolean; reason?: string } {
    if (ctx.actor.isPlatformAdmin) {
      return { allowed: true };
    }

    if (tool.requiredRole && tool.requiredRole.length > 0) {
      if (!tool.requiredRole.includes(ctx.actor.role)) {
        return {
          allowed: false,
          reason: `Tool "${tool.name}" requires user role [${tool.requiredRole.join(', ')}], but current user is "${ctx.actor.role}".`
        };
      }
    }

    if (tool.requiredOrgRole && tool.requiredOrgRole.length > 0 && ctx.actor.orgRole) {
      if (!tool.requiredOrgRole.includes(ctx.actor.orgRole)) {
        return {
          allowed: false,
          reason: `Tool "${tool.name}" requires org role [${tool.requiredOrgRole.join(', ')}], but current org role is "${ctx.actor.orgRole}".`
        };
      }
    }

    // Tenant isolation check
    if (!ctx.actor.isPlatformAdmin && ctx.organizationId && ctx.actor.organizationId && ctx.actor.organizationId !== ctx.organizationId) {
      return {
        allowed: false,
        reason: `Tenant isolation: Actor organization (${ctx.actor.organizationId}) does not match case organization (${ctx.organizationId}).`
      };
    }

    return { allowed: true };
  }

  /**
   * Executes a tool with schema validation, permission checks, timing, and database auditing.
   */
  public async executeTool(
    name: string,
    args: Record<string, unknown>,
    ctx: AgentExecutionContext,
    stepId?: string
  ): Promise<{ status: ToolExecutionStatus; data?: unknown; error?: string; durationMs: number }> {
    const start = Date.now();
    const tool = this.getTool(name);

    if (!tool) {
      const err = `Tool "${name}" is not registered in the agent registry.`;
      await this.recordInvocation({
        runId: ctx.runId,
        stepId,
        toolName: name,
        category: 'READ',
        inputJson: JSON.stringify(args),
        status: 'FAILED',
        error: err,
        durationMs: Date.now() - start
      });
      return { status: 'FAILED', error: err, durationMs: Date.now() - start };
    }

    // 1. Authorize User
    const authCheck = this.isAuthorized(tool, ctx);
    if (!authCheck.allowed) {
      const err = `Authorization denied: ${authCheck.reason}`;
      await this.recordInvocation({
        runId: ctx.runId,
        stepId,
        toolName: name,
        category: tool.category,
        inputJson: JSON.stringify(args),
        status: 'BLOCKED_GUARDRAIL',
        error: err,
        durationMs: Date.now() - start
      });
      return { status: 'BLOCKED_GUARDRAIL', error: err, durationMs: Date.now() - start };
    }

    // 2. Validate Parameters Schema
    if (tool.parametersSchema && typeof tool.parametersSchema.safeParse === 'function') {
      const parseResult = tool.parametersSchema.safeParse(args);
      if (!parseResult.success) {
        const issues = (parseResult as { error: z.ZodError }).error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        const err = `Invalid parameters for tool "${name}": ${issues}`;
        await this.recordInvocation({
          runId: ctx.runId,
          stepId,
          toolName: name,
          category: tool.category,
          inputJson: JSON.stringify(args),
          status: 'FAILED',
          error: err,
          durationMs: Date.now() - start
        });
        return { status: 'FAILED', error: err, durationMs: Date.now() - start };
      }
    }

    // 3. Inspect Financial & High-Risk Guardrails
    try {
      FinancialActionGuardrails.inspectAction(name, args);
    } catch (guardrailErr: unknown) {
      const err = guardrailErr instanceof Error ? guardrailErr.message : 'Blocked by Financial Guardrail.';
      await this.recordInvocation({
        runId: ctx.runId,
        stepId,
        toolName: name,
        category: tool.category,
        inputJson: JSON.stringify(args),
        status: 'BLOCKED_GUARDRAIL',
        error: err,
        durationMs: Date.now() - start
      });
      return { status: 'BLOCKED_GUARDRAIL', error: err, durationMs: Date.now() - start };
    }

    // 4. Execute tool
    try {
      const output = await tool.execute(args, ctx);
      const duration = Date.now() - start;

      await this.recordInvocation({
        runId: ctx.runId,
        stepId,
        toolName: name,
        category: tool.category,
        inputJson: JSON.stringify(args),
        outputJson: JSON.stringify(output),
        status: 'SUCCEEDED',
        durationMs: duration
      });

      return { status: 'SUCCEEDED', data: output, durationMs: duration };
    } catch (execErr: unknown) {
      const duration = Date.now() - start;
      const err = execErr instanceof Error ? execErr.message : `Execution of tool "${name}" failed.`;

      await this.recordInvocation({
        runId: ctx.runId,
        stepId,
        toolName: name,
        category: tool.category,
        inputJson: JSON.stringify(args),
        status: 'FAILED',
        error: err,
        durationMs: duration
      });

      return { status: 'FAILED', error: err, durationMs: duration };
    }
  }

  private async recordInvocation(data: {
    runId: string;
    stepId?: string;
    toolName: string;
    category: string;
    inputJson: string;
    outputJson?: string;
    status: ToolExecutionStatus;
    error?: string;
    durationMs: number;
  }): Promise<void> {
    try {
      if (!data.runId) return;
      const runExists = await prisma.agentRun.findUnique({
        where: { id: data.runId },
        select: { id: true }
      });
      if (!runExists) return;

      await prisma.agentToolInvocation.create({
        data: {
          runId: data.runId,
          stepId: data.stepId,
          toolName: data.toolName,
          toolCategory: data.category,
          inputJson: data.inputJson,
          outputJson: data.outputJson,
          status: data.status,
          error: data.error,
          durationMs: data.durationMs
        }
      });
    } catch (e) {
      console.warn('[ToolRegistry] Failed to record tool invocation audit:', e);
    }
  }
}
