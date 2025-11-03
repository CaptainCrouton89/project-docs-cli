import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type TemplateType =
  | 'product-requirements'
  | 'system-design'
  | 'api-contract'
  | 'design-spec'
  | 'user-flow'
  | 'user-story'
  | 'feature-spec'
  | 'requirements'
  | 'investigation-topic'
  | 'plan'
  | 'epic-plan'
  | 'claude';

const TEMPLATE_MAP: Record<TemplateType, string> = {
  'product-requirements': 'product-requirements.yaml',
  'system-design': 'system-design.yaml',
  'api-contract': 'api-contract.yaml',
  'design-spec': 'design-spec.yaml',
  'user-flow': 'user-flow.yaml',
  'user-story': 'user-story.yaml',
  'feature-spec': 'feature-spec.yaml',
  'requirements': 'requirements.yaml',
  'investigation-topic': 'investigation-topic.yaml',
  'plan': 'plan.yaml',
  'epic-plan': 'epic-plan.yaml',
  'claude': 'CLAUDE-template.md',
};

export function template(type: string): void {
  const validTypes = Object.keys(TEMPLATE_MAP);

  if (!validTypes.includes(type)) {
    console.log(`Error: Invalid template type '${type}'`);
    console.log('');
    console.log('Valid template types:');
    console.log('  Root documents:');
    console.log('    product-requirements    Product Requirements Document');
    console.log('    system-design           System Design Document');
    console.log('    api-contract            API Contract Document');
    console.log('    design-spec             Design Specification');
    console.log('');
    console.log('  Multi-file documents:');
    console.log('    user-flow               User Flow Template');
    console.log('    user-story              User Story Template');
    console.log('    feature-spec            Feature Specification Template');
    console.log('    requirements            Feature Requirements Template');
    console.log('');
    console.log('  Planning & Investigation:');
    console.log('    investigation-topic     Investigation/Context Template');
    console.log('    plan                    Implementation Plan Template');
    console.log('    epic-plan               Epic Plan Template');
    console.log('');
    console.log('  Meta:');
    console.log('    claude                  CLAUDE.md Quick Reference');
    process.exit(1);
  }

  // Get template file path relative to the compiled dist directory
  const templatesDir = join(__dirname, '..', '..', 'templates');
  const templatePath = join(templatesDir, TEMPLATE_MAP[type as TemplateType]);

  if (!existsSync(templatePath)) {
    console.log(`Error: Template file not found: ${templatePath}`);
    console.log('This may indicate an installation issue.');
    process.exit(1);
  }

  try {
    const content = readFileSync(templatePath, 'utf-8');
    console.log(content);
  } catch (error) {
    console.log(`Error: Failed to read template file: ${error}`);
    process.exit(1);
  }
}
