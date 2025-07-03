import { RecipesClient } from '@/components/app/recipes-client';
import {
  getRecipes,
  getPatients,
  getDoctors,
  getExternalPharmacies,
} from '@/lib/data';

export default async function RecipesPage() {
  const [recipes, patients, doctors, externalPharmacies] = await Promise.all([
    getRecipes(),
    getPatients(),
    getDoctors(),
    getExternalPharmacies(),
  ]);

  return (
    <RecipesClient
      initialRecipes={recipes}
      initialPatients={patients}
      initialDoctors={doctors}
      initialExternalPharmacies={externalPharmacies}
    />
  );
}
