export type TokenKind =
  | 'Identifier'
  | 'NumberLiteral'
  | 'StringLiteral'
  | 'BooleanLiteral'
  | 'Operator'
  | 'Arrow'
  | 'Dot'
  | 'LParen'
  | 'RParen'
  | 'Comma'
  | 'If'
  | 'Else'
  | 'EOF';

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly position: number;
}

const OPERATOR_CHARS = new Set(['!', '=', '>', '<', '+', '-', '*', '/', '%', '&', '|']);

const MULTI_CHAR_OPS: ReadonlyMap<string, string> = new Map([
  ['==', '=='],
  ['!=', '!='],
  ['>=', '>='],
  ['<=', '<='],
  ['&&', '&&'],
  ['||', '||'],
  ['->', '->'],
]);

const SINGLE_CHAR_OPS: ReadonlyMap<string, string> = new Map([
  ['>', '>'],
  ['<', '<'],
  ['+', '+'],
  ['-', '-'],
  ['*', '*'],
  ['/', '/'],
  ['%', '%'],
  ['!', '!'],
]);

const KEYWORDS: ReadonlyMap<string, TokenKind> = new Map([
  ['if', 'If'],
  ['else', 'Else'],
  ['true', 'BooleanLiteral'],
  ['false', 'BooleanLiteral'],
]);

export function tokenize(source: string): ReadonlyArray<Token> {
  const tokens: Array<Token> = [];
  let pos = 0;

  while (pos < source.length) {
    const ch = source[pos];
    if (ch === undefined) break;

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      pos += 1;
      continue;
    }

    if (ch === '"') {
      const start = pos;
      pos += 1;
      let value = '';
      while (pos < source.length && source[pos] !== '"') {
        const c = source[pos];
        if (c === undefined) break;
        if (c === '\\') {
          pos += 1;
          const escaped = source[pos];
          if (escaped === undefined) break;
          value += escaped;
        } else {
          value += c;
        }
        pos += 1;
      }
      pos += 1;
      tokens.push({ kind: 'StringLiteral', value, position: start });
      continue;
    }

    if (ch >= '0' && ch <= '9') {
      const start = pos;
      let value = '';
      while (pos < source.length) {
        const c = source[pos];
        if (c === undefined || c < '0' || c > '9') break;
        value += c;
        pos += 1;
      }
      if (pos < source.length && source[pos] === '.') {
        value += '.';
        pos += 1;
        while (pos < source.length) {
          const c = source[pos];
          if (c === undefined || c < '0' || c > '9') break;
          value += c;
          pos += 1;
        }
      }
      tokens.push({ kind: 'NumberLiteral', value, position: start });
      continue;
    }

    if (OPERATOR_CHARS.has(ch)) {
      const start = pos;
      const twoChar = pos + 1 < source.length ? source[pos]! + (source[pos + 1] ?? '') : source[pos]!;

      if (MULTI_CHAR_OPS.has(twoChar)) {
        if (twoChar === '->') {
          tokens.push({ kind: 'Arrow', value: '->', position: start });
        } else {
          tokens.push({ kind: 'Operator', value: twoChar, position: start });
        }
        pos += 2;
        continue;
      }

      const single = SINGLE_CHAR_OPS.get(ch);
      if (single !== undefined) {
        tokens.push({ kind: 'Operator', value: single, position: start });
        pos += 1;
        continue;
      }

      pos += 1;
      continue;
    }

    if (ch === '.') {
      tokens.push({ kind: 'Dot', value: '.', position: pos });
      pos += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ kind: 'LParen', value: '(', position: pos });
      pos += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ kind: 'RParen', value: ')', position: pos });
      pos += 1;
      continue;
    }

    if (ch === ',') {
      tokens.push({ kind: 'Comma', value: ',', position: pos });
      pos += 1;
      continue;
    }

    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      const start = pos;
      let value = '';
      while (pos < source.length) {
        const c = source[pos];
        if (c === undefined) break;
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_') {
          value += c;
          pos += 1;
        } else {
          break;
        }
      }
      const keywordKind = KEYWORDS.get(value);
      if (keywordKind !== undefined) {
        tokens.push({ kind: keywordKind, value, position: start });
      } else {
        tokens.push({ kind: 'Identifier', value, position: start });
      }
      continue;
    }

    pos += 1;
  }

  tokens.push({ kind: 'EOF', value: '', position: pos });
  return tokens;
}
