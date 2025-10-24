import { join, basename } from 'path';
import { findYamlFiles, loadYaml, getString, getNestedString, getArray, getNumber } from '../utils.js';

// Features
interface FeatureData {
  file: string;
  feature_id: string;
  title: string;
  status: string;
  summary: string;
  progress: number;
}

function parseFeature(file: string): FeatureData | null {
  const data = loadYaml(file);
  if (!data) return null;

  const feature_id = getString(data, 'feature_id');
  let title = getString(data, 'title') || basename(file, '.yaml');
  title = title.replace(/^Technical Specification - /, '');

  const status = getString(data, 'status') || 'incomplete';
  const summary = getString(data, 'summary');
  const implStatus = data.implementation_status as Record<string, unknown> | undefined;
  const progress = implStatus ? getNumber(implStatus, 'progress') : 0;

  return {
    file,
    feature_id,
    title,
    status,
    summary,
    progress,
  };
}

function listFeatures(
  docsDir: string,
  options: { showAll: boolean; format: string; filterStatus: string; sortBy: string }
): void {
  const featuresDir = join(docsDir, 'feature-specs');
  const files = findYamlFiles(featuresDir);

  if (files.length === 0) {
    console.log(`No feature files found in ${featuresDir}`);
    return;
  }

  let features = files.map(parseFeature).filter((f): f is FeatureData => f !== null);

  if (!options.showAll) {
    features = features.filter(f => f.status !== 'complete');
  }

  if (options.filterStatus) {
    features = features.filter(f => f.status === options.filterStatus);
  }

  if (options.sortBy === 'title') {
    features.sort((a, b) => a.title.localeCompare(b.title));
  } else if (options.sortBy === 'status') {
    features.sort((a, b) => a.status.localeCompare(b.status));
  }

  if (options.format === 'stats') {
    const total = features.length;
    const complete = features.filter(f => f.status === 'complete').length;
    const inProgress = features.filter(f => f.status === 'in-progress').length;
    const incomplete = features.filter(f => f.status === 'incomplete').length;

    console.log('━'.repeat(50));
    console.log('Feature Specifications Statistics');
    console.log('━'.repeat(50));
    console.log('');
    console.log(`Total Features: ${total}`);
    console.log(`  Complete: ${complete}`);
    console.log(`  In Progress: ${inProgress}`);
    console.log(`  Incomplete: ${incomplete}`);
    console.log('');

    if (total > 0) {
      const completePct = Math.floor((complete * 100) / total);
      const progressPct = Math.floor(((complete + inProgress) * 100) / total);
      console.log('Progress:');
      console.log(`  Complete: ${completePct}%`);
      console.log(`  Started: ${progressPct}%`);
    }
    console.log('');
    return;
  }

  if (options.format === 'json') {
    features.forEach(f => {
      console.log(
        JSON.stringify({
          feature_id: f.feature_id,
          title: f.title,
          status: f.status,
          progress: f.progress,
          summary: f.summary,
          file: f.file,
        })
      );
    });
    return;
  }

  console.log(`Feature Specifications in ${featuresDir}`);
  console.log('━'.repeat(80));
  console.log(`${'ID'.padEnd(10)} ${'Title'.padEnd(40)} ${'Progress'.padEnd(10)} Status`);
  console.log('━'.repeat(80));

  features.forEach(f => {
    const statusIcon = f.status === 'complete' ? '✓' : f.status === 'in-progress' ? '●' : '○';
    console.log(
      `${f.feature_id.padEnd(10)} ${f.title.substring(0, 40).padEnd(40)} ${String(f.progress).padStart(3)}%      ${statusIcon} ${f.status}`
    );
  });

  console.log('━'.repeat(80));
  console.log(`Found ${features.length} matching features`);
}

// APIs
interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
}

