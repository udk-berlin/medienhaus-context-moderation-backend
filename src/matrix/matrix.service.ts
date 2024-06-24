import { Injectable } from '@nestjs/common';
import * as sdk from 'matrix-js-sdk';
import {
  ClientEvent,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomEvent,
  RoomMemberEvent,
  SyncState,
} from 'matrix-js-sdk';

import { DataService } from '../data/data.service';
import { FileLoggerService } from '../file-logger/file-logger.service';
import {
  ChildEvent,
  DigestCallback,
  KnockAcceptedCallback,
  KnockEvent,
} from './types';
import {
  getFilteredEvents,
  getRoomIdsByModUser,
  groupAndSortEvents,
} from './utils';
import { KnownMembership } from 'matrix-js-sdk/lib/types';

const UNKNOWN = '(UNKNOWN)';

@Injectable()
export class MatrixService {
  private readonly logger = new FileLoggerService(MatrixService.name);
  private client: MatrixClient;
  private digestIntervalId: NodeJS.Timeout;
  private knockEvents: Array<KnockEvent> = [];
  private childEvents: Array<ChildEvent> = [];

  constructor(private readonly dataService: DataService) {}

  createClient(baseUrl: string) {
    this.logger.log('Initializing client');
    this.client = sdk.createClient({ baseUrl });
  }

