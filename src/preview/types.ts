export interface ShadowAppState {
  readonly screens: ReadonlyArray<ShadowScreen>;
  readonly dataFlows: ReadonlyArray<DataFlow>;
  readonly errors: ReadonlyArray<PreviewError>;
  readonly isValid: boolean;
}

export interface ShadowScreen {
  readonly id: string;
  readonly label: string;
  readonly elements: ReadonlyArray<UIElement>;
}

export type UIElement =
  | { readonly kind: 'text'; readonly content: string; readonly style: ElementStyle }
  | { readonly kind: 'input'; readonly label: string; readonly inputType: 'text' | 'number' | 'email' | 'password'; readonly boundTo: string }
  | { readonly kind: 'button'; readonly label: string; readonly action: string; readonly variant: 'primary' | 'secondary' | 'danger' }
  | { readonly kind: 'list'; readonly items: string; readonly itemType: string }
  | { readonly kind: 'container'; readonly children: ReadonlyArray<UIElement>; readonly direction: 'row' | 'column' };

export interface ElementStyle {
  readonly padding: number;
  readonly margin: number;
  readonly color: string;
}

export interface DataFlow {
  readonly from: string;
  readonly to: string;
  readonly dataType: string;
  readonly isActive: boolean;
}

export interface PreviewError {
  readonly nodeId: string;
  readonly message: string;
}
