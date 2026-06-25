/**
 * Parses short duration strings like "15m", "30d", "12h", "45s" into ms.
 * Used to compute the persisted expiry of refresh tokens.
 */
export function parseDurationToMs(input: string): number {
  const m = /^(\d+)\s*(s|m|h|d)$/.exec(input.trim());
  if (!m) {
    const n = Number(input);
    if (Number.isFinite(n)) return n * 1000; // bare number = seconds
    throw new Error(`Invalid duration: ${input}`);
  }
  const value = Number(m[1]);
  const unit = m[2];
  const mult = unit === 's' ? 1e3 : unit === 'm' ? 6e4 : unit === 'h' ? 36e5 : 864e5;
  return value * mult;
}
