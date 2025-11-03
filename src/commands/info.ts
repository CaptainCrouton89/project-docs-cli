import { existsSync } from 'fs';
import { join } from 'path';
import { findYamlFiles, loadYaml, getString, getArray } from '../utils.js';

export function info(docsDir: string): void {
  console.log('━'.repeat(50));
  console.log('Project Documentation Info');
  console.log('━'.repeat(50));
  console.log('');

  if (!existsSync(docsDir)) {
    console.log('✗ Documentation directory not found: ' + docsDir);
    process.exit(1);
  }

  console.log(`Documentation directory: ${docsDir}`);
  console.log('');

  // PRD
  const prdFile = join(docsDir, 'product-requirements.yaml');
  if (existsSync(prdFile)) {
    const prdData = loadYaml(prdFile);
    if (prdData) {
      const projectName = getString(prdData, 'project_name');
      const features = getArray(prdData, 'features');

      console.log('Project:');
      console.log(`  Name: ${projectName || 'Not set'}`);
      console.log(`  Features (PRD): ${features.length}`);
      console.log('');
    }
  } else {
    console.log('⚠ No product-requirements.yaml found');
    console.log('');
  }

  // Feature Specs
  const featuresDir = join(docsDir, 'feature-specs');
  if (existsSync(featuresDir)) {
    const featureFiles = findYamlFiles(featuresDir);
    let completeCount = 0;
    let inProgressCount = 0;
    let incompleteCount = 0;

    featureFiles.forEach(file => {
      const data = loadYaml(file);
      if (data) {
        const status = getString(data, 'status');
        if (status === 'complete') completeCount++;
        else if (status === 'in-progress') inProgressCount++;
        else incompleteCount++;
      }
    });

    console.log('Feature Specifications:');
    console.log(`  Total: ${featureFiles.length}`);
    console.log(`  Complete: ${completeCount}`);
    console.log(`  In Progress: ${inProgressCount}`);
    console.log(`  Incomplete: ${incompleteCount}`);
    console.log('');
  }

  // User Stories
  const storiesDir = join(docsDir, 'user-stories');
  if (existsSync(storiesDir)) {
    const storyFiles = findYamlFiles(storiesDir);
    let completeCount = 0;
    let inProgressCount = 0;
    let incompleteCount = 0;

    storyFiles.forEach(file => {
      const data = loadYaml(file);
      if (data) {
        const status = getString(data, 'status');
        if (status === 'complete') completeCount++;
        else if (status === 'in-progress') inProgressCount++;
        else incompleteCount++;
      }
    });

    console.log('User Stories:');
    console.log(`  Total: ${storyFiles.length}`);
    console.log(`  Complete: ${completeCount}`);
    console.log(`  In Progress: ${inProgressCount}`);
    console.log(`  Incomplete: ${incompleteCount}`);
    console.log('');
  }

  // User Flows
  const flowsDir = join(docsDir, 'user-flows');
  if (existsSync(flowsDir)) {
    const flowFiles = findYamlFiles(flowsDir);
    console.log('User Flows:');
    console.log(`  Total: ${flowFiles.length}`);
    console.log('');
  }

  // API Contracts
  const apiDir = join(docsDir, 'api-contracts');
  if (existsSync(apiDir)) {
    const apiFiles = findYamlFiles(apiDir);
    console.log('API Contracts:');
    console.log(`  Endpoints: ${apiFiles.length}`);
    console.log('');
  }

  // System Design
  const systemFile = join(docsDir, 'system-design.yaml');
  if (existsSync(systemFile)) {
    const systemData = loadYaml(systemFile);
    if (systemData) {
      const components = getArray(systemData, 'core_components');
      console.log('System Design:');
      console.log(`  Components: ${components.length}`);
      console.log('');
    }
  }

  console.log('━'.repeat(50));
}
