import type { NodeTypeDefinition } from '../types';

export const TEXT_DEFINITION: NodeTypeDefinition = {
  kind: 'text',
  label: 'Text',
  category: 'ui',
  description: 'Displays text content with customizable font size, color, and style.',
  inputs: [],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
  ],
  editableSchema: false,
} as const;

export const BUTTON_DEFINITION: NodeTypeDefinition = {
  kind: 'button',
  label: 'Button',
  category: 'ui',
  description: 'A clickable button with label and variant options.',
  inputs: [],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
    { name: 'onClick', type: 'any', label: 'On Click', required: false },
  ],
  editableSchema: false,
} as const;

export const INPUT_DEFINITION: NodeTypeDefinition = {
  kind: 'input',
  label: 'Input',
  category: 'ui',
  description: 'A text input field with placeholder and type options.',
  inputs: [],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
    { name: 'value', type: 'string', label: 'Value', required: false },
  ],
  editableSchema: false,
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
  inputs: [],
  outputs: [
    { name: 'element', type: 'object', label: 'Element', required: true },
  ],
  editableSchema: false,
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