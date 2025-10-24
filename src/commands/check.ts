import { existsSync } from 'fs';
import { join, basename } from 'path';
import { findYamlFiles, loadYaml, getString, getNestedString, getArray } from '../utils.js';

interface CheckResult {
  totalChecks: number;
  totalErrors: number;
  totalWarnings: number;
}

const result: CheckResult = {
  totalChecks: 0,
  totalErrors: 0,
  totalWarnings: 0,
};

function logCheck(message: string, verbose: boolean): void {
  result.totalChecks++;
  if (verbose) {
    console.log(`[CHECK] ${message}`);
  }
}

function logPass(message: string, verbose: boolean): void {
  if (verbose) {
    console.log(`[PASS] ${message}`);
  }
}

function logWarn(message: string): void {
  result.totalWarnings++;
  console.log(`[WARN] ${message}`);
}

function logError(message: string, hint?: string): void {
  result.totalErrors++;
  console.log(`[ERROR] ${message}`);
  if (hint) {
    console.log(`        💡 ${hint}`);
  }
}

function logInfo(message: string, verbose: boolean): void {
  if (verbose) {
    console.log(`[INFO] ${message}`);
  }
}

function checkFileExists(file: string, label: string, verbose: boolean, templateType?: string): boolean {
  logCheck(`Checking for ${label}`, verbose);

  if (existsSync(file)) {
    logPass(`${label} found`, verbose);
    return true;
  } else {
    const hint = templateType
      ? `Get template with: pdocs template ${templateType}`
      : undefined;
    logError(`${label} missing: ${file}`, hint);
    return false;
  }
}

function checkYamlField(file: string, field: string, label: string): boolean {
  if (!existsSync(file)) return false;

  const data = loadYaml(file);
  if (!data) return false;

  const value = getString(data, field);

  if (!value || value === '""') {
    logWarn(`${label}: '${field}' is empty in ${basename(file)}`);
    return false;
  }

  return true;
}

function checkPrd(docsDir: string, verbose: boolean): void {
  const prdFile = join(docsDir, 'product-requirements.yaml');

  console.log('\n━━━ Product Requirements Document ━━━');

  if (!checkFileExists(prdFile, 'Product Requirements Document', verbose, 'product-requirements')) {
    return;
  }

  checkYamlField(prdFile, 'project_name', 'PRD');
  checkYamlField(prdFile, 'summary', 'PRD');
  checkYamlField(prdFile, 'goal', 'PRD');

  const data = loadYaml(prdFile);
  if (data) {
    const features = getArray(data, 'features');
    logInfo(`Features defined in PRD: ${features.length}`, verbose);

    if (features.length === 0) {
      logWarn('No features defined in PRD');
    }
  }
}

function checkUserFlows(docsDir: string, verbose: boolean): void {
  const flowsDir = join(docsDir, 'user-flows');

  console.log('\n━━━ User Flows ━━━');

  if (!existsSync(flowsDir)) {
    logError(`User flows directory missing: ${flowsDir}`, 'Get template with: pdocs template user-flow');
    return;
  }

  const flowFiles = findYamlFiles(flowsDir);
  logInfo(`User flow files found: ${flowFiles.length}`, verbose);

  if (flowFiles.length === 0) {
    logWarn('No user flow files found');
    return;
  }

  flowFiles.forEach(flowFile => {
    const flowName = basename(flowFile, '.yaml');
    logCheck(`Checking flow: ${flowName}`, verbose);

    const data = loadYaml(flowFile);
    if (data) {
      const primaryFlows = getArray(data, 'primary_flows');
      if (primaryFlows.length === 0) {
        logWarn(`No flows defined in ${flowName}`);
      }
    }
  });
}

