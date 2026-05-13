// ─────────────────────────────────────────────
// Log Levels
// ─────────────────────────────────────────────

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type LogMeta = Record<string, unknown> | unknown[] | unknown;

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: LogMeta;
  context?: string;
}

// ─────────────────────────────────────────────
// Logger Class
// ─────────────────────────────────────────────

export class Logger {
  private readonly context?: string;
  private minLevel: LogLevel;

  constructor(context?: string, minLevel: LogLevel = LogLevel.DEBUG) {
    this.context = context;
    this.minLevel = minLevel;
  }

  // ── Level Control ──────────────────────────────────────────────────────────

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  // ── Public Log Methods ─────────────────────────────────────────────────────

  debug(message: string, meta?: LogMeta): void {
    this._log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this._log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this._log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: LogMeta): void {
    this._log(LogLevel.ERROR, message, meta);
  }

  /** Log only when a condition is true — useful for conditional debug output. */
  logIf(
    condition: boolean,
    level: LogLevel,
    message: string,
    meta?: LogMeta,
  ): void {
    if (condition) this._log(level, message, meta);
  }

  /** Create a child logger that inherits the current level and prepends a sub-context. */
  child(subContext: string): Logger {
    const name = this.context ? `${this.context}:${subContext}` : subContext;
    return new Logger(name, this.minLevel);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _log(level: LogLevel, message: string, meta?: LogMeta): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: this.context,
      meta,
    };

    const prefix = this._formatPrefix(entry);

    switch (level) {
      case LogLevel.DEBUG:
        meta !== undefined
          ? console.debug(prefix, meta)
          : console.debug(prefix);
        break;
      case LogLevel.INFO:
        meta !== undefined ? console.info(prefix, meta) : console.info(prefix);
        break;
      case LogLevel.WARN:
        meta !== undefined ? console.warn(prefix, meta) : console.warn(prefix);
        break;
      case LogLevel.ERROR:
        meta !== undefined
          ? console.error(prefix, meta)
          : console.error(prefix);
        break;
    }
  }

  private _formatPrefix(entry: LogEntry): string {
    const ctx = entry.context ? ` [${entry.context}]` : "";
    return `[${entry.timestamp}] [${entry.level}]${ctx} ${entry.message}`;
  }
}

// ─────────────────────────────────────────────
// Default singleton — drop-in for utils/logger.ts
// ─────────────────────────────────────────────

export const logger = new Logger();

export default logger;
