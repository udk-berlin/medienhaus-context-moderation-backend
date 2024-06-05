import * as R from 'ramda';
import { ChildOrKnockEvent } from './types';
import { MatrixEvent } from 'matrix-js-sdk';

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

export function getFilteredEvents(
  stateEvents: Map<string, Map<string, MatrixEvent>>,
  eventType: string,
  afterTs: number,
) {
  return [...(stateEvents.get(eventType) || new Map()).values()]
    .map(({ event }) => {
      return {
        ...event,
        getRoomId: () => event.room_id,
        getType: () => event.type,
        getContent: () => event.content,
        getSender: () => event.sender,
        getStateKey: () => event.state_key,
        getTs: () => event.origin_server_ts,
      } as MatrixEvent;
    })
    .filter((event) => {
      return event.getTs() > afterTs;
    });
}
