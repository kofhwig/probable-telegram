/**
 * The domain tests are pure functions over dates, so pin "today" — otherwise a
 * run that straddles midnight UTC produces different history windows.
 */
jest.useFakeTimers({ now: new Date('2026-03-17T12:00:00Z'), doNotFake: ['nextTick'] });
