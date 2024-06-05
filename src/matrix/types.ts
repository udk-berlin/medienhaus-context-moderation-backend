export type KnockEvent = {
  roomId: string;
  roomName: string;
  userId: string;
  userDisplayName: string;
  time: Date;
};

export type ChildEvent = {
  roomId: string;
  roomName: string;
  userId: string;
  userDisplayName: string;
  childRoomId: string;
  childRoomName: string;
  time: Date;
};

export type ChildOrKnockEvent = ChildEvent | KnockEvent;

export type DigestCallback = (
  roomIdsByModUser: Record<string, string[]>,
  knockEventsByRoom: Record<string, KnockEvent[]>,
  childEventsByRoom: Record<string, ChildEvent[]>,
) => Promise<void>;

export type KnockAcceptedCallback = (
  userId: string,
  userDisplayName: string,
  roomName: string,
) => void;
