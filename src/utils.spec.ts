import { LookUpEntry } from './data/types';
import { lookupEmailAddress } from './utils';

describe('lookupEmailAddress()', () => {
  it('should return the matching email address and undefined otherwise', () => {
    const lookupData: LookUpEntry[] = [
      { persons: [] },
      { persons: [{ mail: 'a.bcd@domain.com' }] },
      { persons: [{ mail: 'a.bcd@domain.com' }, { mail: 'a.xyz@domain.com' }] },
    ];

    const name1 = 'a.xyz';
    const result1 = lookupEmailAddress(name1, lookupData);
    expect(result1).toEqual('a.xyz@domain.com');

    const name2 = 'z.zzz';
    const result2 = lookupEmailAddress(name2, lookupData);
    expect(result2).toEqual(undefined);
  });
});
