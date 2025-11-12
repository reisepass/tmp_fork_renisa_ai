export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

export class Logger {
  private level: LogLevel;
  constructor(
    level?: string,
    private context?: string
  ) {
    this.level = level && Object.values(LogLevel).includes(level as LogLevel)
      ? (level as LogLevel)
      : LogLevel.INFO;
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    const levels = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
    ];
    return levels.indexOf(messageLevel) <= levels.indexOf(this.level);
  }

  public initContext(context?: string): void {
    this.context = context;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    meta: any = ""
  ): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta, null, 2)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${this.context ? `<${this.context}> ` : ""}${message}${metaStr}`;
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      if (meta instanceof Error) {
        meta = {
          message: meta.message,
          stack: meta.stack,
          name: meta.name,
          cause: meta.cause,
        };
      }
      const formattedMessage = this.formatMessage(
        LogLevel.ERROR,
        message,
        meta
      );
      console.error(formattedMessage);
      // For now, we'll just store the message
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage(LogLevel.WARN, message, meta);
      console.warn(formattedMessage);
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage(LogLevel.INFO, message, meta);
      console.info(formattedMessage);
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage(
        LogLevel.DEBUG,
        message,
        meta
      );
      console.debug(formattedMessage);
    }
  }
}
