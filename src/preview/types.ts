export type UIElementKind = 'text' | 'input' | 'button' | 'list' | 'container';

export interface UIElement {
  readonly id: string;
  readonly kind: UIElementKind;
  readonly label: string;
  readonly value: string;
  readonly children: ReadonlyArray<UIElement>;
  readonly valid: boolean;
}

export interface ShadowScreen {
  readonly id: string;
  readonly title: string;
  readonly elements: ReadonlyArray<UIElement>;
  readonly valid: boolean;
}

export interface DataFlow {
  readonly id: string;
  readonly fromScreenId: string;
  readonly toScreenId: string;
  readonly label: string;
  readonly valid: boolean;
}

export interface PreviewError {
  readonly nodeId: string;
  readonly message: string;
}

export interface ShadowAppState {
  readonly screens: ReadonlyArray<ShadowScreen>;
  readonly flows: ReadonlyArray<DataFlow>;
  readonly errors: ReadonlyArray<PreviewError>;
  readonly valid: boolean;
  readonly version: number;
}
