import { renderStringField } from './string';
import { renderNumberField } from './number';
import { renderBooleanField } from './boolean';
import { renderObjectField } from './object';

export function renderArrayField(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = value.slice(0, 5).map(renderItemValue);
    const suffix = value.length > 5 ? `, ...(${value.length} items)` : '';
    return `[${items.join(', ')}${suffix}]`;
  }
  return '[]';
}

function renderItemValue(value: unknown): string {
  if (typeof value === 'string') return renderStringField(value);
  if (typeof value === 'number') return renderNumberField(value);
  if (typeof value === 'boolean') return renderBooleanField(value);
  if (Array.isArray(value)) return renderArrayField(value);
  if (typeof value === 'object' && value !== null) return renderObjectField(value);
  return String(value);
}
