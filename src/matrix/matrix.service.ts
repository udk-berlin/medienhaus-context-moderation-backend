import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as sdk from 'matrix-js-sdk';
import {
  ClientEvent,
  LoginResponse,
  MatrixClient,
  MatrixEvent,
  RoomEvent,
} from 'matrix-js-sdk';

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

  async login() {
    let res: LoginResponse;
    try {
      res = await this.client.loginWithPassword(
        process.env.MATRIX_BOT_USER,
        process.env.MATRIX_BOT_PASSWORD,
      );
      this.client.setAccessToken(res.access_token);
    } catch (err) {
      console.error('Matrix login failed:');
      console.log(err);
      process.exit(1);
    }
  }

  handleRoomEvent(event: MatrixEvent) {
    const roomId = event.getRoomId();
    const eventType = event.getType();
    const content = event.getContent();

    switch (eventType) {
      case 'm.room.member':
        if (content.membership === 'knock') {
          // TODO: get emails of room moderators
          // TODO: send email
        }
        break;
      default:
        break;
    }

    console.log('#######################################');
    console.log(`New event in room ${roomId}:`);
    console.log(`Event type: ${eventType}`);
    console.log(`Event content:`, content);
    console.log(event.getSender());
    console.log(event.getStateKey());
    console.log(event.getTs());
  }

  async startClient(): Promise<MatrixClient> {
    await this.login();

    return new Promise((resolve, reject) => {
      this.client.once(ClientEvent.Sync, (state, prevState, res) => {
        if (state === 'PREPARED') {
          this.logger.log('Sync complete');

          this.client.on(RoomEvent.Timeline, (event) =>
            this.handleRoomEvent(event),
          );

          resolve(this.client);
        } else {
          this.logger.error('Sync failed!', 'state:', state);
          reject('Initial sync failed');
        }
      });

      this.logger.log('Starting client');
      this.logger.log('Waiting for sync...');
      return this.client.startClient();
    });
  }

  stopClient() {
    this.logger.log('Stopping client');
    return this.client.stopClient();
  }
}
