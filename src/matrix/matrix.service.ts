import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as sdk from 'matrix-js-sdk';
import { ClientEvent, MatrixClient } from 'matrix-js-sdk';

@Injectable()
export class MatrixService {
  private readonly logger = new ConsoleLogger(MatrixService.name);
  private client: MatrixClient = null;

  constructor() {
    this.logger.log('Initializing client');
    this.client = sdk.createClient({
      baseUrl: process.env.MATRIX_SERVER_URL,
    });
  }

  async startClient(): Promise<MatrixClient> {
    this.logger.log('Starting client');
    await this.client.startClient();

    return new Promise((resolve, reject) => {
      this.logger.log('Waiting for sync...');
      this.client.once(ClientEvent.Sync, (state, prevState, res) => {
        if (state === 'PREPARED') {
          this.logger.log('Sync complete');
          resolve(this.client);
        } else {
          this.logger.error('Sync failed!');
          reject();
        }
      });
    });
  }

  stopClient() {
    this.logger.log('Stopping client');
    return this.client.stopClient();
  }
}
