import { supabase } from '../lib/supabase';
import type { ErrorSeverity, DbErrorLogInsert } from '../types/database';

interface LogErrorOptions {
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
  error?: Error | unknown;
}

/**
 * Gets the current user ID from the Supabase session.
 * Returns null if no user is authenticated.
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Extracts a stack trace from an error object.
 */
function getStackTrace(error: unknown): string | null {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  return null;
}

/**
 * Logs an error to the error_logs table in Supabase.
 * This is a fire-and-forget operation - it won't block or throw.
 *
 * @param message - A human-readable description of the error
 * @param options - Optional configuration for the log entry
 * @param options.severity - Log level (info, warning, error, critical). Defaults to 'error'.
 * @param options.context - Additional context data to store with the log
 * @param options.error - An Error object to extract stack trace from
 */
export async function logError(
  message: string,
  options: LogErrorOptions = {}
): Promise<void> {
  const { severity = 'error', context = {}, error } = options;

  try {
    const userId = await getCurrentUserId();
    const stackTrace = getStackTrace(error);

    // If the error is an object with a message, include it in context
    const errorContext = { ...context };
    if (error && typeof error === 'object') {
      if ('message' in error && typeof error.message === 'string') {
        errorContext.errorMessage = error.message;
      }
      if ('code' in error) {
        errorContext.errorCode = error.code;
      }
    }

    const logEntry: DbErrorLogInsert = {
      user_id: userId,
      severity,
      message,
      context: errorContext,
      stack_trace: stackTrace,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    // Fire-and-forget insert - don't await or handle errors
    // This ensures logging never blocks or breaks the main operation
    // Note: Using type assertion since error_logs table isn't in the generated Database type
    (supabase.from('error_logs') as unknown as { insert: (data: DbErrorLogInsert) => Promise<{ error: Error | null }> })
      .insert(logEntry)
      .then(({ error: insertError }) => {
        if (insertError) {
          // Log to console as fallback, but don't throw
          console.error('[ErrorLogger] Failed to log error to database:', insertError);
          console.error('[ErrorLogger] Original error:', message, errorContext);
        }
      })
      .catch((err: unknown) => {
        // Catch any unexpected errors to prevent unhandled rejections
        console.error('[ErrorLogger] Unexpected error:', err);
      });
  } catch (err) {
    // If anything goes wrong with logging setup, just log to console
    console.error('[ErrorLogger] Failed to prepare error log:', err);
    console.error('[ErrorLogger] Original error:', message, options);
  }
}

/**
 * Logs an informational message.
 * Use for tracking non-error events that may be useful for debugging.
 */
export function logInfo(message: string, context?: Record<string, unknown>): Promise<void> {
  return logError(message, { severity: 'info', context });
}

/**
 * Logs a warning message.
 * Use for potentially problematic situations that don't cause immediate failures.
 */
export function logWarning(message: string, context?: Record<string, unknown>): Promise<void> {
  return logError(message, { severity: 'warning', context });
}

/**
 * Logs a critical error.
 * Use for severe errors that require immediate attention.
 */
export function logCritical(
  message: string,
  options: { context?: Record<string, unknown>; error?: Error | unknown } = {}
): Promise<void> {
  return logError(message, { ...options, severity: 'critical' });
}