function parseApiEndpoints(data: Record<string, unknown>): ApiEndpoint[] {
  const paths = data.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths) return [];

  const endpoints: ApiEndpoint[] = [];

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, details] of Object.entries(methods)) {
      const detailsObj = details as Record<string, unknown>;
      const summary = getString(detailsObj, 'summary') || 'No description';
      endpoints.push({ method: method.toUpperCase(), path, summary });
    }
  }

  return endpoints;
}

function listApis(
  docsDir: string,
  options: { format: string; filterMethod: string; filterPath: string; baseUrl: string }
): void {
  const apiFile = join(docsDir, 'api-contracts.yaml');
  const data = loadYaml(apiFile);

  if (!data) {
    console.log(`Error: File '${apiFile}' not found`);
    process.exit(1);
  }

  const info = data.info as Record<string, unknown> | undefined;
  const title = info ? getString(info, 'title') : 'API';
  const version = info ? getString(info, 'version') : '1.0.0';

  let endpoints = parseApiEndpoints(data);

  if (options.filterMethod) {
    endpoints = endpoints.filter(ep => ep.method === options.filterMethod.toUpperCase());
  }

  if (options.filterPath) {
    endpoints = endpoints.filter(ep => ep.path.includes(options.filterPath));
  }

  if (options.format === 'json') {
    endpoints.forEach(ep => {
      console.log(JSON.stringify(ep));
    });
    return;
  }

  if (options.format === 'curl') {
    endpoints.forEach(ep => {
      const method = ep.method;
      if (method === 'GET' || method === 'DELETE') {
        console.log(`curl -X ${method} "${options.baseUrl}${ep.path}"`);
      } else {
        console.log(`curl -X ${method} "${options.baseUrl}${ep.path}" \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{"key": "value"}'`);
      }
      console.log('');
    });
    return;
  }

  if (options.format === 'markdown') {
    console.log(`# ${title} v${version}\n`);
    endpoints.forEach(ep => {
      console.log(`### ${ep.method} \`${ep.path}\``);
      console.log(ep.summary);
      console.log('');
    });
    return;
  }

  console.log('━'.repeat(80));
  console.log(`${title} v${version}`);
  console.log('━'.repeat(80));
  console.log('');

  endpoints.forEach(ep => {
    const methodPadded = ep.method.padEnd(6);
    console.log(`${methodPadded} ${ep.path.padEnd(40)} ${ep.summary.substring(0, 60)}`);
  });

  console.log('');
  console.log('━'.repeat(80));
  console.log(`Found ${endpoints.length} endpoint(s)`);
}

// Stories
interface StoryData {
  file: string;
  story_id: string;
  title: string;
  feature_id: string;
  status: string;
}

function parseStory(file: string): StoryData | null {
  const data = loadYaml(file);
  if (!data) return null;

  const story_id = getString(data, 'story_id');
  const title = getString(data, 'title') || basename(file, '.yaml');
  const feature_id = getString(data, 'feature_id');
  const status = getString(data, 'status') || 'incomplete';

  return {
    file,
    story_id,
    title,
    feature_id,
    status,
  };
}

function listStories(
  docsDir: string,
  options: { showAll: boolean; format: string; filterStatus: string; filterFeature: string }
): void {
  const storiesDir = join(docsDir, 'user-stories');
  const files = findYamlFiles(storiesDir);

  if (files.length === 0) {
    console.log(`No story files found in ${storiesDir}`);
    return;
  }

  let stories = files.map(parseStory).filter((s): s is StoryData => s !== null);

  if (!options.showAll) {
    stories = stories.filter(s => s.status !== 'complete');
  }

  if (options.filterStatus) {
    stories = stories.filter(s => s.status === options.filterStatus);
  }

  if (options.filterFeature) {
    stories = stories.filter(s => s.feature_id === options.filterFeature);
  }

  if (options.format === 'json') {
    stories.forEach(s => {
      console.log(
        JSON.stringify({
          story_id: s.story_id,
          title: s.title,
          feature_id: s.feature_id,
          status: s.status,
          file: s.file,
        })
      );
    });
    return;
  }

  if (options.format === 'ids') {
    stories.forEach(s => console.log(s.story_id));
    return;
  }

  console.log(`User Stories in ${storiesDir}`);
  console.log('━'.repeat(70));
  console.log(`${'ID'.padEnd(12)} ${'Feature'.padEnd(10)} ${'Title'.padEnd(40)} Status`);
  console.log('━'.repeat(70));

  stories.forEach(s => {
    const statusIcon = s.status === 'complete' ? '✓' : s.status === 'in-progress' ? '●' : '○';
    console.log(
      `${s.story_id.padEnd(12)} ${s.feature_id.padEnd(10)} ${s.title.substring(0, 40).padEnd(40)} ${statusIcon} ${s.status}`
    );
  });

  console.log('━'.repeat(70));
  console.log(`Found ${stories.length} matching stories`);
}

