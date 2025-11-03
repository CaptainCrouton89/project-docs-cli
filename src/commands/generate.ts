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

    // Find API contracts for this feature
    const apiDir = join(docsDir, 'api-contracts');
    if (existsSync(apiDir)) {
      const apiFiles = findYamlFiles(apiDir);
      let foundApis = false;

      apiFiles.forEach(apiFile => {
        const apiData = loadYaml(apiFile);
        if (!apiData) return;

        const apiFeatureId = getString(apiData, 'feature_id');
        if (apiFeatureId !== featureId) return;

        foundApis = true;
        const method = getString(apiData, 'method').toUpperCase();
        const pathMatch = apiFile.match(/\/paths\/(.+)\/api-contract\.yaml$/);
        const path = pathMatch ? '/' + pathMatch[1].replace(/\[([^\]]+)\]/g, '{$1}') : '';
        const summary = getString(apiData, 'summary');

        // Create anchor link for cross-reference
        const anchor = `${method.toLowerCase()}-${path.replace(/[^a-z0-9]+/g, '')}`;
        markdown += `- **${method}** [\`${path}\`](./api-reference.md#${anchor})`;
        if (summary) {
          markdown += ` - ${summary}`;
        }
        markdown += '\n';
      });

      if (!foundApis) {
        markdown += '_No API endpoints defined for this feature._\n';
      }
    }

    markdown += '\n---\n\n';
  }

  writeFileSync(outputFile, markdown);
  console.log('✓ Generated feature docs: ' + outputFile);
}

