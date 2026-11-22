/**
 * Project Structure Investigator Tool
 * 
 * A reusable tool for investigating project structure.
 * Can be called by Pi Agent to analyze any project.
 * 
 * Usage in Pi Agent:
 * ```typescript
 * import { projectStructureTool } from './tools/projectStructure';
 * 
 * const result = await projectStructureTool.execute({ projectPath: './' });
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ProjectStructureToolInput {
  /** Root path of the project to investigate (default: current directory) */
  projectPath?: string;
  /** Maximum depth for directory traversal (default: 3) */
  maxDepth?: number;
  /** Whether to generate a markdown report (default: true) */
  generateReport?: boolean;
  /** Path where to save the report (default: docs/PROJECT_STRUCTURE.md) */
  reportPath?: string;
}

export interface FileInfo {
  path: string;
  size: number;
  type: 'file' | 'directory';
  extension?: string;
}

export interface ProjectStructureResult {
  summary: {
    totalFiles: number;
    totalDirectories: number;
    totalSizeBytes: number;
  };
  techStack: {
    framework: string;
    language: string;
    buildTool: string;
    styling: string;
    routing: string;
    stateManagement: string;
    testing: string;
    dataFetching: string;
  };
  structure: {
    directories: string[];
    files: number;
    pages: string[];
    components: string[];
    services: string[];
    context: string[];
    hooks: string[];
    utils: string[];
  };
  routes: string[];
  dependencies: {
    production: string[];
    development: string[];
  };
  reportPath?: string;
}

function getDirectoryTree(dir: string, depth = 0, maxDepth = 3): FileInfo[] {
  if (depth > maxDepth) return [];
  
  const items: FileInfo[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const stats = fs.statSync(fullPath);
      
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      
      items.push({
        path: path.relative(dir, fullPath),
        size: stats.size,
        type: entry.isDirectory() ? 'directory' : 'file',
        extension: entry.isFile() ? path.extname(entry.name) : undefined,
      });
    }
  } catch (e) {
    // Ignore inaccessible directories
  }
  
  return items;
}

function findFiles(dir: string, extensions: string[] = []): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          if (extensions.length === 0 || extensions.includes(path.extname(entry.name))) {
            files.push(path.relative(dir, fullPath));
          }
        }
      }
    } catch (e) {
      // Ignore inaccessible directories
    }
  }
  
  walk(dir);
  return files;
}

