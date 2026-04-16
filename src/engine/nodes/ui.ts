import type { NodeTypeDefinition } from '../types';

export const TEXT_DEFINITION: NodeTypeDefinition = {
  kind: 'text',
  label: 'Text',
  category: 'ui',
  description: 'Displays text content with customizable font size, color, and style.',
  inputs: [
    { name: 'text', type: 'string', label: 'Text', required: true },
    { name: 'color', type: 'string', label: 'Color', required: false },
    { name: 'fontSize', type: 'number', label: 'Font Size', required: false },
  ],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
  ],
  editableSchema: true,
} as const;

export const BUTTON_DEFINITION: NodeTypeDefinition = {
  kind: 'button',
  label: 'Button',
  category: 'ui',
  description: 'A clickable button with label and variant options.',
  inputs: [
    { name: 'label', type: 'string', label: 'Label', required: true },
    { name: 'backgroundColor', type: 'string', label: 'Background Color', required: false },
    { name: 'color', type: 'string', label: 'Text Color', required: false },
  ],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
    { name: 'onClick', type: 'any', label: 'On Click', required: false },
  ],
  editableSchema: true,
} as const;

export const INPUT_DEFINITION: NodeTypeDefinition = {
  kind: 'input',
  label: 'Input',
  category: 'ui',
  description: 'A text input field with placeholder and type options.',
  inputs: [
    { name: 'placeholder', type: 'string', label: 'Placeholder', required: false },
    { name: 'initialValue', type: 'string', label: 'Initial Value', required: false },
  ],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
    { name: 'value', type: 'string', label: 'Value', required: false },
    { name: 'onChange', type: 'any', label: 'On Change', required: false },
  ],
  editableSchema: true,
} as const;

export const CONTAINER_DEFINITION: NodeTypeDefinition = {
  kind: 'container',
  label: 'Container',
  category: 'ui',
  description: 'A container that groups and wraps child elements with padding, margin, and background.',
  inputs: [
    { name: 'children', type: 'any', label: 'Children', required: false },
  ],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
  ],
  editableSchema: false,
} as const;

export const IMAGE_DEFINITION: NodeTypeDefinition = {
  kind: 'image',
  label: 'Image',
  category: 'ui',
  description: 'Displays an image with source, alt text, and size options.',
  inputs: [
    { name: 'src', type: 'string', label: 'Source', required: true },
    { name: 'alt', type: 'string', label: 'Alt Text', required: false },
    { name: 'width', type: 'number', label: 'Width', required: false },
    { name: 'height', type: 'number', label: 'Height', required: false },
  ],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
  ],
  editableSchema: true,
} as const;

export const FLEX_DEFINITION: NodeTypeDefinition = {
  kind: 'flex',
  label: 'Flex',
  category: 'ui',
  description: 'A flexbox layout container for aligning child elements.',
  inputs: [
    { name: 'children', type: 'any', label: 'Children', required: false },
  ],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
  ],
  editableSchema: false,
} as const;

export const UI_NODE_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  TEXT_DEFINITION,
  BUTTON_DEFINITION,
  INPUT_DEFINITION,
  CONTAINER_DEFINITION,
  IMAGE_DEFINITION,
  FLEX_DEFINITION,
] as const;