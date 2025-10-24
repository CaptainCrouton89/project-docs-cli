Codebase Architecture & Technical Guide

## High-Level Overview

**project-docs-cli** is a Node.js CLI tool for managing YAML-based project documentation. It provides validation, querying, and generation capabilities for structured documentation across product requirements, features, APIs, and system design.

> **Note**: The `docs/` directory in this repository contains example documentation for testing purposes only. This example demonstrates the complete documentation structure expected by the CLI tool.

### Core Purpose
- Enforce consistent documentation structure via YAML specs
- Validate cross-references between documentation types (PRD features → feature specs → user stories)
- Export YAML specifications to human-readable markdown documentation
- Query documentation by type with filtering and formatting options
- Provide templates for all document types to bootstrap projects

### Target Workflow
```
PRD → User Flows → User Stories → Feature Specs → System Design → API Contracts → Data Plan → Design Spec
```

---

## Architecture & Component Design

### CLI Entry Point: `src/cli.ts`

The CLI is built on **Commander.js** and registers 5 main commands:

```
pdocs check       - Validate documentation completeness and consistency
pdocs list        - Query documentation by type (features, apis, stories, flows)
pdocs generate    - Export YAML to markdown/HTML
pdocs info        - Display quick project overview
pdocs template    - Retrieve templates for document types
```

**Key Design Pattern:**
- All commands auto-discover the `docs/` directory by walking upward from cwd
- All commands call `ensureClaudeDoc()` to install `CLAUDE.md` if missing
- Commands delegate to handler functions in `src/commands/` directory

**Command Architecture:**
```
cli.ts (router)
  ├── commands/check.ts      (validation logic)
  ├── commands/list.ts       (query & formatting)
  ├── commands/generate.ts   (markdown export)
  ├── commands/info.ts       (summary stats)
  ├── commands/template.ts   (template delivery)
  └── utils.ts               (shared helpers)
```

---

## Documentation Structure & File Organization

### Expected Directory Layout
```
docs/
├── product-requirements.yaml      # Root: Project goals, features list
├── system-design.yaml             # Root: Tech stack, components, architecture
├── api-contracts.yaml             # Root: API endpoints (OpenAPI format)
├── data-plan.yaml                 # Root: Analytics, events, metrics
├── design-spec.yaml               # Root: UI/UX guidelines, design tokens
├── user-flows/*.yaml              # Multi-file: User journeys, personas
├── user-stories/*.yaml            # Multi-file: Story ID, feature ref, ACs
├── feature-specs/*.yaml           # Multi-file: Feature ID, implementation details
├── requirements/*.yaml            # Multi-file: Detailed feature requirements
├── investigations/*.yaml          # Multi-file: Context bundles for features
├── plans/*.yaml                   # Multi-file: Implementation plans
└── CLAUDE.md                       # Auto-installed quick reference
```

**ID Conventions:**
- Features: `F-01`, `F-02`, etc. (defined in PRD)
- Stories: `US-101`, `US-102`, etc. (defined in story files)
- Files: kebab-case (e.g., `admin-dashboard.yaml`)

---

## Core Utilities: `src/utils.ts`

All file I/O and YAML parsing is centralized here.

### Key Functions

**Directory Discovery:**
- `findDocsDir()` - Walk upward from cwd to find `docs/` folder (returns absolute path or null)
- `findYamlFiles(dir)` - Recursively list all `.yaml`/`.yml` files in a directory

**YAML Parsing:**
- `loadYaml(filePath)` - Parse YAML file, return typed object or null on error
- Type extractors: `getString()`, `getArray()`, `getNumber()`, `getNestedString()` - Safe accessors that handle missing/wrong types

**Template Installation:**
- `ensureClaudeDoc(docsDir)` - Copy `CLAUDE.template.md` to `docs/CLAUDE.md` if not present
  - Called by every command as safety net
  - Uses `__dirname` to locate templates relative to compiled dist

**Error Handling:**
- All file operations wrapped in try-catch
- Graceful degradation: returns empty/null on errors
- Type-safe accessors prevent crashes from malformed YAML

---

## Command Implementation Details

### 1. `check` Command - Documentation Validation