function checkUserStories(docsDir: string, verbose: boolean): void {
  const storiesDir = join(docsDir, 'user-stories');

  console.log('\n━━━ User Stories ━━━');

  if (!existsSync(storiesDir)) {
    logError(`User stories directory missing: ${storiesDir}`, 'Get template with: pdocs template user-story');
    return;
  }

  const storyFiles = findYamlFiles(storiesDir);
  logInfo(`User story files found: ${storyFiles.length}`, verbose);

  if (storyFiles.length === 0) {
    logWarn('No user story files found');
    return;
  }

  let completeCount = 0;
  let incompleteCount = 0;

  storyFiles.forEach(storyFile => {
    const data = loadYaml(storyFile);
    if (!data) return;

    const storyId = getString(data, 'story_id');
    const status = getString(data, 'status');

    if (status === 'complete') {
      completeCount++;
    } else {
      incompleteCount++;
    }

    const asA = getNestedString(data, 'user_story', 'as_a');
    if (!asA || asA === '""' || asA.includes('[type')) {
      logWarn(`Story ${storyId} has incomplete user story definition`);
    }
  });

  logInfo(`Complete stories: ${completeCount}`, verbose);
  logInfo(`Incomplete stories: ${incompleteCount}`, verbose);
}

function checkFeatureSpecs(docsDir: string, verbose: boolean): void {
  const featuresDir = join(docsDir, 'feature-specs');

  console.log('\n━━━ Feature Specifications ━━━');

  if (!existsSync(featuresDir)) {
    logError(`Feature specs directory missing: ${featuresDir}`, 'Get template with: pdocs template feature-spec');
    return;
  }

  const featureFiles = findYamlFiles(featuresDir);
  logInfo(`Feature spec files found: ${featureFiles.length}`, verbose);

  if (featureFiles.length === 0) {
    logWarn('No feature spec files found');
    return;
  }

  let completeCount = 0;
  let incompleteCount = 0;

  featureFiles.forEach(featureFile => {
    const data = loadYaml(featureFile);
    if (!data) return;

    const featureId = getString(data, 'feature_id');
    const status = getString(data, 'status');

    if (status === 'complete') {
      completeCount++;
    } else {
      incompleteCount++;
    }

    checkYamlField(featureFile, 'summary', `Feature ${featureId}`);
  });

  logInfo(`Complete features: ${completeCount}`, verbose);
  logInfo(`Incomplete features: ${incompleteCount}`, verbose);
}

function checkSystemDesign(docsDir: string, verbose: boolean): void {
  const systemFile = join(docsDir, 'system-design.yaml');

  console.log('\n━━━ System Design ━━━');

  if (!checkFileExists(systemFile, 'System Design', verbose, 'system-design')) {
    return;
  }

  checkYamlField(systemFile, 'goal', 'System Design');

  const data = loadYaml(systemFile);
  if (data) {
    const techStack = getString(data, 'tech_stack');
    if (!techStack) {
      logWarn('No tech stack defined in system design');
    }
  }
}

function checkApiContracts(docsDir: string, verbose: boolean): void {
  const apiFile = join(docsDir, 'api-contracts.yaml');

  console.log('\n━━━ API Contracts ━━━');

  if (!checkFileExists(apiFile, 'API Contracts', verbose, 'api-contracts')) {
    return;
  }

  const data = loadYaml(apiFile);
  if (data) {
    const paths = data.paths as Record<string, unknown> | undefined;
    const endpointCount = paths ? Object.keys(paths).length : 0;
    logInfo(`API endpoints defined: ${endpointCount}`, verbose);

    if (endpointCount === 0) {
      logWarn('No API endpoints defined');
    }
  }
}

function checkDataPlan(docsDir: string, verbose: boolean): void {
  const dataFile = join(docsDir, 'data-plan.yaml');

  console.log('\n━━━ Data Plan ━━━');

  if (!checkFileExists(dataFile, 'Data Plan', verbose, 'data-plan')) {
    return;
  }

  const data = loadYaml(dataFile);
  if (data) {
    const dataSources = getArray(data, 'data_sources');
    if (dataSources.length > 0) {
      logInfo(`Data sources defined: ${dataSources.length}`, verbose);
    }
  }
}

function checkDesignSpec(docsDir: string, verbose: boolean): void {
  const designFile = join(docsDir, 'design-spec.yaml');

  console.log('\n━━━ Design Specification ━━━');

  if (!checkFileExists(designFile, 'Design Specification', verbose, 'design-spec')) {
    return;
  }

  checkYamlField(designFile, 'design_goals', 'Design Spec');
}

