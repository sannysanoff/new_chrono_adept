import type { NextApiRequest, NextApiResponse } from 'next';
import { GeminiClient, ChatMessage } from '../../lib/gemini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    const gemini = new GeminiClient();
    
    await gemini.streamChat(messages as ChatMessage[], (chunk: string) => {
      res.write(chunk);
    });
    
    res.end();
  } catch (error) {
    console.error('Chat API error:', error);
    res.write('\n\nError: Failed to generate response');
    res.end();
  }
}