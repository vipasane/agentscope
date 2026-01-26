#!/usr/bin/env node

/**
 * Interactive CLI example
 * Demonstrates prompts, spinners, and progress bars
 */

import {
  CommandRegistry,
  InteractivePrompt,
  Spinner,
  ProgressBar,
  c,
  setupGlobalErrorHandlers,
} from '../dist/index.js';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();
const prompt = new InteractivePrompt();

cli.register({
  name: 'setup',
  description: 'Interactive setup wizard',
  action: async () => {
    console.log(c.bold('\n🚀 Welcome to the Setup Wizard\n'));

    // Get user input
    const name = await prompt.ask({
      message: 'What is your name?',
      validate: (value) => value.length > 0 || 'Name is required',
    });

    const email = await prompt.email('What is your email?');

    const age = await prompt.number('What is your age?', {
      min: 0,
      max: 150,
    });

    // Confirmation
    const confirmed = await prompt.confirm({
      message: 'Is this information correct?',
      default: true,
    });

    if (!confirmed) {
      console.log(c.yellow('Setup cancelled'));
      return;
    }

    // Show spinner while processing
    const spinner = new Spinner({ text: 'Processing...' });
    spinner.start();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    spinner.success('Setup complete!');

    console.log(c.bold('\nYour profile:'));
    console.log(`  Name: ${c.cyan(name)}`);
    console.log(`  Email: ${c.cyan(email)}`);
    console.log(`  Age: ${c.cyan(age.toString())}`);
  },
});

cli.register({
  name: 'download',
  description: 'Simulate a download with progress bar',
  arguments: [
    {
      name: 'file',
      description: 'File to download',
      required: true,
    },
  ],
  action: async (args) => {
    const file = args.file as string;
    const total = 100;

    console.log(c.bold(`\nDownloading ${file}...\n`));

    const progress = new ProgressBar({
      total,
      label: file,
      showPercentage: true,
      showEta: true,
    });

    for (let i = 0; i <= total; i++) {
      progress.update(i);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    progress.complete();
    console.log(c.success('✓ Download complete!'));
  },
});

cli.register({
  name: 'menu',
  description: 'Show an interactive menu',
  action: async () => {
    const choice = await prompt.select({
      message: 'What would you like to do?',
      choices: [
        { label: 'Create a new project', value: 'create' },
        { label: 'Build existing project', value: 'build' },
        { label: 'Deploy to production', value: 'deploy' },
        { label: 'Exit', value: 'exit' },
      ],
    });

    console.log(c.success(`\n✓ You selected: ${choice}`));

    if (choice === 'exit') {
      console.log(c.dim('Goodbye!'));
      return;
    }

    const spinner = new Spinner({ text: `Running ${choice}...` });
    spinner.start();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    spinner.success(`${choice} completed!`);
  },
});

cli.execute(process.argv.slice(2)).catch((error) => {
  console.error(c.error(`Error: ${error.message}`));
  process.exit(1);
});
