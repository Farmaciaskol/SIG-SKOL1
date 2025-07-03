'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, UploadCloud, Wand2 } from 'lucide-react';

// Firebase Imports
import { db, storage } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

// Genkit Flow Import
import { testFlow } from '@/ai/flows/test-flow';

export default function TestPage() {
  const { toast } = useToast();

  // State for Database Test
  const [dbLoading, setDbLoading] = useState(false);
  const [dbResult, setDbResult] = useState('');

  // State for Storage Test
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageResult, setStorageResult] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // State for Gemini Test
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiResult, setGeminiResult] = useState('');
  const [geminiPrompt, setGeminiPrompt] = useState('Describe la importancia de la farmacia clínica en 30 palabras.');

  const handleDatabaseTest = async () => {
    setDbLoading(true);
    setDbResult('');
    if (!db) {
        toast({ title: 'Error', description: 'Firestore no está inicializado.', variant: 'destructive' });
        setDbLoading(false);
        return;
    }
    try {
      const testDocRef = doc(db, 'test_collection', `test_doc_${Date.now()}`);
      await setDoc(testDocRef, {
        message: 'Hello from Firebase Studio!',
        createdAt: serverTimestamp(),
      });
      const successMsg = `Documento escrito exitosamente en 'test_collection' con ID: ${testDocRef.id}`;
      setDbResult(successMsg);
      toast({ title: 'Éxito en Base de Datos', description: successMsg });
    } catch (error) {
      console.error(error);
      const errorMsg = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
      setDbResult(`Error: ${errorMsg}`);
      toast({ title: 'Error en Base de Datos', description: errorMsg, variant: 'destructive' });
    } finally {
      setDbLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToUpload(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleStorageTest = async () => {
    if (!fileToUpload || !previewImage) {
      toast({ title: 'Atención', description: 'Por favor, seleccione un archivo para subir.', variant: 'default' });
      return;
    }
    setStorageLoading(true);
    setStorageResult('');
     if (!storage) {
        toast({ title: 'Error', description: 'Firebase Storage no está inicializado.', variant: 'destructive' });
        setStorageLoading(false);
        return;
    }
    try {
      const storageRef = ref(storage, `test-uploads/${Date.now()}-${fileToUpload.name}`);
      const uploadResult = await uploadString(storageRef, previewImage, 'data_url');
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      
      const successMsg = `Archivo subido exitosamente. URL: ${downloadUrl}`;
      setStorageResult(successMsg);
      toast({ title: 'Éxito en Storage', description: 'El archivo se ha subido correctamente.' });
    } catch (error: any) {
      console.error("Storage test failed:", error);
      let errorMsg = 'Ocurrió un error desconocido al intentar subir el archivo.';
      if (error.code) {
        switch (error.code) {
          case 'storage/unauthorized':
            errorMsg = "Error de autorización: No tiene permiso para subir archivos. Verifique que está autenticado y que las reglas de Firebase Storage lo permiten.";
            break;
          case 'storage/object-not-found':
          case 'storage/bucket-not-found':
            errorMsg = "Error de configuración: El bucket de almacenamiento no parece estar configurado correctamente en su proyecto de Firebase.";
            break;
          case 'storage/quota-exceeded':
            errorMsg = "Ha excedido su cuota de almacenamiento de Firebase.";
            break;
          default:
            errorMsg = `Ocurrió un error inesperado (${error.code}). Por favor, revise la consola para más detalles.`;
        }
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      setStorageResult(`Error: ${errorMsg}`);
      toast({ title: 'Error en Storage', description: errorMsg, variant: 'destructive' });
    } finally {
      setStorageLoading(false);
    }
  };

  const handleGeminiTest = async () => {
    setGeminiLoading(true);
    setGeminiResult('');
    try {
        const response = await testFlow(geminiPrompt);
        setGeminiResult(response);
        toast({ title: 'Éxito en Gemini', description: 'La IA ha respondido.' });
    } catch (error) {
        console.error(error);
        const errorMsg = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        setGeminiResult(`Error: ${errorMsg}`);
        toast({ title: 'Error de IA', description: errorMsg, variant: 'destructive' });
    } finally {
        setGeminiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Página de Pruebas</h1>
        <p className="text-sm text-muted-foreground">
          Use esta página para verificar las integraciones clave de la aplicación.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Database Test Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database/>Prueba de Base de Datos</CardTitle>
            <CardDescription>Escribe un documento en Firestore.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleDatabaseTest} disabled={dbLoading}>
              {dbLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Escribir en Firestore
            </Button>
            {dbResult && <pre className="mt-4 text-xs bg-muted p-2 rounded-md whitespace-pre-wrap">{dbResult}</pre>}
          </CardContent>
        </Card>

        {/* Storage Test Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UploadCloud/>Prueba de Storage</CardTitle>
            <CardDescription>Sube un archivo a Firebase Storage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept="image/*" onChange={handleFileChange} />
            <Button onClick={handleStorageTest} disabled={storageLoading || !fileToUpload}>
              {storageLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Subir a Storage
            </Button>
            {storageResult && <pre className="mt-4 text-xs bg-muted p-2 rounded-md whitespace-pre-wrap break-all">{storageResult}</pre>}
          </CardContent>
        </Card>

        {/* Gemini Test Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wand2/>Prueba de Gemini</CardTitle>
            <CardDescription>Envía un prompt a la IA de Gemini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              value={geminiPrompt} 
              onChange={(e) => setGeminiPrompt(e.target.value)}
              placeholder="Escribe tu prompt aquí..."
            />
            <Button onClick={handleGeminiTest} disabled={geminiLoading}>
              {geminiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Preguntar a Gemini
            </Button>
            {geminiResult && <p className="mt-4 text-sm bg-muted p-2 rounded-md">{geminiResult}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
