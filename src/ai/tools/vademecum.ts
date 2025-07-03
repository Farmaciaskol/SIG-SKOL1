
'use server';
/**
 * @fileOverview A Genkit tool for fetching drug information, simulating a vademecum.
 *
 * - getDrugInfo - A tool that returns information about a specific drug.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Mock database simulating a Vademecum API response
const mockVademecumDB: Record<string, any> = {
  'minoxidil': {
    interactions: ['Puede potenciar el efecto de otros antihipertensivos.', 'Evitar uso concomitante con guanetidina.'],
    contraindications: ['Feocromocitoma', 'Hipersensibilidad al principio activo.'],
    standardDosage: 'Uso tópico al 2% o 5%, una o dos veces al día.',
  },
  'fenobarbital': {
    interactions: ['Inductor enzimático, puede reducir la eficacia de anticoagulantes, anticonceptivos orales, y otros.', 'El alcohol potencia su efecto sedante.'],
    contraindications: ['Insuficiencia respiratoria grave', 'Porfiria aguda intermitente', 'Insuficiencia hepática o renal grave.'],
    standardDosage: 'Adultos: 50-100 mg, 2-3 veces al día. Dosis sedante/hipnótica es variable.',
  },
  'betametasona': {
    interactions: ['El uso con AINEs aumenta el riesgo de úlcera gastrointestinal.', 'Puede disminuir los niveles de salicilatos en sangre.'],
    contraindications: ['Infecciones fúngicas sistémicas', 'Hipersensibilidad.'],
    standardDosage: 'Uso tópico: aplicar una fina capa 1-2 veces al día. Dosis sistémica varía según la condición.'
  }
};


export const getDrugInfo = ai.defineTool(
  {
    name: 'getDrugInfo',
    description: 'Busca información sobre un principio activo específico en el Vademecum, incluyendo interacciones, contraindicaciones y dosis estándar.',
    inputSchema: z.object({
      drugName: z.string().describe('El nombre del principio activo a buscar.'),
    }),
    outputSchema: z.object({
      found: z.boolean().describe('Indica si se encontró información para el fármaco.'),
      interactions: z.array(z.string()).optional().describe('Posibles interacciones farmacológicas.'),
      contraindications: z.array(z.string()).optional().describe('Contraindicaciones para el uso del fármaco.'),
      standardDosage: z.string().optional().describe('Información sobre la dosificación estándar.'),
    }),
  },
  async (input) => {
    const drugKey = input.drugName.toLowerCase();
    const result = mockVademecumDB[drugKey];
    
    if (result) {
      return {
        found: true,
        ...result,
      };
    } else {
      return {
        found: false,
      };
    }
  }
);
