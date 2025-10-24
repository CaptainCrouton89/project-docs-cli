# Templates Directory Guide

## Purpose

Provides YAML and markdown templates for bootstrapping documentation projects. Templates are embedded in the CLI distribution and served via `pdocs template <type>` command.

## Template Organization

### Root Document Templates (Single File)
Located in `templates/` root:
- `product-requirements.yaml` - PRD with project goals and feature list
- `system-design.yaml` - Tech stack, components, architecture diagrams
- `api-contracts.yaml` - OpenAPI-formatted endpoint definitions
- `data-plan.yaml` - Analytics events, metrics, data sources
- `design-spec.yaml` - UI design tokens, brand guidelines, color palettes

### Multi-File Document Templates
Located in `templates/` root (each represents one file in a multi-file collection):
- `user-flow.yaml` - User journey map, personas, primary/secondary flows
- `user-story.yaml` - Story ID, "as a" statement, acceptance criteria
- `feature-spec.yaml` - Feature ID, functional overview, API endpoints, QA notes
- `requirements.yaml` - Detailed feature requirements, edge cases, data needs
- `investigation-topic.yaml` - Context bundle: key files, data flow, patterns, gotchas
- `plan.yaml` - Implementation plan: tasks, dependencies, exit criteria, assignments

### Reference Templates
- `CLAUDE.template.md` - Quick reference guide (auto-installed to docs/CLAUDE.md)
- `CLAUDE-template.md` - This file's template (for directory-level CLAUDE.md creation)

## Template Conventions

### YAML Structure
All YAML templates use:
- **Comments** starting with `#` to guide users on required/optional fields
- **Placeholder values** in `<angle-brackets>` to indicate where users should fill in
- **Consistent indentation** (2 spaces for YAML nesting)
- **Descriptive field names** matching those referenced in check/list commands

### File Naming
- Kebab-case for multi-file templates (e.g., `investigation-topic.yaml`)
- Simple names for root document templates (e.g., `product-requirements.yaml`)
- `.template.md` suffix for markdown reference guides

### Template Mapping (in src/commands/template.ts)
CLI aliases map user input to template filenames:
- `pdocs template product-requirements` → `templates/product-requirements.yaml`
- `pdocs template investigation-topic` → `templates/investigation-topic.yaml`
- Aliases support underscores/hyphens: `investigation_topic` and `investigation-topic` both work

## Usage Pattern

```bash
# Output template to stdout
pdocs template user-story

# Pipe to file in docs/
pdocs template user-story > docs/user-stories/my-story.yaml

# View template before using
pdocs template feature-spec | less
```

## Maintenance Notes

- Templates are copied to `dist/templates/` during build
- Path resolution uses `__dirname` in compiled `dist/` directory
- Update templates here; they're automatically packaged in npm distribution
- Keep examples realistic but generic (no project-specific details)

## Cross-References

Templates may reference concepts from parent CLAUDE.md:
- Document type purposes (planning, investigation, implementation phases)
- Status field conventions (incomplete, in-progress, complete)
- Feature ID naming patterns (F-01, F-02, etc.)
- Story ID patterns (US-101, US-102, etc.)