function checkCrossReferences(docsDir: string, checkLinks: boolean, verbose: boolean): void {
  if (!checkLinks) return;

  console.log('\n━━━ Cross-Reference Validation ━━━');

  const prdFile = join(docsDir, 'product-requirements.yaml');
  const prdData = loadYaml(prdFile);
  if (!prdData) {
    logWarn('No PRD file to cross-reference');
    return;
  }

  const features = getArray(prdData, 'features');
  const featureIds: string[] = features
    .map(f => {
      if (typeof f === 'object' && f !== null) {
        const obj = f as Record<string, unknown>;
        return getString(obj, 'id');
      }
      return '';
    })
    .filter(id => id !== '');

  if (featureIds.length === 0) {
    logWarn('No features in PRD to cross-reference');
    return;
  }

  const featuresDir = join(docsDir, 'feature-specs');
  if (existsSync(featuresDir)) {
    const featureFiles = findYamlFiles(featuresDir);

    featureIds.forEach(featureId => {
      logCheck(`Checking if ${featureId} has specification`, verbose);

      const hasSpec = featureFiles.some(file => {
        const data = loadYaml(file);
        if (!data) return false;
        const fileFeatureId = getString(data, 'feature_id');
        return fileFeatureId === featureId;
      });

      if (!hasSpec) {
        logWarn(`Feature ${featureId} (in PRD) has no specification file`);
      } else {
        logPass(`Feature ${featureId} has specification`, verbose);
      }
    });
  }

  const storiesDir = join(docsDir, 'user-stories');
  if (existsSync(storiesDir)) {
    const storyFiles = findYamlFiles(storiesDir);

    storyFiles.forEach(storyFile => {
      const data = loadYaml(storyFile);
      if (!data) return;

      const storyId = getString(data, 'story_id');
      const featureRef = getString(data, 'feature_id');

      if (featureRef && featureRef !== 'F-##' && !featureIds.includes(featureRef)) {
        logWarn(`Story ${storyId} references unknown feature: ${featureRef}`);
      }
    });
  }
}

function generateSummary(): number {
  console.log('\n' + '━'.repeat(50));
  console.log('Summary');
  console.log('━'.repeat(50));

  console.log(`\nChecks performed: ${result.totalChecks}`);

  if (result.totalErrors === 0) {
    console.log(`Errors: 0 ✓`);
  } else {
    console.log(`Errors: ${result.totalErrors}`);
  }

  if (result.totalWarnings === 0) {
    console.log(`Warnings: 0 ✓`);
  } else {
    console.log(`Warnings: ${result.totalWarnings}`);
  }

  console.log('');

  if (result.totalErrors === 0 && result.totalWarnings === 0) {
    console.log('✓ All checks passed!');
    return 0;
  } else if (result.totalErrors === 0) {
    console.log('⚠ All checks passed with warnings');
    return 0;
  } else {
    console.log('✗ Some checks failed');
    console.log('');
    console.log('💡 Complete project documentation is essential for effective development.');
    console.log('   Get started with templates: pdocs template <type>');
    console.log('   Available types: product-requirements, system-design, api-contracts,');
    console.log('                    data-plan, design-spec, user-flow, user-story, feature-spec');
    return 1;
  }
}

export function check(
  docsDir: string,
  options: { verbose: boolean; checkLinks: boolean; format: string }
): void {
  console.log('━'.repeat(50));
  console.log('Project Documentation Check');
  console.log('━'.repeat(50));
  console.log(`Documentation directory: ${docsDir}`);
  console.log('');

  if (!existsSync(docsDir)) {
    logError(`Documentation directory not found: ${docsDir}`);
    process.exit(1);
  }

  checkPrd(docsDir, options.verbose);
  checkUserFlows(docsDir, options.verbose);
  checkUserStories(docsDir, options.verbose);
  checkFeatureSpecs(docsDir, options.verbose);
  checkSystemDesign(docsDir, options.verbose);
  checkApiContracts(docsDir, options.verbose);
  checkDataPlan(docsDir, options.verbose);
  checkDesignSpec(docsDir, options.verbose);
  checkCrossReferences(docsDir, options.checkLinks, options.verbose);

  const exitCode = generateSummary();
  process.exit(exitCode);
}
