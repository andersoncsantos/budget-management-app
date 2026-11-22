/**
 * Project Structure Investigator (Legacy)
 * 
 * This is the legacy investigator that uses the new tool system.
 * Kept for backward compatibility.
 * 
 * Run: npx tsx src/investigators/projectStructure.ts
 */

import { projectStructureTool } from '../tools/projectStructure';

// Execute the tool
projectStructureTool.execute({
  projectPath: '.',
  generateReport: true,
  reportPath: 'docs/PROJECT_STRUCTURE.md',
}).then(console.log).catch(console.error);