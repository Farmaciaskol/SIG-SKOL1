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
import { getDrugInfo } from '@/ai/tools/vademecum';

const ExtractRecipeDataFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a prescription, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractRecipeDataFromImageInput = z.infer<typeof ExtractRecipeDataFromImageInputSchema>;

const RecipeItemSchema = z.object({
  principalActiveIngredient: z.string().describe("El principio activo principal, corregido a su nombre canónico usando la herramienta `getDrugInfo`. DEBES usar el `canonicalName` retornado por la herramienta. Si la herramienta no encuentra el fármaco, usa tu mejor juicio basado en la imagen."),
  pharmaceuticalForm: z.string().describe("La forma farmacéutica (ej: 'Cápsulas', 'Crema', 'Solución', 'Papelillos').").optional().nullable(),
  concentrationValue: z.string().describe("La potencia del preparado, ej: '5' para una crema al 5%.").optional().nullable(),
  concentrationUnit: z.string().describe("La unidad para la concentración, ej: '%' para una crema, 'mg' para una cápsula.").optional().nullable(),
  dosageValue: z.string().describe("La cantidad que el paciente toma cada vez, ej: '1' para 1 cápsula.").optional().nullable(),
  dosageUnit: z.string().describe("La unidad para la dosis, ej: 'cápsula(s)', 'aplicación'.").optional().nullable(),
  frequency: z.string().describe("La frecuencia de administración en horas (ej: '24' para diario).").optional().nullable(),
  treatmentDurationValue: z.string().describe("El valor numérico de la duración del tratamiento (ej: '30').").optional().nullable(),
  treatmentDurationUnit: z.string().describe("La unidad para la duración del tratamiento (ej: 'días', 'meses').").optional().nullable(),
  safetyStockDays: z.number().optional().nullable().describe("Número de días extra para un stock de seguridad, si se menciona (ej: '5 días de seguridad')."),
  totalQuantityValue: z.string().describe("El valor numérico de la cantidad total a preparar (ej: '30').").optional().nullable(),
  totalQuantityUnit: z.string().describe("La unidad para la cantidad total (ej: 'cápsulas', 'gramos', 'papelillos').").optional().nullable(),
  usageInstructions: z.string().describe("Las instrucciones detalladas de uso para el paciente.").optional().nullable(),
});


const ExtractRecipeDataFromImageOutputSchema = z.object({
  patientName: z.string().describe("El nombre completo del paciente.").optional().nullable(),
  patientRut: z.string().describe("El RUT (cédula de identidad) del paciente, si es visible. Debe ser formateado como XX.XXX.XXX-X.").optional().nullable(),
  patientAddress: z.string().describe("La dirección completa del paciente, si es visible.").optional().nullable(),
  
  doctorName: z.string().describe("El nombre completo del médico prescriptor.").optional().nullable(),
  doctorRut: z.string().describe("El RUT (cédula de identidad) del médico, si es visible. Debe ser formateado como XX.XXX.XXX-X.").optional().nullable(),
  doctorLicense: z.string().describe("El número de colegiatura (N° Colegiatura) del médico prescriptor.").optional().nullable(),
  doctorSpecialty: z.string().describe("La especialidad del médico prescriptor.").optional().nullable(),

  prescriptionDate: z.string().describe("La fecha en que se emitió la receta en formato AAAA-MM-DD.").optional().nullable(),
  items: z.array(RecipeItemSchema).describe('Un arreglo de medicamentos o ítems prescritos encontrados en la receta.')
});
export type ExtractRecipeDataFromImageOutput = z.infer<typeof ExtractRecipeDataFromImageOutputSchema>;

export async function extractRecipeDataFromImage(input: ExtractRecipeDataFromImageInput): Promise<ExtractRecipeDataFromImageOutput> {
  return extractRecipeDataFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractRecipeDataFromImagePrompt',
  input: {schema: ExtractRecipeDataFromImageInputSchema},
  output: {schema: ExtractRecipeDataFromImageOutputSchema},
  tools: [getDrugInfo],
  prompt: `Eres un experto farmacéutico clínico y especialista en ingreso de datos. Tu tarea es extraer meticulosamente toda la información estructurada de la imagen de una receta médica.

**Proceso Detallado:**
1.  **Análisis Inicial**: Lee la receta completa para entender el contexto general.
2.  **Datos del Paciente y Médico**: Extrae todos los datos del paciente y del médico. Presta especial atención al **RUT del médico** y formatéalo como XX.XXX.XXX-X.
3.  **Procesamiento de Ítems de Medicamentos**: Para CADA medicamento o preparado en la receta, sigue estos pasos:
    a.  **Identificar Principio Activo**: Extrae el principio activo principal tal como está escrito.
    b.  **Validar Principio Activo**: Usa la herramienta \`getDrugInfo\` para validar el principio activo. **DEBES usar el \`canonicalName\` que retorna la herramienta en el campo \`principalActiveIngredient\`**. Si no lo encuentras, usa tu mejor juicio.
    c.  **Diferenciar CLARAMENTE Concentración de Dosis**:
        - **Concentración**: Es la **potencia del producto**. Ejemplos: '5' para una crema al '5%', '500' para una cápsula de '500mg'. Rellena \`concentrationValue\` y \`concentrationUnit\`. Es la cantidad de fármaco por unidad de forma farmacéutica.
        - **Dosis**: Es la **cantidad que el paciente usa cada vez**. Ejemplos: '1' para '1 cápsula', '1' para '1 aplicación'. Rellena \`dosageValue\` y \`dosageUnit\`. NO los confundas.
    d.  **Extraer todos los demás campos** para el ítem.

**Instrucciones de Formato:**
- **Capitalización:** Formatea nombres y direcciones con mayúsculas y minúsculas adecuadas (ej., 'Juan Pérez').
- **RUTs:** Asegúrate de que todos los RUTs (paciente y médico) estén formateados como XX.XXX.XXX-X.
- **Fechas:** Formato AAAA-MM-DD. Asume el año actual si no se especifica.
- **Omisiones CRÍTICAS:** Si una pieza de información NO es visible o no aplica (ej., el médico no tiene RUT en la receta), DEBES omitir el campo por completo del JSON. NO incluyas campos con valor \`null\` o \`"N/A"\`.
- **Idioma:** Toda la información debe estar en **español**.

Devuelve un único objeto JSON con todos los campos extraídos.

Imagen de la Receta: {{media url=photoDataUri}}`,
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
