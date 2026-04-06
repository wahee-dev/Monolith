import { renderStringField } from './string';
import { renderNumberField } from './number';
import { renderBooleanField } from './boolean';

export function renderObjectField(value: unknown): string {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      const val = obj[key];
      const rendered = renderFieldValue(val);
      parts.push(`${key}: ${rendered}`);
    }
    if (parts.length === 0) {
      return '{}';
    }
    return `{ ${parts.join(', ')} }`;
  }
  return '{}';
}

function renderFieldValue(value: unknown): string {
  if (typeof value === 'string') return renderStringField(value);
  if (typeof value === 'number') return renderNumberField(value);
  if (typeof value === 'boolean') return renderBooleanField(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.slice(0, 3).map(renderFieldValue);
    const suffix = value.length > 3 ? `, ...(${value.length})` : '';
    return `[${items.join(', ')}${suffix}]`;
  }
  if (typeof value === 'object' && value !== null) return renderObjectField(value);
  return String(value);
}
