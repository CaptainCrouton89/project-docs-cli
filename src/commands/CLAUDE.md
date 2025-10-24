# Command Handlers Architecture

## Overview

This directory contains the implementation of all CLI commands. Each file exports a single handler function that encapsulates command logic.

## File Structure

```
check.ts      - Documentation validation engine
list.ts       - Query and formatting for all document types
generate.ts   - Markdown export pipeline
info.ts       - Project summary statistics
template.ts   - Template delivery system
```

## Command Handler Pattern

All handlers follow this signature:
```typescript
export function commandName(docsDir: string, options: object): void
```

Key characteristics:
- **Functional design**: Pure logic, side effects only at output
- **Error handling**: Try-catch wrapping all file I/O, graceful degradation
- **Type safety**: Manual interfaces for parsed YAML structures
- **No validation library**: Simple field checks using utils accessors

## Common Patterns

### Parsing YAML with Safe Accessors
```typescript
const data = loadYaml(filePath);
const name = getString(data, 'field_name');
const items = getArray(data, 'items');
```

### Multi-document Processing
- Scan directory for `.yaml`/`.yml` files
- Filter/map over results with type-specific parsers
- Format output per options (summary/json/markdown/etc)

### Status-Based Filtering
- Use `status` field: `incomplete`, `in-progress`, `complete`
- Default behavior: hide complete items (override with `--all`)

### Directory Discovery
- Called as: `handler(docsDir, options)` where docsDir comes from `findDocsDir()`
- Commands never call `findDocsDir()` directly (delegated from cli.ts)

## Adding New Commands

1. Create handler function with signature: `(docsDir: string, options: object): void`
2. Export function from file
3. Register in `src/cli.ts` with command definition
4. Add tests following recommendation from root CLAUDE.md

## Implementation Notes

- All commands call `ensureClaudeDoc(docsDir)` for template safety (see utils.ts)
- Console output goes directly to stdout/stderr
- Process exit codes: 0 (success), 1 (validation/parsing failure)
- No promises/async—all operations are synchronous
