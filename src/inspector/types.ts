import type { NodeTypeDefinition } from '@engine/types';

export interface InspectorState {
  readonly selectedNodeId: string | null;
  readonly nodeDefinition: NodeTypeDefinition | null;
  readonly expression: string;
  readonly executionOutput: unknown;
  readonly executionError: string;
  readonly lastExecutionTime: number;
  readonly portValues: ReadonlyMap<string, unknown>;
  readonly validationErrors: ReadonlyArray<string>;
}