**Flow:**
1. Verify docs/ exists
2. Run category-specific checks in sequence:
   - PRD: existence, required fields (`project_name`, `summary`, `goal`), feature count
   - User Flows: directory exists, files have flows defined
   - User Stories: story files valid, "as a" statement complete
   - Feature Specs: file count, status tracking (complete/in-progress/incomplete)
   - System Design: file exists, goal/tech stack defined
   - API Contracts: endpoint count, method/path parsing
   - Data Plan: data sources defined
   - Design Spec: design goals specified
3. Cross-reference validation: Check PRD feature IDs match feature spec files
4. Output summary with error/warning counts, exit code 0/1

**Output Modes:**
- `summary` (default): High-level pass/fail per category
- `detailed`: Include all checks with hints
- `json`: Structured output for tooling

**Options:**
- `-v, --verbose` - Show all checks including passes
- `--no-links` - Skip cross-reference validation (faster)
- `--format` - Output format (summary|detailed|json)

### 2. `list` Command - Documentation Queries

Handles 4 document types with type-specific formatters.

**Features:**
- Parse: `feature_id`, `title`, `status`, `summary`, `progress` (from implementation_status)
- Filters: `--status`, `--all` (default: hide complete)
- Sorts: `--sort` by id|status|title
- Formats:
  - `summary` (default): Table with ID, title, progress %, status icon
  - `stats`: Completion percentages and counts
  - `json`: One-per-line JSON objects

**APIs:**
- Parse: `method`, `path`, `summary` from `paths[path][method]` structure
- Filters: `--method` (GET|POST|etc), `--path` (substring match)
- Formats:
  - `summary` (default): Table of methods, paths, descriptions
  - `curl`: Generate `curl` commands with placeholders
  - `json`: One-per-line JSON
  - `markdown`: Markdown formatted endpoint list
- Options: `--base-url` for curl generation (default: http://localhost:3000)

**Stories:**
- Parse: `story_id`, `title`, `feature_id`, `status` per file
- Filters: `--feature`, `--status`, `--all`
- Formats:
  - `summary` (default): Table of ID, feature, title, status
  - `ids`: Just story IDs (useful for scripting)
  - `json`: One-per-line JSON

**Flows:**
- Parse: `title`, `key_personas`, `primary_flows`, `secondary_flows` per file
- Filters: `--persona` (case-insensitive substring)
- Formats:
  - `summary` (default): File summary with flow count and persona list
  - `json`: One-per-line JSON with comma-separated personas

### 3. `generate` Command - Export to Markdown

**Output Structure:**
- `overview.md` - Project summary from PRD
- `features.md` - All feature specs with core logic and API endpoints
- `api-reference.md` - Detailed API documentation with responses
- `architecture.md` - System design, components, tech stack
- `README.md` - Index with TOC

**Flow:**
1. Create output directory (default: `docs/generated/`)
2. Parse each YAML source and extract relevant fields
3. Generate markdown with proper headings and sections
4. Write files to output directory

**Options:**
- `-o, --output` - Target directory (default: docs/generated)
- `-f, --format` - Format type (markdown|html; currently only markdown implemented)
- `--no-toc` - Skip table of contents (not currently used)

**Data Extraction:**
- Uses nested field accessors to handle complex YAML structures
- Handles arrays of objects (components, endpoints, features)
- Gracefully skips missing sections with warnings

### 4. `info` Command - Project Summary

Quick overview of documentation completeness:

**Stats Displayed:**
- Project name from PRD
- Feature count (PRD definition vs. specs written)
- Story counts by status (complete/in-progress/incomplete)
- User flow file count
- API endpoint count
- System component count

**Uses:** Status field to track progress; shows totals and breakdown

### 5. `template` Command - Bootstrapping

**Template Types:**
```
Root documents:
  product-requirements    - PRD with features list
  system-design          - Components, tech stack, diagrams
  api-contracts          - OpenAPI structure
  data-plan              - Analytics events, metrics
  design-spec            - UI design tokens, brand guidelines

Multi-file documents:
  user-flow              - Journey map, personas, steps
  user-story             - Story ID, "as a/I want/so that", ACs
  feature-spec           - Feature ID, functional overview, APIs, QA
  requirements           - Detailed feature requirements and edge cases

Planning & Investigation:
  investigation-topic    - Context bundle for implementing features
  plan                   - Implementation plan with task breakdown
```

**Implementation:**
- Map template name → YAML filename
- Read from `templates/` directory in distribution
- Output to stdout (pipe to file as needed)

---

## Build System & TypeScript Configuration

### package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",              // Compile TS to JS in dist/
    "dev": "tsc --watch",        // Watch mode for development
    "prepublishOnly": "pnpm run build",  // Auto-build before publish
    "package": "npm install && npm run build && npm link"  // Full setup
  }
}
```

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",          // Modern node compatibility
    "module": "commonjs",        // Node module system
    "lib": ["ES2020"],
    "outDir": "./dist",          // Compiled output location
    "rootDir": "./src",          // Source root
    "strict": true,              // Full type safety
    "esModuleInterop": true,     // Interop with CommonJS modules
    "declaration": true,         // Generate .d.ts files
    "sourceMap": true            // Debugging support
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key Decisions:**
- **CommonJS** for Node.js compatibility (ES2020 target)
- **Strict mode** enforced (no implicit any)
- **Source maps** enabled for debugging TypeScript in dev
- **Declarations** generated for module consumers

### Build Artifacts

- `dist/cli.js` - Entry point (has shebang `#!/usr/bin/env node`)
- `dist/**/*.js` - Compiled command modules
- `dist/**/*.js.map` - Source maps for debugging
- Linked to `pdocs` binary via `bin.pdocs` in package.json