function readJsonFile(filepath: string): any {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

function detectTechStack(projectRoot: string): ProjectStructureResult['techStack'] {
  const packageJson = readJsonFile(path.join(projectRoot, 'package.json'));
  const deps = packageJson?.dependencies || {};
  const devDeps = packageJson?.devDependencies || {};
  
  const allDeps = { ...deps, ...devDeps };
  
  // Detect framework
  let framework = 'Unknown';
  if (allDeps.react) framework = `React ${allDeps.react.replace('^', '')}`;
  if (allDeps.vue) framework = `Vue ${allDeps.vue.replace('^', '')}`;
  if (allDeps.angular) framework = `Angular ${allDeps.angular.replace('^', '')}`;
  if (allDeps.svelte) framework = `Svelte ${allDeps.svelte.replace('^', '')}`;
  
  // Detect language
  let language = 'JavaScript';
  if (allDeps.typescript) language = 'TypeScript';
  if (allDeps['typescript-lang']) language = 'TypeScript';
  
  // Detect build tool
  let buildTool = 'Unknown';
  if (allDeps.vite) buildTool = 'Vite';
  if (allDeps.webpack) buildTool = 'Webpack';
  if (allDeps.esbuild) buildTool = 'esbuild';
  if (allDeps.parcel) buildTool = 'Parcel';
  
  // Detect styling
  let styling = 'None';
  if (allDeps.tailwindcss || allDeps['@tailwindcss/postcss']) styling = 'Tailwind CSS';
  if (allDeps['styled-components']) styling = 'Styled Components';
  if (allDeps['@emotion/react']) styling = 'Emotion';
  if (allDeps.sass) styling = 'SASS';
  
  // Detect routing
  let routing = 'None';
  if (allDeps['react-router-dom']) routing = 'React Router';
  if (allDeps['react-router']) routing = 'React Router';
  if (allDeps['wouter']) routing = 'Wouter';
  if (allDeps['preact-router']) routing = 'Preact Router';
  
  // Detect state management
  let stateManagement = 'Context API';
  if (allDeps['@tanstack/react-query']) stateManagement = 'React Query';
  if (allDeps.zustand) stateManagement = 'Zustand';
  if (allDeps.redux) stateManagement = 'Redux';
  if (allDeps['@reduxjs/toolkit']) stateManagement = 'Redux Toolkit';
  if (allDeps.jotai) stateManagement = 'Jotai';
  if (allDeps.valtio) stateManagement = 'Valtio';
  
  // Detect testing
  let testing = 'None';
  if (allDeps.vitest) testing = 'Vitest';
  if (allDeps.jest) testing = 'Jest';
  if (allDeps['@testing-library/react']) testing += ' + Testing Library';
  if (allDeps['fast-check']) testing += ' + fast-check';
  
  // Detect data fetching
  let dataFetching = 'None';
  if (allDeps['@tanstack/react-query']) dataFetching = 'TanStack React Query';
  if (allDeps.axios) dataFetching = 'Axios';
  if (allDeps['react-query']) dataFetching = 'React Query';
  if (allDeps.urql) dataFetching = 'URQL';
  if (allDeps['apollo-client']) dataFetching = 'Apollo Client';
  
  return { framework, language, buildTool, styling, routing, stateManagement, testing, dataFetching };
}

function analyzeProject(input: ProjectStructureToolInput): ProjectStructureResult {
  const projectRoot = path.resolve(input.projectPath || '.');
  const srcDir = path.join(projectRoot, 'src');
  
  // Check if src directory exists
  let hasSrc = true;
  try {
    fs.accessSync(srcDir);
  } catch {
    hasSrc = false;
  }
  
  // Find specific file types if src exists
  const pages = hasSrc ? findFiles(path.join(srcDir, 'pages')).map(f => path.basename(f, '.tsx')) : [];
  const components = hasSrc ? findFiles(path.join(srcDir, 'components')).map(f => path.basename(f, '.tsx')) : [];
  const services = hasSrc ? findFiles(path.join(srcDir, 'services'), ['.ts', '.tsx']).map(f => path.basename(f)) : [];
  const context = hasSrc ? findFiles(path.join(srcDir, 'context'), ['.ts', '.tsx']).map(f => path.basename(f)) : [];
  const hooks = hasSrc ? findFiles(path.join(srcDir, 'hooks'), ['.ts', '.tsx']).map(f => path.basename(f)) : [];
  const utils = hasSrc ? findFiles(path.join(srcDir, 'utils'), ['.ts', '.tsx']).map(f => path.basename(f)) : [];
  
  // Count total files
  let totalFiles = 0;
  let totalSize = 0;
  
  function countFiles(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        if (entry.isDirectory()) {
          countFiles(fullPath);
        } else {
          totalFiles++;
          totalSize += fs.statSync(fullPath).size;
        }
      }
    } catch (e) {}
  }
  
  countFiles(projectRoot);
  
  const rootItems = getDirectoryTree(projectRoot, 0, 1);
  const totalDirectories = rootItems.filter(i => i.type === 'directory').length;
  
  const srcDirs = hasSrc ? fs.readdirSync(srcDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name) : [];
  
  // Get routes from App.tsx or similar
  const routes: string[] = [];
  if (hasSrc) {
    try {
      const appTsx = fs.readFileSync(path.join(srcDir, 'App.tsx'), 'utf-8');
      const routeMatches = appTsx.match(/path="([^"]+)"/g);
      if (routeMatches) {
        routes.push(...routeMatches.map(r => r.replace('path="', '').replace('"', '')));
      }
    } catch (e) {}
  }
  
  const packageJson = readJsonFile(path.join(projectRoot, 'package.json'));
  
  return {
    summary: {
      totalFiles,
      totalDirectories,
      totalSizeBytes: totalSize,
    },
    techStack: detectTechStack(projectRoot),
    structure: {
      directories: srcDirs,
      files: hasSrc ? findFiles(srcDir).length : 0,
      pages,
      components,
      services,
      context,
      hooks,
      utils,
    },
    routes,
    dependencies: {
      production: packageJson?.dependencies ? Object.keys(packageJson.dependencies) : [],
      development: packageJson?.devDependencies ? Object.keys(packageJson.devDependencies) : [],
    },
  };
}

