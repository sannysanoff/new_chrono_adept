import {
  GoogleGenAI,
  Type,
} from '@google/genai';
import { getSystemPrompt, getFactCheckSystemPrompt } from './config';

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function factCheck(query: string): Promise<string> {
  try {
    const factCheckConfig = {
      responseMimeType: 'text/plain',
      systemInstruction: [
        {
          text: getFactCheckSystemPrompt(),
        }
      ],
    };
    
    const factCheckContents = [
      {
        role: 'user',
        parts: [
          {
            text: query,
          },
        ],
      },
    ];

    const response = await genAI.models.generateContentStream({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
      config: factCheckConfig,
      contents: factCheckContents,
    });

    let result = '';
    for await (const chunk of response) {
      result += chunk.text || '';
    }
    
    return result || 'Fact-check completed but no response generated';
  } catch (error) {
    console.error('Fact-check error:', error);
    return 'Fact-check unavailable: ' + error;
  }
}

const tools = [
  {
    functionDeclarations: [
      {
        name: 'fact_check',
        description: 'Fact-check claims and statements for accuracy using specialized fact-checking analysis',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: 'The claim or statement to fact-check'
            }
          },
          required: ['query']
        }
      }
    ]
  }
];

export class GeminiClient {
  private modelName: string;
  private systemPrompt: string;

  constructor(modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20') {
    this.modelName = modelName;
    this.systemPrompt = getSystemPrompt(); // Always get fresh system prompt
  }

  async streamChat(messages: ChatMessage[], onChunk: (chunk: string) => void) {
    try {
      const config = {
        tools,
        responseMimeType: 'text/plain',
        systemInstruction: [
          {
            text: this.systemPrompt,
          }
        ],
      };

      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [
          {
            text: msg.content,
          },
        ],
      }));

      const response = await genAI.models.generateContentStream({
        model: this.modelName,
        config,
        contents,
      });
      
      let pendingFunctionCalls: any[] = [];
      
      for await (const chunk of response) {
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          pendingFunctionCalls.push(...chunk.functionCalls);
          
          for (const call of chunk.functionCalls) {
            if (call.name === 'fact_check' && call.args) {
              const query = call.args.query as string;
              console.log('🔍 FACT_CHECK TOOL INVOKED:', query);
              
              try {
                const factCheckResults = await factCheck(query);
                
                // Continue conversation with function results (hidden from user)
                const followUpContents = [
                  ...contents,
                  {
                    role: 'model',
                    parts: [
                      {
                        functionCall: {
                          name: 'fact_check',
                          args: { query }
                        }
                      }
                    ]
                  },
                  {
                    role: 'function',
                    parts: [
                      {
                        functionResponse: {
                          name: 'fact_check',
                          response: { result: factCheckResults }
                        }
                      }
                    ]
                  }
                ];

                // Generate follow-up response with function results
                const followUpResponse = await genAI.models.generateContentStream({
                  model: this.modelName,
                  config: {
                    responseMimeType: 'text/plain',
                    systemInstruction: [
                      {
                        text: this.systemPrompt,
                      }
                    ],
                  },
                  contents: followUpContents,
                });
                
                for await (const followUpChunk of followUpResponse) {
                  if (followUpChunk.text) {
                    onChunk(followUpChunk.text);
                  }
                }
                
              } catch (error) {
                console.error('Fact-check function error:', error);
                // Continue with original response if fact-check fails
              }
            }
          }
        } else if (chunk.text) {
          onChunk(chunk.text);
        }
      }
    } catch (error) {
      console.error('Gemini streaming error:', error);
      throw error;
    }
  }
}