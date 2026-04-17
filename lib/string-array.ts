export function normalizeStringArray(
  value: unknown,
  fallback: string[],
  minimum = 1,
): string[] {
  const items = Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

  if (items.length === 0) {
    return fallback.slice(0, Math.max(minimum, 1));
  }

  if (items.length >= minimum) {
    return items;
  }

  const padded = [...items];

  for (const candidate of fallback) {
    if (padded.length >= minimum) {
      break;
    }
    if (!padded.includes(candidate)) {
      padded.push(candidate);
    }
  }

  return padded;
}
