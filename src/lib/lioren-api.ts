
'use server';

// Define a type for the raw product from Lioren API
export interface LiorenProduct {
  id: number;
  nombre: string;
  codigo: string; // SKU
  descripcion?: string;
  precio_venta: number;
  costo: number;
  stock_actual: number;
  familia?: {
    nombre: string;
  };
  // Add other fields from the API as needed
}

export async function fetchRawInventoryFromLioren(): Promise<LiorenProduct[]> {
  const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMTcxIiwianRpIjoiOTRlY2JjMjc4YjgzNGJkZmEwNGU1ZjNjMGQ4ZmRmNjk4YmZmNWFkOTE3NDEyYTIxMjgxMTI5NjQwMjFhOTBjMmVkYjAwMTBjZGVmZTRmNjciLCJpYXQiOjE3NTE4Mjg5NzYuMjUzNDI4LCJuYmYiOjE3NTE4Mjg5NzYuMjUzNDI5LCJleHAiOjE3ODMzNjQ5NzYuMjUwMTUxLCJzdWIiOiI1OTUxIiwic2NvcGVzIjpbXX0.RIS-rcnMH8zmkpb6AXbESWdWxngXvxquiBn52HV9WNqih5jdI0qgAnBTW7yNr9__tx3-eXAKe3rbhve8xBWHoOnbI2LP0yQ6Gs9h9w15Dy6tbrFZykfqaEdNqeYy3KZr0uiRJEsANGq-kmv2BZDjR3V2sU6FjV0GgleIqrFcxHsn2pgIwueYSZcH-FFo47R0qGixuLlu9QuHROUjf2_jxlXPsBqoCXyZcuC12ivZCKxYMeQaHCet8QyT5rWRuVh0bZfwqTjp2rJoT23gBB2-bQecc-13ExuegyoNFwBp_RsSPZN9p73Ad1GMuxMlbpXYIEYTeo8CZbgM82pVDv-sk3YLNW2mayvMEMoydJkUpgOUrDkSVoQtWM4GCS0im4fbJ04b8Pr2KPTu0kSWgLVQK4zMwkl13GPClD8KqJUUSiKy7VQTyzMt0ywsb2aaWzg7VhQadLXpuPmsJ_TSciuK9eW0z4qLb-BaQVRBYlKSutGBPCfcl6wM3Oyija4WgCAkUBPdIiL740lmO2WUOI8x-tA92Gi-O6sYXK58HMhv4z9NtHi7GcHeuI8KH00G7FhtD_kDYTzonkeRFnUOzcGqsVIMsaPa6txlZtTCFKrgH-f6rI7h40GC5fi9dHXNenW2hMR3AUlWc3stQJeg9JV4ud-aQD0-2pOmCpM-kNvji8o";

  if (!apiKey) {
    console.warn("Lioren API key is not configured. Skipping API fetch.");
    return [];
  }

  try {
    const response = await fetch('https://api.lioren.cl/v1/productos', {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Lioren API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      throw new Error(`Error al conectar con la API de Lioren: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Robust check for the presence and type of the 'productos' array
    if (data && Array.isArray(data.productos)) {
      return data.productos as LiorenProduct[];
    } else {
      console.warn("Lioren API response did not contain a 'productos' array.", {responseData: data});
      return [];
    }

  } catch (error) {
    console.error("Failed to fetch inventory from Lioren:", error);
    // Return empty array on error to prevent crashing the app
    return [];
  }
}