function generateMarkdownReport(report: ProjectStructureResult, projectName: string): string {
  const lines: string[] = [
    `# ${projectName} - Project Structure Report`,
    '',
    '## 📊 Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Files | ${report.summary.totalFiles} |`,
    `| Total Directories | ${report.summary.totalDirectories} |`,
    `| Total Size | ${(report.summary.totalSizeBytes / 1024).toFixed(1)} KB |`,
    '',
    '## 🛠 Tech Stack',
    '',
    `| Category | Technology |`,
    `|----------|------------|`,
    `| Framework | ${report.techStack.framework} |`,
    `| Language | ${report.techStack.language} |`,
    `| Build Tool | ${report.techStack.buildTool} |`,
    `| Styling | ${report.techStack.styling} |`,
    `| Routing | ${report.techStack.routing} |`,
    `| State Management | ${report.techStack.stateManagement} |`,
    `| Testing | ${report.techStack.testing} |`,
    `| Data Fetching | ${report.techStack.dataFetching} |`,
    '',
    '## 📁 Source Structure',
    '',
    report.structure.directories.length > 0 
      ? `**Directories:** ${report.structure.directories.join(', ')}`
      : 'No src directory found',
    '',
    '## 📄 Pages',
    '',
    report.structure.pages.length > 0 
      ? report.structure.pages.map(p => `- ${p}`).join('\n')
      : 'No pages found',
    '',
    '## 🧩 Components',
    '',
    report.structure.components.length > 0 
      ? report.structure.components.map(c => `- ${c}`).join('\n')
      : 'No components found',
    '',
    '## ⚙️ Services',
    '',
    report.structure.services.length > 0 
      ? report.structure.services.map(s => `- ${s}`).join('\n')
      : 'No services found',
    '',
    '## 🔌 Context',
    '',
    report.structure.context.length > 0 
      ? report.structure.context.map(c => `- ${c}`).join('\n')
      : 'No context found',
    '',
    '## 🪝 Hooks',
    '',
    report.structure.hooks.length > 0 
      ? report.structure.hooks.map(h => `- ${h}`).join('\n')
      : 'No hooks found',
    '',
    '## 🛠 Utils',
    '',
    report.structure.utils.length > 0 
      ? report.structure.utils.map(u => `- ${u}`).join('\n')
      : 'No utils found',
    '',
    '## 🧭 Routes',
    '',
    report.routes.length > 0 
      ? report.routes.map(r => `- ${r}`).join('\n')
      : 'No routes found',
    '',
    '## 📦 Key Dependencies',
    '',
    `**Production:** ${report.dependencies.production.slice(0, 10).join(', ')}${report.dependencies.production.length > 10 ? '...' : ''}`,
    '',
    `**Development:** ${report.dependencies.development.slice(0, 10).join(', ')}${report.dependencies.development.length > 10 ? '...' : ''}`,
    '',
    '---',
    `*Generated by Project Structure Investigator*`,
  ];
  
  return lines.join('\n');
}

/**
 * Project Structure Investigator Tool
 * 
 * Analyzes the project structure and returns a comprehensive report.
 * Useful for understanding the codebase before making changes.
 */
export const projectStructureTool = {
  name: 'project_structure',
  description: 'Investigates and analyzes the project structure, including tech stack, directories, components, services, routes, and dependencies.',
  
  inputSchema: {
    type: 'object' as const,
    properties: {
      projectPath: {
        type: 'string',
        description: 'Root path of the project to investigate (default: current directory)',
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum depth for directory traversal (default: 3)',
      },
      generateReport: {
        type: 'boolean',
        description: 'Whether to generate a markdown report (default: true)',
      },
      reportPath: {
        type: 'string',
        description: 'Path where to save the report (default: docs/PROJECT_STRUCTURE.md)',
      },
    },
  },
  
  async execute(input: ProjectStructureToolInput): Promise<string> {
    const projectRoot = path.resolve(input.projectPath || '.');
    const projectName = path.basename(projectRoot);
    const generateReport = input.generateReport !== false;
    
    console.log(`🔍 Investigating project structure: ${projectName}...`);
    
    const report = analyzeProject(input);
    
    let outputPath: string | undefined;
    
    if (generateReport) {
      outputPath = input.reportPath 
        ? path.resolve(input.reportPath)
        : path.join(projectRoot, 'docs', 'PROJECT_STRUCTURE.md');
      
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      const markdownReport = generateMarkdownReport(report, projectName);
      fs.writeFileSync(outputPath, markdownReport);
      
      console.log(`✅ Report generated: ${outputPath}`);
    }
    
    // Return a summary string for the agent
    const summary = [
      `📊 Project: ${projectName}`,
      `📁 Files: ${report.summary.totalFiles}, Directories: ${report.summary.totalDirectories}`,
      `🛠 Tech Stack: ${report.techStack.framework} + ${report.techStack.language}`,
      `📦 Build: ${report.techStack.buildTool} | Styling: ${report.techStack.styling}`,
      `🔀 Routing: ${report.techStack.routing} | State: ${report.techStack.stateManagement}`,
      report.structure.pages.length > 0 ? `📄 Pages: ${report.structure.pages.join(', ')}` : null,
      report.structure.components.length > 0 ? `🧩 Components: ${report.structure.components.length} found` : null,
      report.structure.services.length > 0 ? `⚙️ Services: ${report.structure.services.length} found` : null,
      report.structure.context.length > 0 ? `🔌 Context: ${report.structure.context.join(', ')}` : null,
      generateReport && outputPath ? `📝 Report saved to: ${outputPath}` : null,
    ].filter(Boolean).join('\n');
    
    return summary;
  },
};

export default projectStructureTool;