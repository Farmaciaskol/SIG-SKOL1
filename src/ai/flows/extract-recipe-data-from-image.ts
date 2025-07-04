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
  patientRut: z.string().describe("The RUT (national ID) of the patient, if visible. Must be formatted as XX.XXX.XXX-X.").optional(),
  patientAddress: z.string().describe("The full address of the patient, if visible.").optional(),
  
  doctorName: z.string().describe("The full name of the prescribing doctor.").optional(),
  doctorRut: z.string().describe("The RUT (national ID) of the doctor, if visible. Must be formatted as XX.XXX.XXX-X.").optional(),
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
  
  Carefully extract all the following details from the image.
  - Patient's full name (patientName)
  - Patient's RUT (patientRut). Format it as XX.XXX.XXX-X.
  - Patient's full address (patientAddress).
  - Doctor's full name (doctorName).
  - Doctor's RUT (doctorRut). Format it as XX.XXX.XXX-X.
  - Doctor's professional license number (doctorLicense, also known as N° Colegiatura).
  - Doctor's specialty (doctorSpecialty).
  - Date of prescription (prescriptionDate) in YYYY-MM-DD format. If the year is not specified, assume the current year.
  - A list of prescribed items (items), paying close attention to the pharmaceutical form (pharmaceuticalForm, e.g., 'Cápsulas', 'Crema').

  Return a single JSON object with all the extracted fields. If a piece of information is not visible, omit its field from the output.

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
    if (!output) {
      throw new Error("AI model failed to extract any data from the image.");
    }
    return output;
  }
);