---

## Technical Patterns & Design Decisions

### 1. Functional Command Design
- Each command is a pure function: `(docsDir: string, options: object) => void`
- Side effects (console.log, process.exit) encapsulated in command
- Easy to test: can mock file system and capture console output

### 2. Type Safety Without Codegen
- Manual TypeScript interfaces for parsed YAML structures
- Utility functions (`getString`, etc.) provide type-safe defaults
- No YAML schema validation library dependency (keeps it lightweight)
- Trade-off: validation happens at check time, not parse time

### 3. Graceful Degradation
- Missing directories return empty arrays (not errors)
- Malformed YAML files logged as warnings, not fatal
- Commands continue to run even with partial data
- User gets warnings but doesn't hit hard stops

### 4. Status-Based Filtering
All multi-file documents use consistent `status` field:
- `incomplete` - Not started
- `in-progress` - Active work
- `complete` - Done and verified

Default list view hides complete items (can override with `--all`)

### 5. Directory Discovery Algorithm
- Walk upward from cwd to find `docs/` folder
- Stops at filesystem root
- Returns first match found
- Enables command usage from any project subdirectory

### 6. Template as Installation Safety Net
- `CLAUDE.md` auto-installed on first command run
- Located in `templates/CLAUDE.template.md`
- Provides quick reference without hitting docs
- Relies on package distribution including templates/

---

## Dependencies & Rationale

### Production Dependencies
- **commander** (latest) - CLI argument parsing and subcommand routing
- **js-yaml** (latest) - YAML parsing with safe defaults

### Dev Dependencies
- **@types/node** - Node.js type definitions
- **@types/js-yaml** - js-yaml type definitions
- **typescript** - Language and compiler

**Philosophy:** Minimal dependencies. No test framework (focus on CLI, not unit-testable logic). No validation library (simple field checks in commands).

---

## Key Files & Their Responsibilities

| File | Purpose | Key Exports |
|------|---------|------------|
| `src/cli.ts` | CLI routing & command registration | N/A (entry point) |
| `src/commands/check.ts` | Document validation engine | `check(docsDir, options)` |
| `src/commands/list.ts` | Query & format documents | `list(docsDir, type, options)` |
| `src/commands/generate.ts` | Markdown export | `generate(docsDir, options)` |
| `src/commands/info.ts` | Summary statistics | `info(docsDir)` |
| `src/commands/template.ts` | Template delivery | `template(type)` |
| `src/utils.ts` | Shared file I/O & parsing | 8 functions, see above |
| `templates/CLAUDE.template.md` | Quick reference guide (auto-installed) | N/A |

---

## Common Workflows & Usage Patterns

### Initial Project Setup
```bash
pdocs template product-requirements > docs/product-requirements.yaml
pdocs template user-story > docs/user-stories/example.yaml
pdocs check -v
```

### Daily Development
```bash
pdocs info                                # Check project status
pdocs list stories --feature F-01         # Stories for current feature
pdocs check                               # Validate completeness
```

### Documentation Export
```bash
pdocs generate --output ./export
pdocs list apis --format curl --base-url https://api.example.com
pdocs list features --format stats
```

