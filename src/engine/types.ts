export type PortType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any' | 'void';

export interface PropertyDefinition {
  readonly name: string;
  readonly type: PortType;
  readonly label: string;
  readonly required: boolean;
  readonly default?: unknown;
  readonly options?: ReadonlyArray<string>;
}

export interface PortDefinition {
  readonly name: string;
  readonly type: PortType;
  readonly label: string;
  readonly required: boolean;
}

export type NodeCategory = 'data' | 'logic' | 'transform' | 'io' | 'ui' | 'flow' | 'state';

export interface NodeTypeDefinition {
  readonly kind: string;
  readonly label: string;
  readonly category: NodeCategory;
  readonly description: string;
  readonly inputs: ReadonlyArray<PortDefinition>;
  readonly outputs: ReadonlyArray<PortDefinition>;
  readonly properties?: ReadonlyArray<PropertyDefinition>;
  readonly editableSchema: boolean;
}

export interface ConnectionValidation {
  readonly isValid: boolean;
  readonly error: string;
}

export interface GraphValidation {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<GraphValidationError>;
  readonly warnings: ReadonlyArray<GraphValidationWarning>;
}

export interface GraphValidationError {
  readonly kind: 'cycle' | 'orphan' | 'type_mismatch' | 'missing_input' | 'duplicate_connection';
  readonly nodeId?: string;
  readonly connectionId?: string;
  readonly message: string;
}

export interface GraphValidationWarning {
  readonly kind: 'unused_output' | 'disconnected';
  readonly nodeId: string;
  readonly message: string;
}

export interface ExecutionTrace {
  readonly nodeId: string;
  readonly portName: string;
  readonly valueType: PortType;
  readonly timestamp: number;
}

export interface GraphExecutionResult {
  readonly success: boolean;
  readonly outputs: ReadonlyMap<string, unknown>;
  readonly trace: ReadonlyArray<ExecutionTrace>;
  readonly error?: string;
  readonly durationMs: number;
}
