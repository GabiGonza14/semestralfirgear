// HU-32: structured JSON logging. One JSON object per line to stdout/stderr, so
// a log orchestrator can parse fields (timestamp, level, message, context) instead
// of scraping free-form text. Deliberately dependency-free — like env.ts and
// HttpError, a small hand-written utility beats pulling in a logging framework for
// this need.

export type LogLevel = 'info' | 'warn' | 'error'
export type LogContext = Record<string, unknown>

// Redacted before serializing (acceptance criterion 4). Matched case-insensitively
// as a SUBSTRING of the key, so this also catches variants the call sites might use
// later (accessToken, refreshToken, Authorization header, apiSecret, ...). Note
// `secret` alone covers the compound stripeSecretKey / clerkSecretKey keys, and
// `cardnumber` matches `cardNumber` once lowercased.
const SENSITIVE_KEY_SUBSTRINGS = [
  'password',
  'token',
  'authorization',
  'secret',
  'cardnumber',
  'cvv',
]

const REDACTED = '[REDACTED]'

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return SENSITIVE_KEY_SUBSTRINGS.some((needle) => lower.includes(needle))
}

// Defense-in-depth against log injection (CWE-117): every log entry is a single
// JSON.stringify'd line, so a raw newline in a value is already escaped to the
// two literal characters `\n` inside that JSON string rather than becoming a real
// line break — but that safety is implicit in "we always wrap the whole entry in
// one JSON.stringify call" and easy to break by accident later (e.g. someone
// interpolating a value into the message string, or a future sink that isn't
// JSON-based). Stripping C0/C1 control characters here makes every value provably
// safe to log on its own, independent of that invariant. request path/method and
// error message/stack are the values most directly influenced by an attacker.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f-\x9f]/g

function sanitizeString(value: string): string {
  return value.replace(CONTROL_CHARS, '')
}

// Errors are the whole point of criterion 2, but `JSON.stringify(new Error())` is
// `{}` because name/message/stack are non-enumerable. Serialize them explicitly so
// the full stack trace survives into the structured log.
function serializeError(error: Error): Record<string, unknown> {
  return {
    name: sanitizeString(error.name),
    message: sanitizeString(error.message),
    stack: error.stack ? sanitizeString(error.stack) : error.stack,
  }
}

// Recursively copies `value`, replacing sensitive keys with [REDACTED] and turning
// Error instances into structured objects. `seen` guards against circular refs so
// a self-referential context can never hang the logger.
function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Error) {
    return serializeError(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen))
  }

  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]'
    }
    seen.add(value)

    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = isSensitiveKey(key) ? REDACTED : sanitizeValue(val, seen)
    }
    return result
  }

  return typeof value === 'string' ? sanitizeString(value) : value
}

/**
 * Returns a scrubbed copy of a log context: sensitive keys redacted (recursively,
 * including inside nested objects and arrays), Error instances expanded to
 * { name, message, stack }, circular references replaced with '[Circular]'.
 * Exported for testing the redaction logic in isolation.
 */
export function sanitizeContext(context: LogContext): LogContext {
  return sanitizeValue(context, new WeakSet()) as LogContext
}

/**
 * Builds the single JSON line for a log entry: always timestamp/level/message, with
 * the sanitized context merged under `context` when present. Exported so tests can
 * assert the exact JSON shape without spying on console. `timestamp` is ISO 8601.
 */
export function formatLogLine(level: LogLevel, message: string, context?: LogContext): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = sanitizeContext(context)
  }

  return JSON.stringify(entry)
}

// info/warn -> stdout, error -> stderr, matching the usual convention while keeping
// console.* as the transport (the shape is what matters, per the task).
const SINKS: Record<LogLevel, (line: string) => void> = {
  info: (line) => console.log(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  SINKS[level](formatLogLine(level, message, context))
}

/**
 * Structured logger. Drop-in shaped like the existing
 * `console.error('[tag] message', { ...context })` calls: keep the `[tag]` in the
 * message string and pass any structured data as the context object.
 */
export const logger = {
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
}
