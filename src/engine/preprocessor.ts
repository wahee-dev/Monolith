const IMPORT_PATTERN = /import\s+\[([^\]]+)\]/g;

export function preprocessImports(code: string): string {
  if (!code.includes('import [')) {
    return code;
  }

  return code.replace(IMPORT_PATTERN, (_match: string, names: string) => {
    const componentList = names.split(',').map((n: string) => n.trim());
    const declarations = componentList
      .map((name: string) => `const ${name} = Monolith.getComponent('${name}')`)
      .join('; ');
    return declarations + ';';
  });
}

export function isJSHybrid(code: string): boolean {
  return code.includes('import [') || code.includes('Monolith.');
}
