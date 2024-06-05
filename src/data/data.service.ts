import * as fs from 'node:fs';
import { Injectable } from '@nestjs/common';
import { FileLoggerService } from '../file-logger/file-logger.service';

@Injectable()
export class DataService {
  private readonly logger = new FileLoggerService(DataService.name);
  private lastDigestDate: Date;

  constructor() {
    this.logger.log('Getting last digest date from file');
    this.lastDigestDate = this.getLastDigestDateFromFile();
  }

  private getLastDigestDateFromFile(): Date {
    try {
      const content = fs
        .readFileSync(process.env.LAST_DIGEST_TS_FILE)
        .toString();
      const ts = parseInt(content, 10);
      return new Date(ts);
    } catch (err) {
      this.logger.error(`Failed to read last digest timestamp: ${err}`);
      // fallback: the beginning of time
      return new Date(0);
    }
  }

  getLastDigestDate() {
    return this.lastDigestDate;
  }

  setLastDigestTimestamp(ts: number) {
    this.lastDigestDate = new Date(ts);
    try {
      fs.writeFileSync(process.env.LAST_DIGEST_TS_FILE, ts.toString());
    } catch (err) {
      this.logger.error(`Failed to write last digest timestamp: ${err}`);
    }
  }
}
