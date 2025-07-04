
'use server';

/**
 * @fileOverview AI agent to proactively analyze a chronic patient's status.
 *
 * - analyzePatientForProactiveAlerts - A function that analyzes a patient's medication history.
 * - ProactiveAnalysisInput - The input type for the function.
 * - ProactiveAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ProactivePatientStatus, PatientActionNeeded, RecipeStatus } from '@/lib/types';

// Define Zod schemas based on the types needed for the flow
const ProactivePatientStatusEnum = z.nativeEnum(ProactivePatientStatus);
const PatientActionNeededEnum = z.nativeEnum(PatientActionNeeded);

const PatientSchema = z.object({
  id: z.string(),
  name: z.string(),
  isChronic: z.boolean(),
});

const RecipeItemSchema = z.object({
  principalActiveIngredient: z.string(),
});

const AuditTrailEntrySchema = z.object({
  date: z.string(),
  status: z.nativeEnum(RecipeStatus),
});

const RecipeSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(RecipeStatus),
  dueDate: z.string(),
  items: z.array(RecipeItemSchema),
  auditTrail: z.array(AuditTrailEntrySchema).optional(),
});


const ProactiveAnalysisInputSchema = z.object({
    patient: PatientSchema,
    recipes: z.array(RecipeSchema),
    currentDate: z.string().describe("The current date in ISO format, to be used as a reference for all date comparisons."),
    maxCycles: z.number().describe("The maximum number of dispensation cycles allowed for a single recipe before it's considered exhausted."),
});
export type ProactiveAnalysisInput = z.infer<typeof ProactiveAnalysisInputSchema>;

const ProactiveAnalysisOutputSchema = z.object({
  proactiveStatus: ProactivePatientStatusEnum.describe("The overall status of the patient."),
  actionNeeded: PatientActionNeededEnum.describe("The specific action required from the pharmacist."),
  proactiveMessage: z.string().describe("A concise, human-readable message in Spanish explaining the patient's status and the reason for it. This message will be shown directly to the pharmacist."),
});
export type ProactiveAnalysisOutput = z.infer<typeof ProactiveAnalysisOutputSchema>;


export async function analyzePatientForProactiveAlerts(input: ProactiveAnalysisInput): Promise<ProactiveAnalysisOutput> {
  return analyzePatientProactiveAlertsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePatientProactiveAlertsPrompt',
  input: { schema: ProactiveAnalysisInputSchema },
  output: { schema: ProactiveAnalysisOutputSchema },
  prompt: `
You are an expert pharmaceutical assistant responsible for proactive patient management. Your task is to analyze a chronic patient's data and their associated magistral recipes to determine if any action is required. Evaluate the rules in the specified order of priority.

**Today's Date: {{currentDate}}**
**Maximum Preparation Cycles per Recipe: {{maxCycles}}**

**Patient Information:**
- Name: {{patient.name}}
- Is Chronic: {{patient.isChronic}}

**Associated Recipes:**
{{#each recipes}}
- Recipe ID: {{this.id}}
  - Status: {{this.status}}
  - Due Date: {{this.dueDate}}
  - Items: {{#each this.items}}{{this.principalActiveIngredient}} {{/each}}
  - Dispensation History (Audit Trail):
    {{#each this.auditTrail}}
      - {{this.date}}: {{this.status}}
    {{/each}}
{{/each}}
{{#unless recipes}}
- No magistral recipes found for this patient.
{{/unless}}

**Analysis Rules (Evaluate in order of priority):**

1.  **URGENT - CREATE_NEW_RECIPE (Reason: Cycle Limit Reached):**
    - If the most recent active/dispensed chronic recipe has been dispensed \`maxCycles\` or more times (count "Dispensada" in audit trail).
    - **Message:** "Se requiere NUEVA receta. Límite de {{maxCycles}} ciclos de preparación alcanzado."

2.  **URGENT - CREATE_NEW_RECIPE (Reason: Recipe Expired/Expiring Soon):**
    - If the \`dueDate\` of the most recent active/dispensed chronic recipe is **less than 30 days** from today's date.
    - **Message:** "Se requiere NUEVA receta. El documento está vencido o próximo a vencer."

3.  **URGENT - CREATE_NEW_RECIPE (Reason: No Active Recipe):**
    - If the patient is chronic but has no active magistral recipes at all.
    - **Message:** "Paciente crónico sin receta magistral activa. Es necesario gestionar una."

4.  **ATTENTION - CREATE_NEW_RECIPE (Preventive Alert):**
    - If the \`dueDate\` of the most recent active/dispensed chronic recipe is **between 30 and 60 days** from today's date.
    - **Message:** "Atención: La receta vencerá pronto. Planificar la solicitud de una nueva."

5.  **ATTENTION - REPREPARE_CYCLE:**
    - If the patient has a valid, active recipe (more than 60 days until \`dueDate\` and cycles are available) that was last dispensed more than 25 days ago.
    - **Message:** "Es momento de preparar el siguiente ciclo de medicación para el paciente."

6.  **OK - NONE:**
    - If none of the above conditions are met.
    - **Message:** "Paciente al día con su tratamiento. No se requiere acción inmediata."

Based on these rules, analyze the provided data and determine the \`proactiveStatus\`, \`actionNeeded\`, and a concise \`proactiveMessage\` in Spanish for the pharmacist.`,
});

const analyzePatientProactiveAlertsFlow = ai.defineFlow(
  {
    name: 'analyzePatientProactiveAlertsFlow',
    inputSchema: ProactiveAnalysisInputSchema,
    outputSchema: ProactiveAnalysisOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI model failed to produce a valid proactive analysis.");
    }
    return output;
  }
);
