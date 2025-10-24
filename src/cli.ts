#!/usr/bin/env node

import { Command } from 'commander';
import { join } from 'path';
import { findDocsDir, ensureClaudeDoc } from './utils.js';
import { check } from './commands/check.js';
import { list } from './commands/list.js';
import { generate } from './commands/generate.js';
import { info } from './commands/info.js';
import { template } from './commands/template.js';

const program = new Command();

program
  .name('pdocs')
  .description('CLI tool for managing YAML-based project documentation')
  .version('1.0.0');

// Check command
program
  .command('check')
  .description('Check project documentation for completeness and consistency')
  .option('-v, --verbose', 'Show verbose output', false)
  .option('--no-links', 'Skip cross-reference validation')
  .option('--format <format>', 'Output format: summary|detailed|json', 'summary')
  .action((options) => {
    const docsDir = findDocsDir();
    if (!docsDir) {
      console.log('Error: Could not find docs/ directory');
      console.log('Please run this command from a project directory containing a docs/ folder');
      process.exit(1);
    }

    ensureClaudeDoc(docsDir);

    check(docsDir, {
      verbose: options.verbose,
      checkLinks: options.links,
      format: options.format,
    });
  });

// List command
const listCommand = program
  .command('list <type>')
  .description('List documentation by type: features, apis, stories, flows')
  .action((type, options) => {
    const docsDir = findDocsDir();
    if (!docsDir) {
      console.log('Error: Could not find docs/ directory');
      console.log('Please run this command from a project directory containing a docs/ folder');
      process.exit(1);
    }

    ensureClaudeDoc(docsDir);

    const validTypes = ['features', 'apis', 'stories', 'flows'];
    if (!validTypes.includes(type)) {
      console.log(`Error: Invalid list type '${type}'`);
      console.log(`Valid types: ${validTypes.join(', ')}`);
      process.exit(1);
    }

    list(docsDir, type, options);
  });

// List subcommand options
listCommand.option('-a, --all', 'Show all items (default: only incomplete)', false);
listCommand.option('--format <format>', 'Output format (varies by type)');
listCommand.option('--status <status>', 'Filter by status: incomplete|in-progress|complete');
listCommand.option('--sort <field>', 'Sort by field (features: id|status|title)');
listCommand.option('--method <method>', 'Filter APIs by HTTP method (GET|POST|PUT|DELETE|PATCH)');
listCommand.option('--path <path>', 'Filter APIs by path pattern');
listCommand.option('--base-url <url>', 'Base URL for curl commands', 'http://localhost:3000');
listCommand.option('--feature <id>', 'Filter stories by feature ID');
listCommand.option('--persona <name>', 'Filter flows by persona name');

// Generate command
program
  .command('generate')
  .description('Generate human-readable documentation from YAML files')
  .option('-o, --output <dir>', 'Output directory (default: docs/generated)')
  .option('-f, --format <format>', 'Output format: markdown|html', 'markdown')
  .option('--no-toc', 'Skip table of contents generation')
  .action((options) => {
    const docsDir = findDocsDir();
    if (!docsDir) {
      console.log('Error: Could not find docs/ directory');
      console.log('Please run this command from a project directory containing a docs/ folder');
      process.exit(1);
    }

    ensureClaudeDoc(docsDir);

    const outputDir = options.output || join(docsDir, 'generated');

    generate(docsDir, {
      outputDir,
      format: options.format,
      includeToc: options.toc,
    });
  });

// Info command
program
  .command('info')
  .description('Display quick overview of project documentation')
  .action(() => {
    const docsDir = findDocsDir();
    if (!docsDir) {
      console.log('Error: Could not find docs/ directory');
      console.log('Please run this command from a project directory containing a docs/ folder');
      process.exit(1);
    }

    ensureClaudeDoc(docsDir);

    info(docsDir);
  });

// Template command
program
  .command('template <type>')
  .description('Get template for documentation type')
  .action((type) => {
    template(type);
  });

// Custom help for malformed commands
program.on('command:*', (operands) => {
  console.log(`Error: Unknown command '${operands[0]}'`);
  console.log('');
  console.log('Available commands:');
  console.log('  check        Check documentation for completeness');
  console.log('  list         List documentation by type');
  console.log('  generate     Generate readable docs from YAML');
  console.log('  info         Display project overview');
  console.log('  template     Get template for documentation type');
  console.log('');
  console.log('Run "pdocs --help" for more information');
  process.exit(1);
});

program.parse();
