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
  principalActiveIngredient: z.string().describe("The main active ingredient of the preparation."),
  pharmaceuticalForm: z.string().describe("The pharmaceutical form (e.g., 'Cápsulas', 'Crema', 'Solución').").optional(),
  concentrationValue: z.string().describe("The numerical value of the concentration (e.g., '5').").optional(),
  concentrationUnit: z.string().describe("The unit for the concentration (e.g., '%', 'mg/ml').").optional(),
  dosageValue: z.string().describe("The numerical value of the dose (e.g., '10').").optional(),
  dosageUnit: z.string().describe("The unit for the dose (e.g., 'mg', 'ml').").optional(),
  frequency: z.string().describe("The frequency of administration in hours (e.g., '24' for daily).").optional(),
  treatmentDurationValue: z.string().describe("The numerical value of the treatment duration (e.g., '30').").optional(),
  treatmentDurationUnit: z.string().describe("The unit for the treatment duration (e.g., 'días', 'meses').").optional(),
  totalQuantityValue: z.string().describe("The numerical value of the total quantity to prepare (e.g., '30').").optional(),
  totalQuantityUnit: z.string().describe("The unit for the total quantity (e.g., 'cápsulas', 'gramos').").optional(),
  usageInstructions: z.string().describe("The detailed usage instructions for the patient."),
});


const ExtractRecipeDataFromImageOutputSchema = z.object({
  patientName: z.string().describe("The full name of the patient.").optional(),
  patientRut: z.string().describe("The RUT (national ID) of the patient, if visible.").optional(),
  doctorName: z.string().describe("The full name of the prescribing doctor.").optional(),
  doctorRut: z.string().describe("The RUT (national ID) of the doctor, if visible.").optional(),
  doctorLicense: z.string().describe("The license number (N° Colegiatura) of the prescribing doctor.").optional(),
  doctorSpecialty: z.string().describe("The specialty of the prescribing doctor.").optional(),
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
  - Doctor's RUT or national ID (doctorRut), if available.
  - Doctor's license number (doctorLicense)
  - Doctor's specialty (doctorSpecialty)
  - Date of prescription (prescriptionDate) in YYYY-MM-DD format. If the year is not specified, assume the current year.
  - A list of prescribed items (items), where each item includes:
    - The main active ingredient (principalActiveIngredient).
    - The pharmaceutical form (pharmaceuticalForm), e.g., 'Cápsulas', 'Crema'.
    - The concentration value (concentrationValue) and unit (concentrationUnit).
    - The dosage value (dosageValue) and unit (dosageUnit).
    - The frequency in hours (frequency), e.g., '24' for daily, '12' for twice a day.
    - The treatment duration value (treatmentDurationValue) and unit (treatmentDurationUnit), e.g., '30' and 'días'.
    - The total quantity value (totalQuantityValue) and unit (totalQuantityUnit).
    - The detailed usage instructions (usageInstructions).

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
