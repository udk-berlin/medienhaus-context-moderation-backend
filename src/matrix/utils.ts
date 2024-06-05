import * as R from 'ramda';
import { ChildOrKnockEvent } from './types';

export function getNamePartFromUserId(userId: string) {
  // @alice:my.matrix.server.org
  return userId.split(/[@:]/)[1];
}

export function groupAndSortEvents(events: Readonly<ChildOrKnockEvent[]>) {
  const sorted = R.sortBy(R.prop('time'), events).reverse();
  return R.groupBy(R.prop('roomId'), sorted) as Record<
    string,
    ChildOrKnockEvent[]
  >;
}

export function getRoomIdsByModUser(
  modUserIdsByRoom: Readonly<Record<string, string[]>>,
) {
  const roomIdsByModUser: Record<string, string[]> = {};
  Object.entries(modUserIdsByRoom).forEach(([roomId, userIds]) => {
    userIds.forEach((userId) => {
      if (roomIdsByModUser[userId] === undefined) {
        roomIdsByModUser[userId] = [];
      }
      roomIdsByModUser[userId].push(roomId);
    });
  });
  return roomIdsByModUser;
}
