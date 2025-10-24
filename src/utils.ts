import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import * as yaml from 'js-yaml';

/**
 * Walk up directory tree to find docs/ directory
 * Only searches upward, never downward
 */
export function findDocsDir(): string | null {
  let currentDir = process.cwd();
  const root = '/';

  while (currentDir !== root) {
    const docsPath = join(currentDir, 'docs');

    if (existsSync(docsPath) && statSync(docsPath).isDirectory()) {
      return docsPath;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

/**
 * Find YAML files in a directory
 */
export function findYamlFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && (e.name.endsWith('.yaml') || e.name.endsWith('.yml')))
      .map(e => join(dir, e.name))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Load and parse YAML file
 */
export function loadYaml(filePath: string): Record<string, unknown> | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(content);
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Get string value from parsed YAML
 */
export function getString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value === 'string') return value;
  return '';
}

/**
 * Get nested string value
 */
export function getNestedString(obj: Record<string, unknown>, parent: string, child: string): string {
  const parentObj = obj[parent];
  if (typeof parentObj === 'object' && parentObj !== null) {
    const value = (parentObj as Record<string, unknown>)[child];
    if (typeof value === 'string') return value;
  }
  return '';
}

/**
 * Get array from parsed YAML
 */
export function getArray(obj: Record<string, unknown>, key: string): unknown[] {
  const value = obj[key];
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * Get number from parsed YAML
 */
export function getNumber(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

/**
 * Ensure CLAUDE.md exists in docs/ directory
 * Installs from template if not present
 */
export function ensureClaudeDoc(docsDir: string): void {
  const claudePath = join(docsDir, 'CLAUDE.md');

  if (existsSync(claudePath)) {
    return; // Already exists
  }

  // Get template file path relative to the current file location
  // In CommonJS, we use __dirname from the caller context
  // We'll need to pass it or calculate from process.cwd()
  // For now, use a relative path from the module location
  const templatesDir = join(__dirname, '..', '..', 'templates');
  const templatePath = join(templatesDir, 'CLAUDE.template.md');

  if (!existsSync(templatePath)) {
    console.log('Warning: CLAUDE.template.md not found, skipping auto-install');
    return;
  }

  try {
    const templateContent = readFileSync(templatePath, 'utf-8');
    writeFileSync(claudePath, templateContent, 'utf-8');
    console.log('✓ Installed CLAUDE.md in docs/ directory');
  } catch (error) {
    console.log(`Warning: Failed to install CLAUDE.md: ${error}`);
  }
}
