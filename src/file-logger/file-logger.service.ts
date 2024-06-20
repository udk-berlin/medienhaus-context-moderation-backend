import { ConsoleLogger, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

// @Injectable()
export class FileLoggerService implements LoggerService {
  private readonly consoleLogger: ConsoleLogger;
  private readonly fileLogger: winston.Logger;
  private readonly context: string;

  constructor(context?: string) {
    const { printf, combine, timestamp } = winston.format;

    const logFormat = printf((info) => {
      const { level, message, context, timestamp } = info;
      const ts = timestamp.replace('T', ' ').replace('Z', '');
      return `${ts} ${level} [${context}] ${message}`;
    });

    this.fileLogger = winston.createLogger({
      level: 'silly',
      levels: {
        fatal: 0,
        error: 1,
        warn: 2,
        info: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
      },
      format: combine(timestamp(), logFormat),
      transports: [
        new winston.transports.DailyRotateFile({
          filename: 'logs/%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d',
        }),
      ],
    });

    this.consoleLogger = new ConsoleLogger(context);
    this.context = context;
  }

  log(message: any) {
    this.consoleLogger.log(message);
    this.fileLogger.log('info', message, { context: this.context });
  }

  error(message: any) {
    this.consoleLogger.error(message);
    this.fileLogger.log('error', message, { context: this.context });
  }

  fatal(message: any) {
    this.consoleLogger.fatal(message);
    this.fileLogger.log('fatal', message, { context: this.context });
  }

  warn(message: any) {
    this.consoleLogger.warn(message);
  }

  debug(message: any) {
    this.consoleLogger.debug(message);
  }

  verbose(message: any) {
    this.consoleLogger.verbose(message);
  }
}
