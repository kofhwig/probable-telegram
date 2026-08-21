/**
 * The Bloom prototype was written entirely in CSS `oklch()`. React Native's style
 * engine does not understand that colour space, so we convert at module load —
 * keeping the original perceptual values in the source instead of a table of
 * hand-converted hex codes that would drift the moment a hue is nudged.
 *
 * OKLCh -> OKLab -> LMS -> linear sRGB -> gamma-encoded sRGB.
 */

function gamma(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n * 255)));
}

/**
 * @param l lightness, 0..1
 * @param c chroma, roughly 0..0.4
 * @param h hue angle in degrees
 * @param alpha 0..1, defaults to opaque
 */
export function oklch(l: number, c: number, h: number, alpha = 1): string {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const L = l_ * l_ * l_;
  const M = m_ * m_ * m_;
  const S = s_ * s_ * s_;

  const r = gamma(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S);
  const g = gamma(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S);
  const bl = gamma(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S);

  const R = clamp255(r);
  const G = clamp255(g);
  const B = clamp255(bl);

  if (alpha >= 1) {
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${hex(R)}${hex(G)}${hex(B)}`;
  }
  return `rgba(${R}, ${G}, ${B}, ${alpha})`;
}

/** `rgba(255,255,255,a)` — the prototype's overlay whites. */
export function white(alpha: number): string {
  return `rgba(255, 255, 255, ${alpha})`;
}

/** `rgba(0,0,0,a)` — the prototype's shadows and scrims. */
export function black(alpha: number): string {
  return `rgba(0, 0, 0, ${alpha})`;
}

/** Re-alpha a colour produced by {@link oklch}, for shadows and glows. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3, ${alpha})`);
}
