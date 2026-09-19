/**
 * Structured Cloud Logging for Google Cloud Functions (2nd Gen)
 * Outputs single-line JSON with severity, message, and execution metadata
 * adhering to Google Cloud Logging format specifications.
 */

export type LogSeverity = 'DEFAULT' | 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface StructuredLogPayload {
  severity: LogSeverity;
  message: string;
  component: string;
  action?: string;
  traceId?: string;
  eventId?: string;
  catalogId?: string;
  origin?: string;
  errorDetails?: {
    name?: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
  timestamp: string;
}

export class NexosLogger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  private write(severity: LogSeverity, message: string, extra?: Partial<StructuredLogPayload>) {
    const logPayload: StructuredLogPayload = {
      severity,
      message,
      component: this.component,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    const formatted = JSON.stringify(logPayload);
    if (severity === 'ERROR' || severity === 'CRITICAL') {
      console.error(formatted);
    } else if (severity === 'WARNING') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(message: string, extra?: Partial<StructuredLogPayload>) {
    this.write('DEBUG', message, extra);
  }

  info(message: string, extra?: Partial<StructuredLogPayload>) {
    this.write('INFO', message, extra);
  }

  notice(message: string, extra?: Partial<StructuredLogPayload>) {
    this.write('NOTICE', message, extra);
  }

  warn(message: string, extra?: Partial<StructuredLogPayload>) {
    this.write('WARNING', message, extra);
  }

  error(message: string, error?: unknown, extra?: Partial<StructuredLogPayload>) {
    const errObj = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

    this.write('ERROR', message, {
      ...extra,
      errorDetails: errObj,
    });
  }

  critical(message: string, error?: unknown, extra?: Partial<StructuredLogPayload>) {
    const errObj = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

    this.write('CRITICAL', message, {
      ...extra,
      errorDetails: errObj,
    });
  }
}
