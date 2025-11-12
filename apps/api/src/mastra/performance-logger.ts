import { Logger } from "@renisa-ai/config/types";

/**
 * Performance Logger
 *
 * Hierarchical timing logger for debugging end-to-end performance with sub-operations.
 * Tracks execution time at each step: Orchestrator → LLM → FNOL Agent → Memory, etc.
 *
 * Usage:
 * ```typescript
 * const perf = new PerformanceLogger("orchestrator-request");
 * perf.start();
 *
 * const llmTimer = perf.startStep("llm-call");
 * // ... LLM call
 * llmTimer.end();
 *
 * perf.end();
 * perf.logSummary();
 * ```
 */

export interface TimingStep {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  children: TimingStep[];
  metadata?: Record<string, any>;
}

export interface PerformanceLoggerOptions {
  logger?: Logger;
  logLevel?: "debug" | "info" | "warn";
  enableConsole?: boolean;
  includeMetadata?: boolean;
}

export class PerformanceLogger {
  private rootStep: TimingStep;
  private currentStep: TimingStep;
  private stepStack: TimingStep[] = [];
  private options: Required<PerformanceLoggerOptions>;

  constructor(
    operationName: string,
    options: PerformanceLoggerOptions = {}
  ) {
    this.options = {
      logger: options.logger as any,
      logLevel: options.logLevel || "info",
      enableConsole: options.enableConsole ?? true,
      includeMetadata: options.includeMetadata ?? true,
    };

    this.rootStep = {
      name: operationName,
      startTime: 0,
      children: [],
    };
    this.currentStep = this.rootStep;
  }

  /**
   * Start the root operation timer
   */
  start(metadata?: Record<string, any>): void {
    this.rootStep.startTime = performance.now();
    if (metadata) {
      this.rootStep.metadata = metadata;
    }

    if (this.options.enableConsole) {
      const timestamp = new Date().toISOString();
      console.log(`\n🚀 START: ${this.rootStep.name} [${timestamp}]`);
      if (metadata) {
        console.log(`   Metadata:`, metadata);
      }
    }
  }

  /**
   * Start a sub-operation (child step)
   * Returns a StepTimer to end the step later
   */
  startStep(stepName: string, metadata?: Record<string, any>): StepTimer {
    const step: TimingStep = {
      name: stepName,
      startTime: performance.now(),
      children: [],
      metadata,
    };

    this.currentStep.children.push(step);
    this.stepStack.push(this.currentStep);
    this.currentStep = step;

    if (this.options.enableConsole) {
      const indent = "  ".repeat(this.stepStack.length);
      const timestamp = new Date().toISOString();
      console.log(`${indent}▶ ${stepName} [${timestamp}]`);
      if (metadata) {
        console.log(`${indent}  Metadata:`, metadata);
      }
    }

    return new StepTimer(this, step);
  }

  /**
   * End the current step (called by StepTimer)
   */
  endStep(step: TimingStep, metadata?: Record<string, any>): void {
    step.endTime = performance.now();
    step.duration = step.endTime - step.startTime;

    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }

    if (this.options.enableConsole) {
      const indent = "  ".repeat(this.stepStack.length);
      const durationStr = this.formatDuration(step.duration);
      const timestamp = new Date().toISOString();
      console.log(`${indent}✓ ${step.name} (${durationStr}) [${timestamp}]`);
      if (metadata) {
        console.log(`${indent}  Result:`, metadata);
      }
    }

