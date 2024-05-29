/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as dotenv from 'dotenv';
import * as sdk from 'matrix-js-sdk';
import {
  LoginResponse,
  ClientEvent,
  MatrixClient,
  Visibility,
} from 'matrix-js-sdk';
import { Hierarchy, addUserToRoom, fetchSpaceHierarchy } from './utils';

dotenv.config({
  path: ['../.env', './.env'],
});

const rootContextId = process.env.MATRIX_ROOT_CONTEXT_ID;

function printUsage() {
  console.log('available commands:');
  console.log('list-room-hierarchy');
  console.log('list-room-join-rules');
  console.log('make-all-rooms-listed');
  console.log('require-knocking-on-all-rooms');
  console.log('add-bot-to-every-room');
  console.log('bot-accept-all-invitations');
}

async function listSpacesAndRooms(client: MatrixClient, rootId: string) {
  const hierarchy: Hierarchy = await fetchSpaceHierarchy(client, rootId);

  const print = async (item: Hierarchy, level: number) => {
    const indent = '  '.repeat(level);
    console.log(`${indent}- ${item.name}`);
    const children = item.children;
    for (const it of children) {
      await print(it, level + 1);
    }
  };

  await print(hierarchy, 0);
}

async function listRoomJoinRules(client: MatrixClient) {
  const rooms = await client.getRooms();
  for (const room of rooms) {
    const stateEvents = room.currentState.getStateEvents('m.room.join_rules');
    const { join_rule } = stateEvents[0].getContent();
    console.log(`${room.name.trim()}: ${join_rule}`);
  }
}

async function makeAllRoomsPublic(client: MatrixClient) {
  const rooms = await client.getRooms();
  for (const room of rooms) {
    try {
      console.log(room.name);
      await client.setRoomDirectoryVisibility(room.roomId, Visibility.Public);
    } catch (err) {
      console.error('Failed to set room directory visibility:', err);
    }
  }
}

async function requireKnockingOnAllRooms(client: MatrixClient) {
  const rooms = await client.getRooms();
  for (const room of rooms) {
    await client.sendStateEvent(
      room.roomId,
      // @ts-expect-error
      'm.room.join_rules',
      { join_rule: 'knock' },
    );
  }
}

async function addBotToEveryRoom(client: MatrixClient) {
  // invite bot to every room
  const rooms = await client.getRooms();
  for (const room of rooms) {
    await addUserToRoom(client, room.roomId, process.env.MATRIX_BOT_USER_ID);
  }
}

async function botAcceptAllInvitations() {
  // let bot accept all invitations
  const botClient = sdk.createClient({
    baseUrl: process.env.MATRIX_SERVER_URL,
  });
  let res: LoginResponse;
  try {
    res = await botClient.loginWithPassword(
      process.env.MATRIX_BOT_USER,
      process.env.MATRIX_BOT_PASSWORD,
    );
    botClient.setAccessToken(res.access_token);
  } catch (err) {
    console.error('Bot login failed:');
    console.log(err);
    process.exit(1);
  }

  botClient.once(ClientEvent.Sync, async (state, prevState, res) => {
    if (state === 'PREPARED') {
      const rooms = await botClient.getRooms();

      try {
        const invitations = rooms.filter((room) => {
          const currentState = room.currentState;
          const memberEvents = currentState.getStateEvents('m.room.member');
          const membership = memberEvents.find(
            (event) => event.getContent().membership === 'invite',
          );
          return membership !== undefined;
        });

        // NOTE: might cause 'Too Many Requests' error, depending on the number of invitations
        for (const room of invitations) {
          await botClient.joinRoom(room.roomId);
          console.log(`Accepted invitation for room ${room.roomId}`);
        }
      } catch (err) {
        console.error('Failed to accept invitations:', err);
      }
    }
  });

  botClient.startClient();
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command) {
    printUsage();
    process.exit(1);
  }

  const client = sdk.createClient({
    baseUrl: process.env.MATRIX_SERVER_URL,
  });

  let res: LoginResponse;
  try {
    res = await client.loginWithPassword(
      process.env.MATRIX_ADMIN_USER,
      process.env.MATRIX_ADMIN_PASSWORD,
    );
    client.setAccessToken(res.access_token);
  } catch (err) {
    console.error('Login failed:');
    console.log(err);
    process.exit(1);
  }

  client.once(ClientEvent.Sync, async (state, prevState, res) => {
    if (state === 'PREPARED') {
      console.log('Sync complete');

      switch (command) {
        case 'list-room-hierarchy':
          await listSpacesAndRooms(client, rootContextId);
          break;
        case 'make-all-rooms-listed':
          await makeAllRoomsPublic(client);
          break;
        case 'list-room-join-rules':
          await listRoomJoinRules(client);
          break;
        case 'require-knocking-on-all-rooms':
          await requireKnockingOnAllRooms(client);
          break;
        case 'add-bot-to-every-room':
          await addBotToEveryRoom(client);
          break;
        case 'bot-accept-all-invitations':
          await botAcceptAllInvitations();
          break;
        default:
          printUsage();
          process.exit(1);
          break;
      }
    } else {
      console.error('Sync failed!');
    }
  });

  client.startClient();
}

main();
