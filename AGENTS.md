# Monolith-Engine — Coding Standards

## Project Overview
Monolith-Engine is a Next.js 15 App Router project with TypeScript in the strictest configuration. It consists of three layers:
- **Monolith.Law** (`src/law/`) — Capability-based security layer. Mandatory entry-point for ALL system operations.
- **Monolith.Lattice** (`src/lattice/`) — Deterministic state machine layer via XState v5.
- **Monolith.Mesh** (`src/mesh/`) — Functional geometry UI layer. Pure projection of Lattice state.

## Absolute Rules

### ZERO `any`
No `any` type anywhere — not in comments, not in casts, not in generics, not in type parameters. Use `unknown` if you truly don't know the type, then narrow.

### ZERO Nullable Types
Do not return `null` or `undefined` from functions. Use `LawResult<T>` instead:
```typescript
type LawResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: LawError };
```

### LawResult Pattern
All operations that can fail MUST return `LawResult<T>`. Never throw exceptions for control flow. Never return null/undefined. Always handle both `ok: true` and `ok: false` branches.

### Immutability
Use `readonly` on ALL data structures. Use `ReadonlyArray`, `ReadonlyMap`, `ReadonlySet`. No mutation — create new objects for changes.

### Total Functions
All functions must be defined for all possible inputs and produce output for all inputs. No partial functions, no unhandled cases.

### Explicit Return Types
Every exported function must have an explicit return type annotation.

### No Console
No `console.log`. Use the governance ledger for audit trails. `console.warn` and `console.error` are allowed in designated logging areas.

## TypeScript Configuration
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `noPropertyAccessFromIndexSignature: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

## Path Aliases
- `@law/*` → `src/law/*`
- `@lattice/*` → `src/lattice/*`
- `@mesh/*` → `src/mesh/*`

## Build and Verify
```bash
npm install
npx tsc --noEmit   # Must pass with ZERO errors
```

## Architecture Principles
1. **Law is the gate** — Every operation goes through `guard()` before execution.
2. **Lattice is the state** — All state lives in the Lattice. No hidden state, no closures, no globals.
3. **Mesh is the projection** — The UI is a pure function of Lattice state. No additional UI state beyond viewport.
4. **Data drives rendering** — No hardcoded component logic. Everything derived from schemas and types.