    // Pop back to parent step
    if (this.stepStack.length > 0) {
      this.currentStep = this.stepStack.pop()!;
    }
  }

  /**
   * End the root operation timer
   */
  end(metadata?: Record<string, any>): void {
    this.rootStep.endTime = performance.now();
    this.rootStep.duration = this.rootStep.endTime - this.rootStep.startTime;

    if (metadata) {
      this.rootStep.metadata = { ...this.rootStep.metadata, ...metadata };
    }

    if (this.options.enableConsole) {
      const durationStr = this.formatDuration(this.rootStep.duration);
      const timestamp = new Date().toISOString();
      console.log(`\n✅ END: ${this.rootStep.name} (${durationStr}) [${timestamp}]\n`);
    }
  }

  /**
   * Log a detailed summary with hierarchical timing breakdown
   */
  logSummary(): void {
    const summary = this.generateSummary();

    if (this.options.enableConsole) {
      console.log("\n" + "=".repeat(80));
      console.log("📊 PERFORMANCE SUMMARY");
      console.log("=".repeat(80));
      console.log(summary);
      console.log("=".repeat(80) + "\n");
    }

    if (this.options.logger) {
      this.options.logger[this.options.logLevel]("Performance Summary", {
        operation: this.rootStep.name,
        totalDuration: this.rootStep.duration,
        steps: this.serializeSteps(this.rootStep),
      });
    }
  }

  /**
   * Get timing data as JSON for logging/analysis
   */
  getTimingData(): TimingStep {
    return this.rootStep;
  }

  /**
   * Generate a formatted text summary
   */
  private generateSummary(): string {
    const lines: string[] = [];

    lines.push(`Operation: ${this.rootStep.name}`);
    lines.push(`Total Duration: ${this.formatDuration(this.rootStep.duration!)}`);
    lines.push("");
    lines.push("Breakdown:");
    lines.push("");

    this.generateStepSummary(this.rootStep, lines, 0);

    // Add percentage breakdown
    lines.push("");
    lines.push("Time Distribution:");
    this.generatePercentageBreakdown(this.rootStep, lines);

    return lines.join("\n");
  }

  /**
   * Generate hierarchical step summary
   */
  private generateStepSummary(
    step: TimingStep,
    lines: string[],
    level: number
  ): void {
    const indent = "  ".repeat(level);
    const duration = step.duration ?? 0;
    const percentage = this.rootStep.duration
      ? ((duration / this.rootStep.duration) * 100).toFixed(1)
      : "0.0";

    if (level > 0) {
      lines.push(
        `${indent}├─ ${step.name}: ${this.formatDuration(duration)} (${percentage}%)`
      );
    }

    if (this.options.includeMetadata && step.metadata) {
      const metadataStr = JSON.stringify(step.metadata, null, 2)
        .split("\n")
        .map((line) => `${indent}   ${line}`)
        .join("\n");
      lines.push(metadataStr);
    }

    // Sort children by duration (slowest first)
    const sortedChildren = [...step.children].sort(
      (a, b) => (b.duration ?? 0) - (a.duration ?? 0)
    );

    for (const child of sortedChildren) {
      this.generateStepSummary(child, lines, level + 1);
    }
  }

  /**
   * Generate percentage breakdown of top-level operations
   */
  private generatePercentageBreakdown(
    step: TimingStep,
    lines: string[]
  ): void {
    if (step.children.length === 0) return;

    const total = step.duration ?? 0;
    const sortedChildren = [...step.children].sort(
      (a, b) => (b.duration ?? 0) - (a.duration ?? 0)
    );

    for (const child of sortedChildren) {
      const duration = child.duration ?? 0;
      const percentage = total ? ((duration / total) * 100).toFixed(1) : "0.0";
      const bar = this.createPercentageBar(parseFloat(percentage));
      lines.push(
        `  ${child.name.padEnd(30)} ${bar} ${percentage.padStart(5)}% (${this.formatDuration(duration)})`
      );
    }
  }

  /**
   * Create a visual percentage bar
   */
  private createPercentageBar(percentage: number): string {
    const barLength = 20;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
  }

  /**
   * Format duration in human-readable form
   */
  private formatDuration(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  /**
   * Serialize steps for structured logging
   */
  private serializeSteps(step: TimingStep): any {
    return {
      name: step.name,
      duration: step.duration,
      metadata: step.metadata,
      children: step.children.map((child) => this.serializeSteps(child)),
    };
  }
}

/**
 * StepTimer - Returned by startStep() to end the step
 */
export class StepTimer {
  constructor(
    private logger: PerformanceLogger,
    private step: TimingStep
  ) {}

  /**
   * End this step and record duration
   */
  end(metadata?: Record<string, any>): void {
    this.logger.endStep(this.step, metadata);
  }

  /**
   * Add metadata without ending the step
   */
  addMetadata(key: string, value: any): void {
    if (!this.step.metadata) {
      this.step.metadata = {};
    }
    this.step.metadata[key] = value;
  }
}

/**
 * Global performance logger registry for request tracking
 */
class PerformanceLoggerRegistry {
  private loggers = new Map<string, PerformanceLogger>();

  /**
   * Create or get a logger for a request ID
   */
  getOrCreate(
    requestId: string,
    operationName?: string,
    options?: PerformanceLoggerOptions
  ): PerformanceLogger {
    if (!this.loggers.has(requestId)) {
      const logger = new PerformanceLogger(
        operationName || requestId,
        options
      );
      this.loggers.set(requestId, logger);
    }
    return this.loggers.get(requestId)!;
  }

  /**
   * Remove logger and return final timing data
   */
  finalize(requestId: string): TimingStep | undefined {
    const logger = this.loggers.get(requestId);
    if (logger) {
      this.loggers.delete(requestId);
      return logger.getTimingData();
    }
    return undefined;
  }

  /**
   * Clean up old loggers (for long-running processes)
   */
  cleanup(maxAge: number = 300000): void {
    // Remove loggers older than maxAge (default 5 minutes)
    const now = performance.now();
    for (const [requestId, logger] of this.loggers.entries()) {
      const timingData = logger.getTimingData();
      if (timingData.startTime && now - timingData.startTime > maxAge) {
        this.loggers.delete(requestId);
      }
    }
  }
}

export const perfLoggerRegistry = new PerformanceLoggerRegistry();
