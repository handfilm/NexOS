"use strict";
/**
 * Structured Cloud Logging for Google Cloud Functions (2nd Gen)
 * Outputs single-line JSON with severity, message, and execution metadata
 * adhering to Google Cloud Logging format specifications.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NexosLogger = void 0;
class NexosLogger {
    constructor(component) {
        this.component = component;
    }
    write(severity, message, extra) {
        const logPayload = {
            severity,
            message,
            component: this.component,
            timestamp: new Date().toISOString(),
            ...extra,
        };
        const formatted = JSON.stringify(logPayload);
        if (severity === 'ERROR' || severity === 'CRITICAL') {
            console.error(formatted);
        }
        else if (severity === 'WARNING') {
            console.warn(formatted);
        }
        else {
            console.log(formatted);
        }
    }
    debug(message, extra) {
        this.write('DEBUG', message, extra);
    }
    info(message, extra) {
        this.write('INFO', message, extra);
    }
    notice(message, extra) {
        this.write('NOTICE', message, extra);
    }
    warn(message, extra) {
        this.write('WARNING', message, extra);
    }
    error(message, error, extra) {
        const errObj = error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : { message: String(error) };
        this.write('ERROR', message, {
            ...extra,
            errorDetails: errObj,
        });
    }
    critical(message, error, extra) {
        const errObj = error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : { message: String(error) };
        this.write('CRITICAL', message, {
            ...extra,
            errorDetails: errObj,
        });
    }
}
exports.NexosLogger = NexosLogger;
//# sourceMappingURL=logger.js.map