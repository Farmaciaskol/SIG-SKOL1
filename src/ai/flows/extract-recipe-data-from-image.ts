'use server';
/**
 * @fileOverview AI agent that extracts recipe data from an image.
 *
 * - extractRecipeDataFromImage - Extracts data from a prescription image.
 * - ExtractRecipeDataFromImageInput - The input type for extractRecipeDataFromImage.
 * - ExtractRecipeDataFromImageOutput - The output type for extractRecipeDataFromImage.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractRecipeDataFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a prescription, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractRecipeDataFromImageInput = z.infer<typeof ExtractRecipeDataFromImageInputSchema>;

const RecipeItemSchema = z.object({
  activeIngredient: z.string().describe('The name of the active ingredient or medication.'),
  dosage: z.string().describe('The dosage strength or concentration (e.g., "10mg", "5%").'),
  instructions: z.string().describe('The full usage instructions (e.g., "Take one tablet daily with food").')
});

const ExtractRecipeDataFromImageOutputSchema = z.object({
  patientName: z.string().describe("The full name of the patient.").optional(),
  patientRut: z.string().describe("The RUT (national ID) of the patient, if visible.").optional(),
  doctorName: z.string().describe("The full name of the prescribing doctor.").optional(),
  prescriptionDate: z.string().describe("The date the prescription was issued in YYYY-MM-DD format.").optional(),
  items: z.array(RecipeItemSchema).describe('An array of prescribed medications or items found in the recipe.')
});
export type ExtractRecipeDataFromImageOutput = z.infer<typeof ExtractRecipeDataFromImageOutputSchema>;

export async function extractRecipeDataFromImage(input: ExtractRecipeDataFromImageInput): Promise<ExtractRecipeDataFromImageOutput> {
  return extractRecipeDataFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractRecipeDataFromImagePrompt',
  input: {schema: ExtractRecipeDataFromImageInputSchema},
  output: {schema: ExtractRecipeDataFromImageOutputSchema},
  prompt: `You are an expert pharmacist and data entry specialist. Your task is to extract structured information from the provided image of a medical prescription. 
  
  Please extract the following details and return them in a JSON object:
  - Patient's full name (patientName)
  - Patient's RUT or national ID (patientRut), if available.
  - Doctor's full name (doctorName)
  - Date of prescription (prescriptionDate) in YYYY-MM-DD format. If the year is not specified, assume the current year.
  - A list of prescribed items (items), where each item includes:
    - The active ingredient (activeIngredient).
    - The dosage or strength (dosage).
    - The detailed usage instructions (instructions).

  If any piece of information is not clearly visible, omit it from the output.

  Prescription Image: {{media url=photoDataUri}}`,
});

const extractRecipeDataFromImageFlow = ai.defineFlow(
  {
    name: 'extractRecipeDataFromImageFlow',
    inputSchema: ExtractRecipeDataFromImageInputSchema,
    outputSchema: ExtractRecipeDataFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
