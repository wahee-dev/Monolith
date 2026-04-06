export function renderStringField(value: unknown): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (value === undefined) {
    return '""';
  }
  return String(value);
}
