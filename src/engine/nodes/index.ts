import type { NodeTypeDefinition } from '../types';
import { DATA_NODE_DEFINITIONS } from './data';
import { LOGIC_NODE_DEFINITIONS } from './logic';
import { TRANSFORM_NODE_DEFINITIONS } from './transform';
import { IO_NODE_DEFINITIONS } from './io';
import { FLOW_NODE_DEFINITIONS } from './flow';

export const ALL_NODE_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  ...DATA_NODE_DEFINITIONS,
  ...LOGIC_NODE_DEFINITIONS,
  ...TRANSFORM_NODE_DEFINITIONS,
  ...IO_NODE_DEFINITIONS,
  ...FLOW_NODE_DEFINITIONS,
] as const;
