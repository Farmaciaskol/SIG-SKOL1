'use server';
/**
 * @fileOverview A Genkit tool for fetching drug information from a simulated Vademecum.
 *
 * - getDrugInfo - A tool that returns information about a specific drug.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Simulated Vademecum data. In a real application, this would be an API call.
const VADEMECUM_DATA = [
    {
        canonicalName: "Minoxidilo",
        aliases: ["minoxidil"],
        interactions: ["Puede causar hipotensión si se combina con otros vasodilatadores."],
        contraindications: ["Hipersensibilidad al minoxidil.", "Feocromocitoma."],
        standardDosage: "Tópico al 2% o 5%, aplicar 1 mL dos veces al día en el cuero cabelludo."
    },
    {
        canonicalName: "Ácido Retinoico",
        aliases: ["tretinoina", "acido retinoico"],
        interactions: ["Evitar uso concomitante con agentes exfoliantes (peróxido de benzoilo, ácido salicílico).", "Fotosensibilidad aumentada con tetraciclinas."],
        contraindications: ["Embarazo o lactancia.", "Eczema, piel quemada por el sol."],
        standardDosage: "Aplicación tópica al 0.025% - 0.1% una vez al día, preferiblemente por la noche."
    },
    {
        canonicalName: "Clobetasol Propionato",
        aliases: ["clobetasol"],
        interactions: ["Riesgo de supresión adrenal si se usa con otros corticosteroides potentes."],
        contraindications: ["Infecciones cutáneas no tratadas (bacterianas, fúngicas, virales).", "Acné rosácea y dermatitis perioral."],
        standardDosage: "Aplicar una fina capa al 0.05% en el área afectada una o dos veces al día."
    },
    {
        canonicalName: "Hidroquinona",
        aliases: ["hydroquinone", "hidroquinona"],
        interactions: ["Evitar uso con peróxidos ya que puede causar manchas temporales en la piel."],
        contraindications: ["Hipersensibilidad.", "Uso en grandes áreas del cuerpo."],
        standardDosage: "Tópico al 2% - 4% una o dos veces al día sobre las áreas hiperpigmentadas."
    },
    {
        canonicalName: "Cafeína Anhidra",
        aliases: ["cafeina"],
        interactions: ["Puede aumentar el efecto de otros estimulantes."],
        contraindications: [],
        standardDosage: "Depende de la formulación, usualmente en concentraciones de 1-5% para uso tópico."
    },
    {
        canonicalName: "Finasterida",
        aliases: ["finasterida", "finasteride"],
        interactions: [],
        contraindications: ["Mujeres embarazadas o que puedan quedar embarazadas.", "Niños."],
        standardDosage: "1 mg por día para la alopecia androgenética."
    },
];

export const getDrugInfo = ai.defineTool(
  {
    name: 'getDrugInfo',
    description: 'Busca información sobre un principio activo específico en el Vademecum, incluyendo su nombre canónico, interacciones, contraindicaciones y dosis estándar.',
    inputSchema: z.object({
      drugName: z.string().describe('El nombre del principio activo a buscar, tal como aparece en la receta.'),
    }),
    outputSchema: z.object({
      found: z.boolean().describe('Indica si se encontró información para el fármaco.'),
      canonicalName: z.string().optional().describe('El nombre oficial y correctamente escrito del principio activo.'),
      interactions: z.array(z.string()).optional().describe('Posibles interacciones farmacológicas.'),
      contraindications: z.array(z.string()).optional().describe('Contraindicaciones para el uso del fármaco.'),
      standardDosage: z.string().optional().describe('Información sobre la dosificación estándar o indicaciones principales.'),
    }),
  },
  async (input) => {
    const searchTerm = input.drugName.toLowerCase().trim();
    
    const result = VADEMECUM_DATA.find(drug => 
        drug.aliases.some(alias => searchTerm.includes(alias)) || 
        drug.canonicalName.toLowerCase() === searchTerm
    );
    
    if (result) {
      return {
        found: true,
        canonicalName: result.canonicalName,
        interactions: result.interactions,
        contraindications: result.contraindications,
        standardDosage: result.standardDosage,
      };
    } else {
      return {
        found: false,
      };
    }
  }
);
