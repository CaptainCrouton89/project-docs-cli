# Project Documentation Guide

YAML-based specs in `docs/`. CLI tool `pdocs` validates and queries documentation.

## Structure

```
docs/
├── product-requirements.yaml  ├── system-design.yaml  ├── design-spec.yaml
├── api-contracts.yaml         ├── data-plan.yaml
├── user-flows/*.yaml          ├── user-stories/*.yaml  ├── feature-specs/*.yaml
└── CLAUDE.md (this file, auto-installed by pdocs)
```

## CLI Commands

All commands work from anywhere in your project (they auto-detect the `docs/` directory):

```bash
# List documentation
pdocs list stories                         # All stories
pdocs list stories --feature F-01          # Stories for specific feature
pdocs list stories --status complete       # Filter by status (incomplete/in-progress/complete)
pdocs list stories --format detailed       # Show full details

pdocs list flows                           # All user flows
pdocs list flows --persona "Admin"         # Flows for specific persona
pdocs list flows --format json             # JSON output

pdocs list features                        # Summary view
pdocs list features --format stats         # Statistics overview
pdocs list features --format tree          # Hierarchical tree view
pdocs list features --status complete      # Filter by status

pdocs list apis                            # All API endpoints
pdocs list apis --format curl              # Generate curl commands
pdocs list apis --method POST              # Filter by HTTP method
pdocs list apis --path /api/users          # Filter by path pattern

# Validate project
pdocs check                                # Basic validation
pdocs check -v                             # Verbose output
pdocs check --format detailed              # Detailed report

# Generate documentation
pdocs generate                             # Export all to markdown
pdocs generate --output ./export           # Custom output directory
pdocs generate --format html               # HTML output

# Quick overview
pdocs info                                 # Display project summary

# Get templates
pdocs template product-requirements        # Get PRD template
pdocs template user-story                  # Get user story template
pdocs template feature-spec                # Get feature spec template
# Other templates: system-design, api-contracts, data-plan, design-spec, user-flow
```

All commands support `--help` for detailed usage information.

## ID Conventions

- Features: `F-01`, `F-02`
- Stories: `US-101`, `US-102`
- Files: kebab-case

**Linking:** Stories/specs must set `feature_id: F-##` matching PRD. APIs note feature IDs in descriptions.

## Workflow Order

PRD → User Flows → User Stories → Feature Specs → System Design → API Contracts → Data Plan → Design Spec → Traceability Pass

Check existing files first (`./run.sh list-*`) before creating. Re-read upstream docs at each step.

## YAML Requirements

- Required top-level: `title`, `template` path
- Stories: `story_id`, `feature_id`, `status`
- Features: `feature_id`, `status`
- Status values: `incomplete` | `in-progress` | `complete`
- 2-space indent, quote special chars, no blank fields (use `""`)

## Traceability

- User Flows → PRD features
- User Stories → `feature_id`, flows
- Feature Specs → story IDs, PRD
- API Contracts → feature IDs
- Data Plan → PRD metrics

Run `cd docs && ./run.sh check-project` regularly. Fix errors before next step.

## Pitfalls

1. Orphaned IDs (every PRD F-## needs spec file)
2. Empty fields (investigate, don't leave blank)
3. Inconsistent naming across files
4. Missing metric tracking events
5. Vague ACs (use Given/When/Then)
6. API endpoint mismatches