import { money, money2, parseNum, pct, price, qty, signed, toneOf } from '../format';

describe('parseNum', () => {
  it('reads plain numbers', () => {
    expect(parseNum('150')).toBe(150);
    expect(parseNum('0.55')).toBe(0.55);
    expect(parseNum(42)).toBe(42);
  });

  it('reads US grouping', () => {
    expect(parseNum('1,234.56')).toBeCloseTo(1234.56);
    expect(parseNum('70,727')).toBe(70727);
  });

  it('reads European grouping', () => {
    expect(parseNum('1.234,56')).toBeCloseTo(1234.56);
    expect(parseNum('1234,56')).toBeCloseTo(1234.56);
  });

  it('strips currency symbols and stray text', () => {
    expect(parseNum('$1,999.99')).toBeCloseTo(1999.99);
    expect(parseNum('€ 250')).toBe(250);
  });

  it('returns NaN for nothing usable', () => {
    expect(parseNum('')).toBeNaN();
    expect(parseNum('abc')).toBeNaN();
    expect(parseNum(null)).toBeNaN();
  });
});

describe('money formatting', () => {
  it('shows whole units by default and negatives with a minus', () => {
    expect(money('USD', 1234.56)).toBe('$1,235');
    expect(money('USD', -400)).toBe('-$400');
  });

  it('keeps cents below 100 only', () => {
    expect(money2('USD', 42.5)).toBe('$42.50');
    expect(money2('USD', 4250)).toBe('$4,250');
  });

  it('drops cents on prices at or above 10,000', () => {
    expect(price('USD', 172.32)).toBe('$172.32');
    expect(price('USD', 70727)).toBe('$70,727');
  });

  it('uses the selected currency symbol', () => {
    expect(money('EUR', 100)).toBe('€100');
    expect(money('SEK', 100)).toBe('kr 100');
  });

  it('signs gains and losses with a true minus glyph', () => {
    expect(signed('USD', 250)).toBe('+$250');
    expect(signed('USD', -250)).toBe('−$250');
    expect(pct(1.5)).toBe('+1.50%');
    expect(pct(-1.5)).toBe('−1.50%');
  });

  it('scales quantity precision to size', () => {
    expect(qty(0.017)).toBe('0.017');
    expect(qty(12.3456789)).toBe('12.3457');
    expect(qty(280)).toBe('280');
  });
});

describe('toneOf', () => {
  it('treats near-zero as flat', () => {
    expect(toneOf(0.00001)).toBe('flat');
    expect(toneOf(1)).toBe('up');
    expect(toneOf(-1)).toBe('down');
  });
});
