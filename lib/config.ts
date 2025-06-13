import fs from 'fs';
import path from 'path';

let systemPrompt: string | null = null;
let factCheckSystemPrompt: string | null = null;

export function getSystemPrompt(): string {
  // Always reload system prompt (don't cache)
  try {
    const promptPath = path.join(process.cwd(), 'config', 'system-prompt.txt');
    return fs.readFileSync(promptPath, 'utf-8').trim();
  } catch (error) {
    console.error('Failed to read system prompt from file:', error);
    return 'You are a helpful AI assistant with access to fact-checking capabilities.';
  }
}

export function getFactCheckSystemPrompt(): string {
  if (factCheckSystemPrompt === null) {
    try {
      const promptPath = path.join(process.cwd(), 'config', 'fact-check-system-prompt.txt');
      factCheckSystemPrompt = fs.readFileSync(promptPath, 'utf-8').trim();
    } catch (error) {
      console.error('Failed to read fact-check system prompt from file:', error);
      factCheckSystemPrompt = 'You are a fact-checking assistant. Verify claims and provide accurate information with sources.';
    }
  }
  return factCheckSystemPrompt;
}