import { parseDurationMs } from './tokens.service';

describe('parseDurationMs', () => {
  it.each([
    ['10s', 10_000],
    ['15m', 15 * 60_000],
    ['2h', 2 * 3_600_000],
    ['7d', 7 * 86_400_000],
    [' 30s ', 30_000], // trims whitespace
  ])('parses "%s" to %i ms', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it('falls back to seconds when input is a plain number', () => {
    expect(parseDurationMs('45')).toBe(45_000);
  });

  it.each(['', 'abc', '10x', '-5s', '0'])(
    'throws on invalid duration "%s"',
    (input) => {
      expect(() => parseDurationMs(input)).toThrow(/Durée invalide/);
    },
  );
});
