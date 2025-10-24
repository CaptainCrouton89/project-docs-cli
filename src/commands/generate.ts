import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { findYamlFiles, loadYaml, getString, getNestedString, getArray } from '../utils.js';

function setupOutputDir(outputDir: string): void {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log('✓ Created output directory: ' + outputDir);
  }
}

function generateOverview(docsDir: string, outputDir: string): void {
  const prdFile = join(docsDir, 'product-requirements.yaml');
  const outputFile = join(outputDir, 'overview.md');

  if (!existsSync(prdFile)) {
    console.log('⚠ PRD file not found, skipping overview');
    return;
  }

  console.log('→ Generating project overview...');

  const data = loadYaml(prdFile);
  if (!data) return;

  const projectName = getString(data, 'project_name') || 'Project';
  const overview = data.overview as Record<string, unknown> | undefined;
  const summary = overview ? getString(overview, 'summary') : 'No summary provided';
  const goal = overview ? getString(overview, 'goal') : 'No goal defined';

  let markdown = `# ${projectName} Overview

## Summary

${summary}

## Goal

${goal}

## Features

`;

  const features = getArray(data, 'features');
  features.forEach(f => {
    if (typeof f === 'object' && f !== null) {
      const featureObj = f as Record<string, unknown>;
      const id = getString(featureObj, 'id');
      const desc = getString(featureObj, 'description');
      if (id && desc) {
        markdown += `- **${id}:** ${desc}\n`;
      }
    }
  });

  writeFileSync(outputFile, markdown);
  console.log('✓ Generated overview: ' + outputFile);
}

function generateFeatureDocs(docsDir: string, outputDir: string): void {
  const featuresDir = join(docsDir, 'feature-specs');
  const outputFile = join(outputDir, 'features.md');

  if (!existsSync(featuresDir)) {
    console.log('⚠ Feature specs directory not found, skipping');
    return;
  }

  console.log('→ Generating feature documentation...');

  let markdown = `# Feature Specifications

This document provides detailed specifications for all features.

---

`;

  const featureFiles = findYamlFiles(featuresDir);

  for (const featureFile of featureFiles) {
    const data = loadYaml(featureFile);
    if (!data) continue;

    const featureId = getString(data, 'feature_id');
    let title = getString(data, 'title') || basename(featureFile, '.yaml');
    title = title.replace(/^Technical Specification - /, '');
    const summary = getString(data, 'summary');
    const status = getString(data, 'status') || 'incomplete';

    markdown += `## ${featureId} - ${title}

**Status:** ${status}

### Summary

${summary}

### Core Logic

`;

    const coreLogic = getNestedString(data, 'functional_overview', 'core_logic');
    markdown += `${coreLogic}

### API Endpoints

`;

    const detailedDesign = data.detailed_design as Record<string, unknown> | undefined;
    const apis = detailedDesign ? getArray(detailedDesign, 'apis') : [];

    apis.forEach(api => {
      if (typeof api === 'object' && api !== null) {
        const apiObj = api as Record<string, unknown>;
        const method = getString(apiObj, 'method');
        const endpoint = getString(apiObj, 'endpoint');
        if (method && endpoint) {
          markdown += `- **${method.toUpperCase()}** \`${endpoint}\`\n`;
        }
      }
    });

    markdown += '\n---\n\n';
  }

  writeFileSync(outputFile, markdown);
  console.log('✓ Generated feature docs: ' + outputFile);
}

function generateApiDocs(docsDir: string, outputDir: string): void {
  const apiFile = join(docsDir, 'api-contracts.yaml');
  const outputFile = join(outputDir, 'api-reference.md');

  if (!existsSync(apiFile)) {
    console.log('⚠ API contracts file not found, skipping');
    return;
  }

  console.log('→ Generating API documentation...');

  const data = loadYaml(apiFile);
  if (!data) return;

  const info = data.info as Record<string, unknown> | undefined;
  const apiTitle = info ? getString(info, 'title') : 'API';
  const apiVersion = info ? getString(info, 'version') : '1.0.0';

  let markdown = `# API Reference

**${apiTitle}** - Version ${apiVersion}

## Endpoints

`;

  const paths = data.paths as Record<string, Record<string, unknown>> | undefined;
  if (paths) {
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, details] of Object.entries(methods)) {
        const detailsObj = details as Record<string, unknown>;
        const summary = getString(detailsObj, 'summary');
        const description = getString(detailsObj, 'description');

        markdown += `\n### ${method.toUpperCase()} \`${path}\`\n\n`;

        if (summary) {
          markdown += `${summary}\n\n`;
        }

        if (description) {
          markdown += `${description}\n\n`;
        }

        const responses = detailsObj.responses as Record<string, unknown> | undefined;
        if (responses) {
          markdown += '**Responses:**\n\n';
          for (const [code, resp] of Object.entries(responses)) {
            const respObj = resp as Record<string, unknown>;
            const respDesc = getString(respObj, 'description');
            markdown += `- \`${code}\`: ${respDesc}\n`;
          }
        }

        markdown += '\n---\n';
      }
    }
  }

  writeFileSync(outputFile, markdown);
  console.log('✓ Generated API docs: ' + outputFile);
}

