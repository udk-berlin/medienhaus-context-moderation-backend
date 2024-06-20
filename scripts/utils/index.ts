import { MatrixClient } from 'matrix-js-sdk';

export type Hierarchy = {
  roomId: string;
  name: string;
  // isSpace: true;
  children: Hierarchy[];
};

export async function fetchSpaceHierarchy(
  client: MatrixClient,
  spaceId: string,
  visited = new Set(),
) {
  if (visited.has(spaceId)) {
    return null;
  }
  visited.add(spaceId);

  const room = client.getRoom(spaceId);
  if (!room) {
    console.error(`Room not found: ${spaceId}`);
    return null;
  }

  const children = [];
  const stateEvents = room.currentState.getStateEvents('m.space.child');
  for (const event of stateEvents) {
    const childRoomId = event.getStateKey();
    const childRoom = client.getRoom(childRoomId);
    if (childRoom) {
      const childIsSpace =
        childRoom.currentState.getStateEvents('m.room.create')[0]?.getContent()
          ?.type === 'm.space';
      const childHierarchy = childIsSpace
        ? await fetchSpaceHierarchy(client, childRoomId, visited)
        : null;
      children.push({
        roomId: childRoomId,
        name: childRoom.name || childRoomId,
        children: childHierarchy?.children || [],
      });
    }
  }

  return {
    roomId: spaceId,
    name: room.name || spaceId,
    children: children.filter((child) => child !== null),
  };
}

export async function checkRoomDirectoryVisibility(
  client: MatrixClient,
  roomId: string,
) {
  try {
    const response = await client.getRoomDirectoryVisibility(roomId);
    return response.visibility === 'public';
  } catch (error) {
    throw new Error(`Failed to get room directory visibility: ${error}`);
  }
}

export async function addUserToRoom(
  client: MatrixClient,
  roomId: string,
  userId: string,
) {
  // NOTE: apparently you can't directly add users to a room
  // client
  //   .sendStateEvent(
  //     roomId,
  //     // @ts-expect-error
  //     'm.room.member',
  //     { membership: 'join' },
  //     userId,
  //   )
  //   .then(() => {
  //     console.log(`User ${userId} has been added to room ${roomId} directly.`);
  //   })
  //   .catch((err) => {
  //     console.error('Failed to add user to room:', err);
  //   });

  // instead, we have to send an invitation to join
  try {
    return client.invite(roomId, userId);
  } catch (err) {
    console.error(`Failed to invite user to room ${roomId}: ${err}`);
    return {};
  }
}
