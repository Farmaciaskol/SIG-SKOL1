'use server';

/**
 * @fileOverview A simple Genkit flow for testing Gemini integration.
 *
 * - testFlow - A function that takes a string and gets a response from an AI model.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TestFlowInputSchema = z.string().describe('A simple text prompt.');
export type TestFlowInput = z.infer<typeof TestFlowInputSchema>;

const TestFlowOutputSchema = z.string().describe('The AI-generated response.');
export type TestFlowOutput = z.infer<typeof TestFlowOutputSchema>;

export async function testFlow(input: TestFlowInput): Promise<TestFlowOutput> {
  return testFlowRunner(input);
}

const prompt = ai.definePrompt({
  name: 'testFlowPrompt',
  input: { schema: TestFlowInputSchema },
  output: { schema: TestFlowOutputSchema },
  prompt: `You are a helpful assistant. Respond to the following prompt concisely: {{{$input}}}`,
});

const testFlowRunner = ai.defineFlow(
  {
    name: 'testFlow',
    inputSchema: TestFlowInputSchema,
    outputSchema: TestFlowOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output || '';
  }
);