// Flows
interface FlowData {
  file: string;
  title: string;
  key_personas: string[];
  primary_count: number;
  secondary_count: number;
  total_flows: number;
}

function parseFlow(file: string): FlowData | null {
  const data = loadYaml(file);
  if (!data) return null;

  let title = getString(data, 'title') || basename(file, '.yaml');
  if (title === 'User Flows') {
    title = basename(file, '.yaml');
  }

  const key_personas = getArray(data, 'key_personas').map(p => String(p));
  const primaryFlows = getArray(data, 'primary_flows');
  const secondaryFlows = getArray(data, 'secondary_flows');

  return {
    file,
    title,
    key_personas,
    primary_count: primaryFlows.length,
    secondary_count: secondaryFlows.length,
    total_flows: primaryFlows.length + secondaryFlows.length,
  };
}

function listFlows(docsDir: string, options: { format: string; filterPersona: string }): void {
  const flowsDir = join(docsDir, 'user-flows');
  const files = findYamlFiles(flowsDir);

  if (files.length === 0) {
    console.log(`No flow files found in ${flowsDir}`);
    return;
  }

  let flows = files.map(parseFlow).filter((f): f is FlowData => f !== null);

  if (options.filterPersona) {
    flows = flows.filter(f =>
      f.key_personas.some(p => p.toLowerCase().includes(options.filterPersona.toLowerCase()))
    );
  }

  if (options.format === 'json') {
    flows.forEach(f => {
      console.log(
        JSON.stringify({
          title: f.title,
          primary_flows: f.primary_count,
          secondary_flows: f.secondary_count,
          personas: f.key_personas.join(','),
          file: f.file,
        })
      );
    });
    return;
  }

  console.log(`User Flows in ${flowsDir}`);
  console.log('━'.repeat(65));

  flows.forEach(f => {
    console.log(
      `${f.title.substring(0, 40).padEnd(40)} ${String(f.total_flows).padStart(2)} flows | ${f.key_personas.length} personas`
    );
  });

  console.log('━'.repeat(65));
  console.log(`Found ${flows.length} flow file(s)`);
}

// Export list handler
export function list(docsDir: string, type: string, options: Record<string, unknown>): void {
  switch (type) {
    case 'features':
      listFeatures(docsDir, {
        showAll: options.all as boolean,
        format: (options.format as string) || 'summary',
        filterStatus: (options.status as string) || '',
        sortBy: (options.sort as string) || 'id',
      });
      break;

    case 'apis':
      listApis(docsDir, {
        format: (options.format as string) || 'summary',
        filterMethod: (options.method as string) || '',
        filterPath: (options.path as string) || '',
        baseUrl: (options.baseUrl as string) || 'http://localhost:3000',
      });
      break;

    case 'stories':
      listStories(docsDir, {
        showAll: options.all as boolean,
        format: (options.format as string) || 'summary',
        filterStatus: (options.status as string) || '',
        filterFeature: (options.feature as string) || '',
      });
      break;

    case 'flows':
      listFlows(docsDir, {
        format: (options.format as string) || 'summary',
        filterPersona: (options.persona as string) || '',
      });
      break;

    default:
      console.log(`Unknown list type: ${type}`);
      console.log('Available types: features, apis, stories, flows');
      process.exit(1);
  }
}
