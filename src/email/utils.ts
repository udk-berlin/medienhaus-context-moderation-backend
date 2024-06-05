import { ChildEvent, KnockEvent } from 'src/matrix/types';

const subjectPrefix = '[Medienhaus CMS]';
export const digestEmailSubject = `${subjectPrefix} New events`;
export const knockAcceptedEmailSubject = `${subjectPrefix} Request granted`;

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

export function digestOutro() {
  return `Go to ${process.env.FRONTEND_URL} to take action.`;
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
    .map((roomId) => {
      const knockEvents = knockEventsByRoom[roomId] || [];
      const childEvents = childEventsByRoom[roomId] || [];
      const roomName = (knockEvents[0] || childEvents[0]).roomName;
      return digestSpaceEvents(roomName, knockEvents, childEvents);
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
  return ['Best,', 'Medienhaus CMS'].join('\n');
}
