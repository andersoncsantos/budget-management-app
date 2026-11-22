/**
 * Pi Agent Tools
 * 
 * This module exports all available tools for the Pi Agent.
 * Each tool can be used by the agent to perform specific tasks.
 */

export { projectStructureTool, type ProjectStructureToolInput } from './projectStructure';

/**
 * Tool Registry
 * 
 * All available tools that can be used by the Pi Agent.
 */
export const tools = {
  project_structure: {
    name: 'project_structure',
    description: 'Investigates and analyzes the project structure, including tech stack, directories, components, services, routes, and dependencies.',
    execute: async (input: any) => {
      const { projectStructureTool } = await import('./projectStructure');
      return projectStructureTool.execute(input);
    },
  },
};

/**
 * Pi Agent Tool Executor
 * 
 * Helper to execute tools by name.
 */
export async function executeTool(toolName: string, input: any): Promise<string> {
  const tool = tools[toolName as keyof typeof tools];
  
  if (!tool) {
    throw new Error(`Tool "${toolName}" not found. Available tools: ${Object.keys(tools).join(', ')}`);
  }
  
  return tool.execute(input);
}