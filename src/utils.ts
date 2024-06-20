import { LookUpEntry } from './data/types';

export function lookupEmailAddress(
  userIdNamePart: string,
  data: LookUpEntry[],
): string | undefined {
  for (const context of data) {
    for (const person of context.persons) {
      const email = person.mail.trim();
      if (email.split('@')[0] === userIdNamePart) {
        return email;
      }
    }
  }
  return undefined;
}

export function parseCommaSeparated(commaSeparated: string) {
  return commaSeparated.split(',').map((address) => address.trim());
}
