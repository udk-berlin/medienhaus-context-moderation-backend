import { KnockEvent, ChildEvent, ChildOrKnockEvent } from './types';
import {
  getNamePartFromUserId,
  getRoomIdsByModUser,
  groupAndSortEvents,
} from './utils';

describe('getNamePartFromUserId()', () => {
  it('should only return the user name part', () => {
    const result = getNamePartFromUserId(
      '@alice:matrix.spaces.dev.udk-berlin.de',
    );
    expect(result).toEqual('alice');
  });
});

describe('groupAndSortEvents()', () => {
  it('should group events by room and sort in descending order', () => {
    const date1 = new Date(2024, 1, 1, 1, 0, 0, 0);
    const date2 = new Date(2024, 2, 1, 1, 0, 0, 0);
    const event1: Partial<KnockEvent> = {
      roomId: 'room-1',
      time: date1,
    };
    const event2: Partial<ChildEvent> = {
      roomId: 'room-1',
      time: date2,
    };
    const event3: Partial<KnockEvent> = {
      roomId: 'room-2',
      time: date1,
    };
    const event4: Partial<ChildEvent> = {
      roomId: 'room-2',
      time: date2,
    };
    const events: Array<ChildOrKnockEvent> = [
      event1 as ChildOrKnockEvent,
      event2 as ChildOrKnockEvent,
      event3 as ChildOrKnockEvent,
      event4 as ChildOrKnockEvent,
    ];

    const result = groupAndSortEvents(events);
    const keys = Object.keys(result);

    expect(keys).toHaveLength(2);
    expect(keys).toContain('room-1');
    expect(keys).toContain('room-2');

    expect(result['room-1'][0].roomId).toEqual('room-1');
    expect(result['room-1'][0].time).toEqual(date2);
    expect(result['room-1'][1].roomId).toEqual('room-1');
    expect(result['room-1'][1].time).toEqual(date1);

    expect(result['room-2'][0].roomId).toEqual('room-2');
    expect(result['room-2'][0].time).toEqual(date2);
    expect(result['room-2'][1].roomId).toEqual('room-2');
    expect(result['room-2'][1].time).toEqual(date1);
  });
});

describe('getRoomIdsByModUser()', () => {
  it('should return a list of room ids by user id', () => {
    const modUserIdsByRoom: Record<string, string[]> = {
      'room-1': ['mod-1', 'mod-2'],
      'room-2': ['mod-1', 'mod-3'],
      'room-3': ['mod-3'],
    };
    const result = getRoomIdsByModUser(modUserIdsByRoom);
    expect(result).toEqual({
      'mod-1': ['room-1', 'room-2'],
      'mod-2': ['room-1'],
      'mod-3': ['room-2', 'room-3'],
    });
  });
});