### Troubleshooting
```bash
pdocs check --format detailed      # Detailed error messages with hints
pdocs list <type> --format json    # Machine-readable output for scripting
pdocs template <type> | less       # View template reference
```

---

## Extending the Codebase

### Adding a New Document Type

1. **Define interface** in `src/commands/list.ts`:
   ```typescript
   interface NewDocData {
     id: string;
     title: string;
     status: string;
     // ... custom fields
   }
   ```

2. **Create parser** to extract from YAML:
   ```typescript
   function parseNewDoc(file: string): NewDocData | null {
     const data = loadYaml(file);
     return { id: getString(data, 'id'), ... };
   }
   ```

3. **Add list handler** in list.ts:
   ```typescript
   function listNewDocs(docsDir: string, options): void {
     // filtering, formatting logic
   }
   ```

4. **Register in list() switch** and add CLI option in `cli.ts`

5. **Add check() validation** in `src/commands/check.ts`:
   ```typescript
   function checkNewDocs(docsDir: string, verbose: boolean): void {
     // validation logic
   }
   ```

6. **Create template** in `templates/new-doc.yaml`

7. **Register template type** in `src/commands/template.ts`

### Adding a New Output Format

**For list command:**
1. Add condition in type-specific list function:
   ```typescript
   if (options.format === 'custom') {
     items.forEach(item => {
       console.log(formatCustom(item));
     });
     return;
   }
   ```

**For generate command:**
1. Create new generator function:
   ```typescript
   function generateCustomFormat(docsDir, outputDir): void {
     // parse, transform, write
   }
   ```

2. Call from main `generate()` function

3. Add CLI option: `--format custom`

---

## Testing Strategy

The codebase lacks unit tests. Testing approach:

1. **Manual CLI testing** - Run commands against test docs/ directory
2. **Integration via examples** - See `templates/CLAUDE.template.md` for expected structure
3. **Type checking** - TypeScript strict mode catches many issues
4. **Check command** - Acts as a linter for documentation itself

### Recommended Test Scenarios
- Empty/missing docs/ directory
- Malformed YAML files
- Cross-reference mismatches (stories ref invalid features)
- Complex nested structures in API contracts
- Special characters in YAML fields

---

## Performance Considerations

- **File I/O:** Walks directory tree per command (could cache between calls)
- **YAML parsing:** Full parse per file (no streaming)
- **Memory:** All data loaded into memory (acceptable for typical doc sizes <10MB)
- **Scaling:** Suitable for projects with 50-200 YAML files

For large-scale documentation (1000+ files), consider:
- Caching parsed YAML between commands
- Streaming API endpoint parsing
- Indexed cross-reference lookups

---

## Debugging

### Enable Source Maps
Build outputs source maps (`*.js.map`). Node debugger can step through TypeScript:

```bash
node --inspect-brk dist/cli.js check --verbose
```

### Common Issues & Solutions

| Issue | Cause | Fix |
|-------|-------|-----|
| "Could not find docs/" | docs/ doesn't exist or not on current path | Change to project root or create docs/ |
| Template not found | Package not properly installed | Run `npm link` or check dist/templates/ path |
| YAML parse errors | Malformed YAML (indentation, quotes) | Use `pdocs check -v` to identify issues |
| Cross-ref warnings | Story/spec references non-existent feature | Update feature_id to match PRD |

---

## Future Enhancement Opportunities

1. **YAML Schema Validation** - Add JSON Schema validation for stricter guarantees
2. **Custom Templates** - Allow projects to define custom document schemas
3. **Markdown → YAML Roundtrip** - Parse markdown to regenerate YAML
4. **Multi-language Support** - Generate docs in different languages
5. **Diff/History** - Track changes to documentation over time
6. **Integration Hooks** - Pre/post-generate callbacks for custom processing
7. **Performance** - Caching layer for repeated queries
8. **Unit Tests** - Comprehensive test suite with fixtures

---

## Summary

**project-docs-cli** provides a lightweight, type-safe framework for structured documentation management. Its modular command architecture and centralized file handling make it easy to extend with new document types or output formats. The focus on validation and cross-reference checking ensures documentation consistency as projects evolve.

Core strength: **Enforces documentation discipline at the YAML level** through validation and provides multiple query/export interfaces for different stakeholder needs.