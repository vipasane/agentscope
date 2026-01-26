/**
 * Error monitoring and reporting examples
 */

import { ErrorReporter, ConsoleReporterBackend, BatchReporterBackend } from '../src/reporter/error-reporter.js';
import { ErrorFactory } from '../src/base/error-factory.js';
import { ErrorHandler } from '../src/handler/error-handler.js';

// ===== 1. Console Reporting =====

async function consoleReporting() {
  console.log('\n=== Console Reporting ===');

  const backend = new ConsoleReporterBackend();
  const reporter = new ErrorReporter(backend, 'development', '1.0.0');

  // Report error
  const error = ErrorFactory.validation('Invalid input data');
  const reportId = await reporter.report(error, {
    service: 'api',
    endpoint: '/users',
  });

  console.log(`Error reported with ID: ${reportId}`);
}

// ===== 2. Batch Reporting =====

async function batchReporting() {
  console.log('\n=== Batch Reporting ===');

  const reports: any[] = [];

  const flushFn = async (batch: any[]) => {
    reports.push(...batch);
    console.log(`[Batch] Flushed ${batch.length} error reports`);
  };

  const backend = new BatchReporterBackend(flushFn, 1000, 5);
  const reporter = new ErrorReporter(backend, 'production');

  // Report multiple errors
  for (let i = 0; i < 3; i++) {
    const error = ErrorFactory.network(`Network error ${i + 1}`);
    await reporter.report(error, { attempt: i + 1 });
  }

  // Flush remaining
  await backend.flush();

  console.log(`Total reports collected: ${reports.length}`);
  backend.destroy();
}

// ===== 3. Tagged Error Reporting =====

async function taggedReporting() {
  console.log('\n=== Tagged Error Reporting ===');

  const backend = new ConsoleReporterBackend();
  const reporter = new ErrorReporter(backend, 'production', '2.0.0');

  // Add global tags
  reporter
    .addTag('app', 'claude-flow')
    .addTag('region', 'us-east-1')
    .addTag('team', 'backend');

  // Report with additional tags
  const error = ErrorFactory.agent('Agent timeout');
  const reportId = await reporter.report(error, {
    service: 'agent-executor',
    agentType: 'coder',
  });

  console.log(`Report ID: ${reportId}`);
}

// ===== 4. Contextual Error Reporting =====

async function contextualReporting() {
  console.log('\n=== Contextual Error Reporting ===');

  const backend = new ConsoleReporterBackend();
  const reporter = new ErrorReporter(backend, 'production');

  // Report with context metadata
  const error = ErrorFactory.database('Query timeout', {
    operation: 'batch_insert',
    component: 'data_layer',
  });

  await reporter.report(
    error,
    { service: 'api', endpoint: '/data' },
    {
      duration: 5000,
      rowsProcessed: 1000,
      rowsRemaining: 500,
      queryId: 'query-12345',
      timestamp: new Date().toISOString(),
    }
  );
}

// ===== 5. Custom Monitoring Backend =====

class CustomMonitoringBackend {
  private alerts: any[] = [];

  async report(report: any): Promise<void> {
    // Simulate sending to monitoring service
    if (report.error.severity === 'critical') {
      this.alerts.push({
        type: 'CRITICAL_ALERT',
        timestamp: Date.now(),
        error: report.error.code,
        message: report.error.message,
      });

      console.log(`[Monitor] CRITICAL ALERT: ${report.error.message}`);
    } else {
      console.log(`[Monitor] Error recorded: ${report.error.code}`);
    }
  }

  async health(): Promise<boolean> {
    return true;
  }

  getAlerts() {
    return [...this.alerts];
  }
}

async function customBackendReporting() {
  console.log('\n=== Custom Backend Reporting ===');

  const backend = new CustomMonitoringBackend();
  const reporter = new ErrorReporter(backend, 'production');

  // Report critical error
  const criticalError = ErrorFactory.security('Unauthorized access detected');
  await reporter.report(criticalError, { action: 'login_attempt' });

  // Report non-critical error
  const warning = ErrorFactory.validation('Invalid data format');
  await reporter.report(warning);

  // Check alerts
  console.log(`Alerts collected: ${(backend as any).getAlerts().length}`);
}

// ===== 6. Error Reporting with Handler Integration =====

async function handlerIntegration() {
  console.log('\n=== Handler Integration ===');

  const backend = new ConsoleReporterBackend();
  const reporter = new ErrorReporter(backend, 'production', '1.5.0');

  // Create handler that reports errors
  const handler = ErrorHandler.getInstance({
    listeners: [
      {
        onError: async (error, context) => {
          // Report to monitoring system
          await reporter.report(error, {
            source: 'error_handler',
            handledBy: context?.component,
          });
        },
      },
    ],
  });

  // Handle error
  const error = ErrorFactory.memory('Out of memory');
  await handler.handle(error, { component: 'cache_manager' });
}

// ===== 7. Health Checks =====

async function healthChecks() {
  console.log('\n=== Health Checks ===');

  const backend = new ConsoleReporterBackend();
  const reporter = new ErrorReporter(backend);

  const health = await reporter.health();
  console.log(`Reporter health: ${health ? 'HEALTHY' : 'UNHEALTHY'}`);

  // With batch backend
  const batchBackend = new BatchReporterBackend(
    async () => {
      console.log('[Health] Batch flush successful');
    },
    5000,
    100
  );

  const batchReporter = new ErrorReporter(batchBackend);
  const batchHealth = await batchReporter.health();
  console.log(`Batch reporter health: ${batchHealth ? 'HEALTHY' : 'UNHEALTHY'}`);

  batchBackend.destroy();
}

// ===== 8. PII Redaction in Reports =====

async function piiRedaction() {
  console.log('\n=== PII Redaction in Reports ===');

  const backend = new ConsoleReporterBackend();
  const reporter = new ErrorReporter(backend, 'production');

  // Enable PII redaction
  reporter.setPiiRedaction(true);

  // Report error with PII
  const error = ErrorFactory.validation(
    'User john.doe@example.com with SSN 123-45-6789 failed validation'
  );

  const reportId = await reporter.report(error);
  console.log(`Report ID: ${reportId} (PII redacted)`);
}

// ===== Main =====

async function main() {
  try {
    await consoleReporting();
    await batchReporting();
    await taggedReporting();
    await contextualReporting();
    await customBackendReporting();
    await handlerIntegration();
    await healthChecks();
    await piiRedaction();
  } catch (error) {
    console.error('Example error:', error);
  }
}

main();
