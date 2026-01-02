#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const chalk = require('chalk');
const { Command } = require('commander');
const ora = require('ora');

const packageJson = require('../package.json');

const program = new Command();

program
  .name('ignite-parse-auth-kit')
  .description('Create a new React Native app with Parse authentication')
  .version(packageJson.version)
  .arguments('[project-name]')
  .option('-d, --directory <path>', 'Directory to create the project in')
  .option('--skip-install', 'Skip installing dependencies')
  .option('--use-npm', 'Use npm instead of yarn')
  .option('--use-bun', 'Use bun instead of yarn')
  .action(async (projectName, options) => {
    console.log(chalk.cyan('\n🔥 Ignite Parse Auth Kit\n'));
    console.log(chalk.gray(`v${packageJson.version}\n`));

    if (!projectName) {
      console.log(chalk.yellow('Usage: npx ignite-parse-auth-kit <project-name>\n'));
      console.log(chalk.gray('Example: npx ignite-parse-auth-kit my-app\n'));
      process.exit(1);
    }

    const targetDir = options.directory 
      ? path.resolve(options.directory, projectName)
      : path.resolve(process.cwd(), projectName);

    if (fs.existsSync(targetDir)) {
      console.log(chalk.red(`\n❌ Directory "${projectName}" already exists.\n`));
      process.exit(1);
    }

    const spinner = ora('Creating your new project...').start();

    try {
      // Create the target directory
      fs.mkdirSync(targetDir, { recursive: true });

      // Get the template source directory (where this package is installed)
      const templateDir = path.resolve(__dirname, '..');
      
      // Files and directories to copy
      const itemsToCopy = [
        'app',
        'assets',
        'ignite',
        'plugins',
        'src',
        'template',
        'test',
        'types',
        'index.tsx',
        'app.config.ts',
        'app.json',
        'babel.config.js',
        'metro.config.js',
        'tsconfig.json',
        'jest.config.js',
        '.gitignore',
        '.env.example',
        'README.md',
        'LICENSE',
        'CONTRIBUTING.md'
      ];

      // Copy each item
      for (const item of itemsToCopy) {
        const sourcePath = path.join(templateDir, item);
        const destPath = path.join(targetDir, item);
        
        if (fs.existsSync(sourcePath)) {
          copyRecursive(sourcePath, destPath);
        }
      }

      // Copy package.json but modify it for the new project
      const templatePkgPath = path.join(templateDir, 'package.json');
      const templatePkg = JSON.parse(fs.readFileSync(templatePkgPath, 'utf8'));
      
      // Create a clean package.json for the new project
      const newPkg = {
        name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        version: '1.0.0',
        private: true,
        main: templatePkg.main,
        scripts: { ...templatePkg.scripts },
        dependencies: { ...templatePkg.dependencies },
        devDependencies: {},
        engines: templatePkg.engines,
        expo: templatePkg.expo
      };

      // Copy devDependencies except CLI-specific ones
      const cliDeps = ['chalk', 'commander', 'fs-extra', 'ora'];
      for (const [dep, version] of Object.entries(templatePkg.devDependencies || {})) {
        if (!cliDeps.includes(dep)) {
          newPkg.devDependencies[dep] = version;
        }
      }

      // Remove bin and files entries (not needed for the project)
      delete newPkg.bin;
      delete newPkg.files;
      delete newPkg.repository;
      delete newPkg.bugs;
      delete newPkg.homepage;
      delete newPkg.keywords;

      fs.writeFileSync(
        path.join(targetDir, 'package.json'),
        JSON.stringify(newPkg, null, 2)
      );

      // Update app.json with the new project name
      const appJsonPath = path.join(targetDir, 'app.json');
      if (fs.existsSync(appJsonPath)) {
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        appJson.expo = appJson.expo || {};
        appJson.expo.name = projectName;
        appJson.expo.slug = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
      }

      spinner.succeed(chalk.green('Project created successfully!'));

      // Install dependencies
      if (!options.skipInstall) {
        const installSpinner = ora('Installing dependencies...').start();
        
        try {
          const packageManager = options.useBun ? 'bun' : (options.useNpm ? 'npm' : 'yarn');
          const installCmd = packageManager === 'npm' ? 'npm install' : `${packageManager} install`;
          
          execSync(installCmd, {
            cwd: targetDir,
            stdio: 'pipe'
          });
          
          installSpinner.succeed(chalk.green('Dependencies installed!'));
        } catch (error) {
          installSpinner.warn(chalk.yellow('Could not install dependencies automatically.'));
          console.log(chalk.gray('Run "npm install" or "yarn install" manually.\n'));
        }
      }

      // Print next steps
      console.log('\n' + chalk.cyan('🎉 Your project is ready!\n'));
      console.log(chalk.white('Next steps:\n'));
      console.log(chalk.gray(`  cd ${projectName}`));
      if (options.skipInstall) {
        console.log(chalk.gray('  npm install'));
      }
      console.log(chalk.gray('  npx expo start\n'));
      
      console.log(chalk.white('Configure your Parse Server:\n'));
      console.log(chalk.gray('  Edit app/config/config.dev.ts with your Parse Server credentials\n'));
      
      console.log(chalk.cyan('Happy coding! 🚀\n'));

    } catch (error) {
      spinner.fail(chalk.red('Failed to create project'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

/**
 * Recursively copy files and directories
 */
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      // Skip node_modules and other unwanted directories
      if (['node_modules', '.git', '.expo', 'android', 'ios'].includes(item)) {
        continue;
      }
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

program.parse();