function generateArchitectureDocs(docsDir: string, outputDir: string): void {
  const systemFile = join(docsDir, 'system-design.yaml');
  const outputFile = join(outputDir, 'architecture.md');

  if (!existsSync(systemFile)) {
    console.log('⚠ System design file not found, skipping');
    return;
  }

  console.log('→ Generating architecture documentation...');

  const data = loadYaml(systemFile);
  if (!data) return;

  let markdown = `# System Architecture

## Overview

`;

  const goal = getNestedString(data, 'overview', 'goal');
  markdown += `${goal}

## Components

`;

  const coreComponents = getArray(data, 'core_components');
  coreComponents.forEach(comp => {
    if (typeof comp === 'object' && comp !== null) {
      const compObj = comp as Record<string, unknown>;
      const component = getString(compObj, 'component');
      const description = getString(compObj, 'description');
      if (component && description) {
        markdown += `### ${component}\n\n${description}\n\n`;
      }
    }
  });

  markdown += `## Tech Stack

`;

  const techStack = data.tech_stack as Record<string, unknown> | undefined;
  if (techStack) {
    for (const [key, value] of Object.entries(techStack)) {
      markdown += `- **${key}:** ${value}\n`;
    }
  }

  writeFileSync(outputFile, markdown);
  console.log('✓ Generated architecture docs: ' + outputFile);
}

function generateIndex(docsDir: string, outputDir: string): void {
  const outputFile = join(outputDir, 'README.md');

  console.log('→ Generating documentation index...');

  let markdown = `# Project Documentation

This documentation is automatically generated from YAML specification files.

## Table of Contents

`;

  if (existsSync(join(outputDir, 'overview.md'))) {
    markdown += '- [Project Overview](./overview.md)\n';
  }
  if (existsSync(join(outputDir, 'features.md'))) {
    markdown += '- [Feature Specifications](./features.md)\n';
  }
  if (existsSync(join(outputDir, 'api-reference.md'))) {
    markdown += '- [API Reference](./api-reference.md)\n';
  }
  if (existsSync(join(outputDir, 'architecture.md'))) {
    markdown += '- [System Architecture](./architecture.md)\n';
  }

  markdown += `
## Source Files

This documentation is generated from:
- Product Requirements: \`${docsDir}/product-requirements.yaml\`
- Feature Specs: \`${docsDir}/feature-specs/*.yaml\`
- API Contracts: \`${docsDir}/api-contracts.yaml\`
- System Design: \`${docsDir}/system-design.yaml\`

To regenerate this documentation, run:
\`\`\`bash
pdocs generate
\`\`\`

---

*Generated on ${new Date().toLocaleString()}*
`;

  writeFileSync(outputFile, markdown);
  console.log('✓ Generated index: ' + outputFile);
}

export function generate(
  docsDir: string,
  options: { outputDir: string; format: string; includeToc: boolean }
): void {
  console.log('━'.repeat(50));
  console.log('Documentation Generator');
  console.log('━'.repeat(50));
  console.log('');

  if (!existsSync(docsDir)) {
    console.log('✗ Documentation directory not found: ' + docsDir);
    process.exit(1);
  }

  setupOutputDir(options.outputDir);

  generateOverview(docsDir, options.outputDir);
  generateFeatureDocs(docsDir, options.outputDir);
  generateApiDocs(docsDir, options.outputDir);
  generateArchitectureDocs(docsDir, options.outputDir);
  generateIndex(docsDir, options.outputDir);

  console.log('');
  console.log('━'.repeat(50));
  console.log('✓ Documentation generation complete!');
  console.log('→ Output directory: ' + options.outputDir);
  console.log('');
}
