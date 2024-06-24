import { ChildEvent, KnockEvent } from 'src/matrix/types';

export function makeDigestEmailSubject(prefix: string) {
  return `${prefix} New events`;
}

export function makeKnockAcceptedEmailSubject(prefix: string) {
  return `${prefix} Request granted`;
}

export function emailIntro(userDisplayName: string) {
  return `Hello ${userDisplayName},`;
}

export function digestIntro(userDisplayName: string) {
  return [
    emailIntro(userDisplayName),
    '',
    'there are new events in spaces / rooms you are a moderator of:',
  ].join('\n');
}

export function digestOutro(frontendUrl: string) {
  return `Go to ${frontendUrl} to take action.`;
}

export function digestSpaceEvents(
  roomName: string,
  knockEvents: Readonly<KnockEvent[]>,
  childEvents: Readonly<ChildEvent[]>,
) {
  const knocks = knockEvents.map(knockEventMessage);
  const children = childEvents.map(childEventMessage);
  return [roomName, ...knocks, ...children].flat().join('\n');
}

export function digestSummary(
  roomIds: Readonly<string[]>,
  knockEventsByRoom: Readonly<Record<string, KnockEvent[]>>,
  childEventsByRoom: Readonly<Record<string, ChildEvent[]>>,
) {
  const summary = roomIds
    .filter((roomId) => {
      // filter out rooms with no events
      const knockEvents = knockEventsByRoom[roomId] || [];
      const childEvents = childEventsByRoom[roomId] || [];
      return knockEvents.length + childEvents.length > 0;
    })
    .map((roomId, i, ids) => {
      const knockEvents = knockEventsByRoom[roomId] || [];
      const childEvents = childEventsByRoom[roomId] || [];
      const roomName = (knockEvents[0] || childEvents[0]).roomName;
      const result = [digestSpaceEvents(roomName, knockEvents, childEvents)];
      if (i < ids.length - 1) {
        result.push('');
      }
      return result;
    })
    .flat()
    .join('\n');
  return summary;
}

export function knockEventMessage(event: Readonly<KnockEvent>) {
  const { userId, userDisplayName } = event;
  return `– ${userDisplayName} (${userId}) wants to join`;
}

export function childEventMessage(event: Readonly<ChildEvent>) {
  const { userId, userDisplayName, childRoomName } = event;
  return `– ${userDisplayName} (${userId}) added room "${childRoomName}"`;
}

export function knockEventAcceptedMessage(roomName: string) {
  return `Your request to join the "${roomName}" space was granted.`;
}

export function signature() {
  return ['-- ', process.env.EMAIL_SIGNATURE].join('\n');
}

export function generateKnockAcceptedEmailContent(
  userDisplayName: string,
  roomName: string,
) {
  return [
    emailIntro(userDisplayName),
    '',
    knockEventAcceptedMessage(roomName),
    '',
    signature(),
  ].join('\n');
}

export function generateModeratorDigestEmailContent(
  userDisplayName: string,
  summary: string,
  frontendUrl: string,
) {
  return [
    digestIntro(userDisplayName),
    '',
    summary,
    '',
    digestOutro(frontendUrl),
    '',
    signature(),
  ].join('\n');
}
