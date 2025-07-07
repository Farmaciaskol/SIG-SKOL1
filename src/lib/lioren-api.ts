
'use server';

// Define a type for the raw product from Lioren API
export interface LiorenStock {
  sucursal_id: number;
  nombre: string;
  stock: number;
}
export interface LiorenProduct {
  id: number;
  nombre: string;
  exento: number;
  codigo: string; // SKU
  unidad: string;
  param1: string;
  param2: string;
  param3: string;
  param4: string;
  descripcion?: string;
  activo: number;
  preciocompraneto: number;
  precioventabruto: number;
  cod_imp_venta: string;
  cod_imp_compra: string;
  peso: number;
  largo: string;
  ancho: string;
  alto: string;
  stocks: LiorenStock[];
  atributos: any[];
  otrosprecios: any[];
}

export async function fetchRawInventoryFromLioren(): Promise<LiorenProduct[]> {
  const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMTcxIiwianRpIjoiOTRlY2JjMjc4YjgzNGJkZmEwNGU1ZjNjMGQ4ZmRmNjk4YmZmNWFkOTE3NDEyYTIxMjgxMTI5NjQwMjFhOTBjMmVkYjAwMTBjZGVmZTRmNjciLCJpYXQiOjE3NTE4Mjg5NzYuMjUzNDI4LCJuYmYiOjE3NTE4Mjg5NzYuMjUzNDI5LCJleHAiOjE3ODMzNjQ5NzYuMjUwMTUxLCJzdWIiOiI1OTUxIiwic2NvcGVzIjpbXX0.RIS-rcnMH8zmkpb6AXbESWdWxngXvxquiBn52HV9WNqih5jdI0qgAnBTW7yNr9__tx3-eXAKe3rbhve8xBWHoOnbI2LP0yQ6Gs9h9w15Dy6tbrFZykfqaEdNqeYy3KZr0uiRJEsANGq-kmv2BZDjR3V2sU6FjV0GgleIqrFcxHsn2pgIwueYSZcH-FFo47R0qGixuLlu9QuHROUjf2_jxlXPsBqoCXyZcuC12ivZCKxYMeQaHCet8QyT5rWRuVh0bZfwqTjp2rJoT23gBB2-bQecc-13ExuegyoNFwBp_RsSPZN9p73Ad1GMuxMlbpXYIEYTeo8CZbgM82pVDv-sk3YLNW2mayvMEMoydJkUpgOUrDkSVoQtWM4GCS0im4fbJ04b8Pr2KPTu0kSWgLVQK4zMwkl13GPClD8KqJUUSiKy7VQTyzMt0ywsb2aaWzg7VhQadLXpuPmsJ_TSciuK9eW0z4qLb-BaQVRBYlKSutGBPCfcl6wM3Oyija4WgCAkUBPdIiL740lmO2WUOI8x-tA92Gi-O6sYXK58HMhv4z9NtHi7GcHeuI8KH00G7FhtD_kDYTzonkeRFnUOzcGqsVIMsaPa6txlZtTCFKrgH-f6rI7h40GC5fi9dHXNenW2hMR3AUlWc3stQJeg9JV4ud-aQD0-2pOmCpM-kNvji8o";

  if (!apiKey) {
    console.warn("[PRUEBA DE CONEXIÓN] Lioren API key is not configured. Skipping API fetch.");
    return [];
  }

  try {
    console.log("[PRUEBA DE CONEXIÓN] Intentando conectar a la API de Lioren...");
    const response = await fetch('https://www.lioren.cl/api/productos', {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      cache: 'no-store' // Prevent caching of failed requests
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.warn(`[PRUEBA DE CONEXIÓN] Lioren API error: ${response.status} ${response.statusText}`);
      console.warn(`[PRUEBA DE CONEXIÓN] Lioren API response body: ${responseBody}`);
      return [];
    }

    const data = await response.json();
    
    // Check if the response is an array directly
    if (Array.isArray(data)) {
      console.log(`[PRUEBA DE CONEXIÓN] ¡Éxito! Se obtuvieron ${data.length} productos desde la API de Lioren.`);
      return data as LiorenProduct[];
    } 
    // Fallback for the old format, just in case
    else if (data && Array.isArray(data['*'])) {
      console.log(`[PRUEBA DE CONEXIÓN] ¡Éxito! Se obtuvieron ${data['*'].length} productos desde la API de Lioren (formato con clave '*').`);
      return data['*'] as LiorenProduct[];
    } 
    // Handle unexpected formats
    else {
      console.warn("[PRUEBA DE CONEXIÓN] La API de Lioren respondió correctamente, pero en un formato inesperado. No se encontró un array de productos. Respuesta recibida:", data);
      return [];
    }

  } catch (error) {
    console.error("[PRUEBA DE CONEXIÓN] Falló el fetch a la API de Lioren. El API podría estar inalcanzable o hay un problema de red.", error);
    return [];
  }
}
