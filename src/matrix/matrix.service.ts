import * as fs from 'node:fs';
import { Injectable } from '@nestjs/common';
import * as sdk from 'matrix-js-sdk';
import {
  ClientEvent,
  LoginResponse,
  MatrixClient,
  MatrixEvent,
  RoomEvent,
} from 'matrix-js-sdk';
import { EmailService } from 'src/email/email.service';
import { FileLoggerService } from 'src/file-logger/file-logger.service';

@Injectable()
export class MatrixService {
  private readonly logger = new FileLoggerService(MatrixService.name);
  private readonly client: MatrixClient;

  constructor(private readonly emailService: EmailService) {
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
      this.logger.error(`Matrix login failed: ${err}`);
      process.exit(1);
    }
  }

  writeLastSeenEventTimestamp(ts: number) {
    try {
      fs.writeFileSync(process.env.LAST_SEEN_EVENT_TS_FILE, ts.toString());
    } catch (err) {
      this.logger.error(`Failed to write last handled event timestamp: ${err}`);
    }
  }

  async handleRoomEvent(event: MatrixEvent) {
    const roomId = event.getRoomId();
    const eventType = event.getType();
    const content = event.getContent();
    const sender = event.getSender();
    const stateKey = event.getStateKey();
    const ts = event.getTs();

    console.log('#######################################');
    console.log(`New event in room ${roomId}:`);
    console.log(`Event type: ${eventType}`);
    console.log(`Event content:`, content);
    console.log(`Event sender:`, sender);
    console.log(`Event state key:`, stateKey);
    console.log(`Event ts:`, ts);

    this.writeLastSeenEventTimestamp(ts);

    switch (eventType) {
      case 'm.room.member':
        if (content.membership === 'knock') {
          const room = this.client.getRoom(roomId);

          this.logger.log(
            `${eventType}: ${content.displayname} (${sender}) knocked on room ${room.name} (${roomId})`,
          );

          // TODO: get emails of room moderators
          this.emailService.sendEmail(
            process.env.TEST_EMAIL_RECIPIENT,
            'knock event',
            `${content.displayname}(${sender}) knocked on room ${room.name}(${roomId})`,
          );
        }
        break;

      case 'm.space.child':
        // `content` is empty when a child has been removed, and non-empty when s.th. was added
        if (Object.keys(content || {}).length) {
          // room added
          const room = this.client.getRoom(roomId);

          const addedRoomId = stateKey;
          // this returns `null` due to the bot not being in the added room(?)
          // TODO: find workaround
          const addedRoom = this.client.getRoom(addedRoomId);
          const addedRoomName = addedRoom?.name || '(UNKNOWN)';

          const { displayname } = await this.client.getProfileInfo(sender);

          this.logger.log(
            `${eventType}: ${displayname}(${sender}) added room ${addedRoomName}(${roomId}) to ${room.name}(${roomId})`,
          );

          this.emailService.sendEmail(
            process.env.TEST_EMAIL_RECIPIENT,
            'content added',
            `${displayname}(${sender}) added room ${addedRoomName}(${roomId}) to ${room.name}(${roomId})`,
          );
        } else {
          // room removed
        }
        break;

      default:
        break;
    }
  }

  async startClient(): Promise<MatrixClient> {
    await this.login();

    return new Promise((resolve, reject) => {
      this.client.once(ClientEvent.Sync, (state /* , prevState, res */) => {
        if (state === 'PREPARED') {
          this.logger.log('Sync complete');

          this.client.on(RoomEvent.Timeline, (event) =>
            this.handleRoomEvent(event),
          );

          resolve(this.client);
        } else {
          this.logger.error(`Sync failed! state: ${state}`);
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