function generateApiDocs(docsDir: string, outputDir: string): void {
  const apiDir = join(docsDir, 'api-contracts');
  const outputFile = join(outputDir, 'api-reference.md');

  if (!existsSync(apiDir)) {
    console.log('⚠ API contracts directory not found, skipping');
    return;
  }

  console.log('→ Generating API documentation...');

  let markdown = `# API Reference

`;

  const apiFiles = findYamlFiles(apiDir);

  if (apiFiles.length === 0) {
    console.log('⚠ No API contract files found, skipping');
    return;
  }

  // Parse APIs and group by feature
  const apisByFeature = new Map<string, Array<{ path: string; method: string; file: string; data: Record<string, unknown> }>>();
  const orphanedApis: Array<{ path: string; method: string; file: string; data: Record<string, unknown> }> = [];

  for (const file of apiFiles) {
    const data = loadYaml(file);
    if (!data) continue;

    // Extract path from file structure
    const pathMatch = file.match(/\/paths\/(.+)\/api-contract\.yaml$/);
    let path = pathMatch ? pathMatch[1] : basename(file, '.yaml');
    path = '/' + path.replace(/\[([^\]]+)\]/g, '{$1}');

    const method = getString(data, 'method').toUpperCase();
    const featureId = getString(data, 'feature_id');

    const apiEntry = { path, method, file, data };

    if (featureId && featureId !== 'F-##') {
      if (!apisByFeature.has(featureId)) {
        apisByFeature.set(featureId, []);
      }
      apisByFeature.get(featureId)!.push(apiEntry);
    } else {
      orphanedApis.push(apiEntry);
    }
  }

  // Sort features
  const sortedFeatures = Array.from(apisByFeature.keys()).sort();

  // Generate markdown grouped by feature
  for (const featureId of sortedFeatures) {
    const apis = apisByFeature.get(featureId)!;

    // Sort APIs within feature by path, then method
    apis.sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });

    markdown += `## ${featureId}\n\n`;
    markdown += `**Feature:** [${featureId}](./features.md#${featureId.toLowerCase()})\n\n`;

    for (const api of apis) {
      const summary = getString(api.data, 'summary');
      const description = getString(api.data, 'description');

      // Create anchor for cross-linking
      const anchor = `${api.method.toLowerCase()}-${api.path.replace(/[^a-z0-9]+/g, '')}`;
      markdown += `\n### ${api.method} \`${api.path}\` {#${anchor}}\n\n`;

      if (summary) {
        markdown += `${summary}\n\n`;
      }

      if (description && description.trim()) {
        markdown += `${description}\n\n`;
      }

    // Parameters
    const parameters = getArray(api.data, 'parameters');
    if (parameters.length > 0) {
      markdown += '**Parameters:**\n\n';
      parameters.forEach(param => {
        if (typeof param === 'object' && param !== null) {
          const paramObj = param as Record<string, unknown>;
          const name = getString(paramObj, 'name');
          const paramIn = getString(paramObj, 'in');
          const required = paramObj.required === true;
          const paramDesc = getString(paramObj, 'description');
          markdown += `- \`${name}\` (${paramIn})${required ? ' **required**' : ''}: ${paramDesc}\n`;
        }
      });
      markdown += '\n';
    }

    // Request body
    const requestBody = api.data.request_body as Record<string, unknown> | undefined;
    if (requestBody) {
      const required = requestBody.required === true;
      markdown += `**Request Body:**${required ? ' **required**' : ''}\n\n`;

      const content = requestBody.content as Record<string, unknown> | undefined;
      if (content) {
        for (const [contentType, details] of Object.entries(content)) {
          markdown += `Content-Type: \`${contentType}\`\n\n`;
        }
      }
    }

    // Responses
    const responses = api.data.responses as Record<string, unknown> | undefined;
    if (responses) {
      markdown += '**Responses:**\n\n';
      for (const [code, resp] of Object.entries(responses)) {
        const respObj = resp as Record<string, unknown>;
        const respDesc = getString(respObj, 'description');
        markdown += `- \`${code}\`: ${respDesc}\n`;
      }
      markdown += '\n';
    }

      markdown += '---\n';
    }
  }

  // Add orphaned APIs section if any exist
  if (orphanedApis.length > 0) {
    orphanedApis.sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });

    markdown += `\n## Uncategorized APIs\n\n`;
    markdown += `_These endpoints have no feature_id assigned._\n\n`;

    for (const api of orphanedApis) {
      const summary = getString(api.data, 'summary');
      const description = getString(api.data, 'description');

      const anchor = `${api.method.toLowerCase()}-${api.path.replace(/[^a-z0-9]+/g, '')}`;
      markdown += `\n### ${api.method} \`${api.path}\` {#${anchor}}\n\n`;

      if (summary) {
        markdown += `${summary}\n\n`;
      }

      if (description && description.trim()) {
        markdown += `${description}\n\n`;
      }

      // Parameters
      const parameters = getArray(api.data, 'parameters');
      if (parameters.length > 0) {
        markdown += '**Parameters:**\n\n';
        parameters.forEach(param => {
          if (typeof param === 'object' && param !== null) {
            const paramObj = param as Record<string, unknown>;
            const name = getString(paramObj, 'name');
            const paramIn = getString(paramObj, 'in');
            const required = paramObj.required === true;
            const paramDesc = getString(paramObj, 'description');
            markdown += `- \`${name}\` (${paramIn})${required ? ' **required**' : ''}: ${paramDesc}\n`;
          }
        });
        markdown += '\n';
      }

      // Request body
      const requestBody = api.data.request_body as Record<string, unknown> | undefined;
      if (requestBody) {
        const required = requestBody.required === true;
        markdown += `**Request Body:**${required ? ' **required**' : ''}\n\n`;

        const content = requestBody.content as Record<string, unknown> | undefined;
        if (content) {
          for (const [contentType, details] of Object.entries(content)) {
            markdown += `Content-Type: \`${contentType}\`\n\n`;
          }
        }
      }

      // Responses
      const responses = api.data.responses as Record<string, unknown> | undefined;
      if (responses) {
        markdown += '**Responses:**\n\n';
        for (const [code, resp] of Object.entries(responses)) {
          const respObj = resp as Record<string, unknown>;
          const respDesc = getString(respObj, 'description');
          markdown += `- \`${code}\`: ${respDesc}\n`;
        }
        markdown += '\n';
      }

      markdown += '---\n';
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
- API Contracts: \`${docsDir}/api-contracts/**/*.yaml\`
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
