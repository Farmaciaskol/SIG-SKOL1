'use server';
/**
 * @fileOverview A Genkit tool for finding patients and doctors.
 *
 * - findMatchingEntity - A tool that searches for patients or doctors.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPatients, getDoctors } from '@/lib/data';

export const findMatchingEntity = ai.defineTool(
  {
    name: 'findMatchingEntity',
    description: 'Searches for an existing patient or doctor based on their name or RUT. Useful for matching extracted data to existing records.',
    inputSchema: z.object({
      entityType: z.enum(['patient', 'doctor']).describe('The type of entity to search for.'),
      name: z.string().optional().describe('The name of the person to search for.'),
      rut: z.string().optional().describe('The RUT of the person to search for.'),
    }),
    outputSchema: z.array(z.object({
      id: z.string(),
      name: z.string(),
      rut: z.string().optional(),
    })).describe('A list of matching entities found.'),
  },
  async (input) => {
    const { entityType, name, rut } = input;
    
    // Normalize RUT for comparison
    const normalizeRut = (r?: string) => r?.replace(/[.-]/g, '').toLowerCase();
    const normalizedSearchRut = normalizeRut(rut);

    if (entityType === 'patient') {
      const patients = await getPatients();
      return patients.filter(p => 
        (normalizedSearchRut && p.rut && normalizeRut(p.rut) === normalizedSearchRut) ||
        (name && p.name.toLowerCase().includes(name.toLowerCase()))
      ).map(p => ({ id: p.id, name: p.name, rut: p.rut }));
    }

    if (entityType === 'doctor') {
      const doctors = await getDoctors();
      return doctors.filter(d => 
        (normalizedSearchRut && d.rut && normalizeRut(d.rut) === normalizedSearchRut) ||
        (name && d.name.toLowerCase().includes(name.toLowerCase()))
      ).map(d => ({ id: d.id, name: d.name, rut: d.rut }));
    }

    return [];
  }
);