  async start(
    user: string,
    token: string,
    digestIntervalMinutes: number,
    knockAcceptedCallback: KnockAcceptedCallback,
    digestCallback: DigestCallback,
  ): Promise<void> {
    await this.login(user, token);

    return new Promise((resolve, reject) => {
      this.client.once(ClientEvent.Sync, (state /* , prevState, res */) => {
        if (state === SyncState.Prepared) {
          this.logger.log('Sync complete');

          // auto-accept invites of bot user to new rooms / spaces
          this.initAutoJoin();

          // start listening for events
          this.client.on(RoomEvent.Timeline, (event) =>
            this.handleRoomEvent(event, knockAcceptedCallback),
          );

          // get all events that happened after the latest digest, and queue them
          const ts = this.dataService.getLastDigestDate().getTime();
          const rooms = this.client.getRooms();
          for (const room of rooms) {
            const stateEvents = room.currentState.events;
            const memberEvents = getFilteredEvents(
              stateEvents,
              'm.room.member',
              ts,
            );
            const childEvents = getFilteredEvents(
              stateEvents,
              'm.space.child',
              ts,
            );
            [...memberEvents, ...childEvents].forEach((event) => {
              this.handleRoomEvent(event, knockAcceptedCallback);
            });
          }

          // start interval to periodically process the queued events
          this.logger.log('Starting digest interval');
          if (this.digestIntervalId !== undefined) {
            clearInterval(this.digestIntervalId);
          }
          this.digestIntervalId = setInterval(
            () => this.digestQueuedEvents(digestCallback),
            digestIntervalMinutes * 60 * 1000,
          );

          resolve();
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
    this.client.stopClient();
  }

  async login(userId: string, token: string) {
    try {
      this.client.credentials = { userId };
      this.client.setAccessToken(token);
    } catch (err) {
      this.logger.error(`Matrix login failed: ${err}`);
      throw err;
    }
  }

  private async getRoomName(roomId: string) {
    try {
      const { name } = await this.client.getStateEvent(
        roomId,
        'm.room.name',
        '',
      );
      if (name) {
        return name;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  }

  private async handleRoomEvent(
    event: MatrixEvent,
    knockAcceptedCallback: KnockAcceptedCallback,
  ) {
    const roomId = event.getRoomId();
    const eventType = event.getType();
    const content = event.getContent();
    const sender = event.getSender();
    const stateKey = event.getStateKey();
    const ts = event.getTs();

    this.logger.debug('#######################################');
    this.logger.debug(`New event in room ${roomId}:`);
    this.logger.debug(`Event type: ${JSON.stringify(eventType)}`);
    this.logger.debug(`Event content: ${JSON.stringify(content)}`);
    this.logger.debug(`Event sender: ${sender}`);
    this.logger.debug(`Event state key: ${stateKey}`);
    this.logger.debug(`Event ts: ${ts}`);

    switch (eventType) {
      case 'm.room.member':
        if (content.membership === KnownMembership.Knock) {
          const room = this.client.getRoom(roomId);
          const knockEvent: KnockEvent = {
            roomId: room.roomId,
            roomName: room.name,
            userId: sender,
            userDisplayName: content.displayname,
            time: new Date(ts),
          };
          this.knockEvents.push(knockEvent);
          this.logger.log(
            `${eventType}: ${JSON.stringify(knockEvent, null, '  ')}`,
          );
        } else if (content.membership === KnownMembership.Invite) {
          const botUserId = this.client.getUserId();
          if (stateKey !== botUserId) {
            // status changes to `invite` when knock gets accepted
            const room = await this.client.getRoom(roomId);
            knockAcceptedCallback(
              stateKey,
              content.displayname || UNKNOWN,
              room.name,
            );
          } /* else {} */
        }
        break;

      case 'm.space.child':
        // `content` is empty when a child has been removed, and non-empty when s.th. was added
        if (Object.keys(content || {}).length) {
          // room added
          const room = this.client.getRoom(roomId);

          const addedRoomId = stateKey;
          const addedRoomName =
            (await this.getRoomName(addedRoomId)) || UNKNOWN;

          const profile = await this.client.getProfileInfo(sender);
          const userDisplayName = profile?.displayname || UNKNOWN;

          const childEvent: ChildEvent = {
            roomId: room.roomId,
            roomName: room.name,
            userId: sender,
            userDisplayName,
            childRoomId: addedRoomId,
            childRoomName: addedRoomName,
            time: new Date(ts),
          };
          this.childEvents.push(childEvent);
          this.logger.log(
            `${eventType}: ${JSON.stringify(childEvent, null, '  ')}`,
          );
        } /* else {
          // room removed
        } */
        break;

      default:
        break;
    }
  }

  private getModeratorIdsByRoom(
    rooms: Room[],
    moderatorLevel = 50, // TODO: or does medienhaus use a non-default value?
  ) {
    const modUserIdsByRoom: Record<string, string[]> = {};

    rooms.forEach((room) => {
      const powerLevels = room.currentState.getStateEvents(
        'm.room.power_levels',
        '',
      );
      if (!powerLevels) {
        this.logger.error(`Unable to get power levels for room ${room.name}`);
        return;
      } else {
        const content = powerLevels.getContent();
        Object.keys(content.users).forEach((userId) => {
          const userPowerLevel = content.users[userId];
          if (isNaN(userPowerLevel)) {
            this.logger.error(
              `Unable to get power level of ${userId} in room: ` + room.name,
            );
            return;
          }
          if (userPowerLevel >= moderatorLevel) {
            if (modUserIdsByRoom[room.roomId] === undefined) {
              modUserIdsByRoom[room.roomId] = [];
            }
            modUserIdsByRoom[room.roomId].push(userId);
          }
        });
      }
    });

    return modUserIdsByRoom;
  }

  private clearEvents() {
    this.knockEvents = [];
    this.childEvents = [];
  }

  private async digestQueuedEvents(callback: DigestCallback) {
    const ts = Date.now();
    this.logger.log(`Digest: ${ts}`);

    if (this.knockEvents.length + this.childEvents.length > 0) {
      const knockEventsByRoom = groupAndSortEvents([
        ...this.knockEvents,
      ]) as Record<string, KnockEvent[]>;
      const childEventsByRoom = groupAndSortEvents([
        ...this.childEvents,
      ]) as Record<string, ChildEvent[]>;

      this.clearEvents();

      const rooms = this.client.getRooms();
      const modUserIdsByRoom = this.getModeratorIdsByRoom(rooms);
      const roomIdsByModUser = getRoomIdsByModUser(modUserIdsByRoom);

      await callback(roomIdsByModUser, knockEventsByRoom, childEventsByRoom);
    } else {
      this.logger.log(`No queued events to process`);
    }

    this.dataService.setLastDigestTimestamp(ts);
  }

  async getUserDisplayName(userId: string) {
    const { displayname } = await this.client.getProfileInfo(userId);
    return displayname || UNKNOWN;
  }

  async initAutoJoin() {
    const botUserId = this.client.getUserId()

    // 1. get invites that happened while the service wasn't running
    const invitedRoomIds = this.client
      .getRooms()
      .filter((room) => {
        const member = room.getMember(botUserId);
        return member && member.membership === KnownMembership.Invite;
      })
      .map((room) => room.roomId);
    this.acceptBotInvites(invitedRoomIds);

    // 2. invite events as they occur
    this.client.on(RoomMemberEvent.Membership, async (event, member) => {
      if (
        member.userId === botUserId &&
        member.membership === KnownMembership.Invite
      ) {
        this.acceptBotInvites([member.roomId]);
      }
    });
  }

  async acceptBotInvites(roomIds: string[]) {
    for (const roomId of roomIds) {
      const roomName = (await this.getRoomName(roomId)) || UNKNOWN;
      this.logger.log(`Bot was invited to join "${roomName}" (${roomId})`);
      try {
        const room = await this.client.joinRoom(roomId);
        this.logger.log(`Joined room "${roomName}" (${roomId})`);
      } catch (err) {
        this.logger.error(
          `Failed to join room "${roomName}" (${roomId}): ${err}`,
        );
      }
    }
  }
}
