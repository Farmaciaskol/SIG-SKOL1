
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { simplifyInstructions } from '@/ai/flows/simplify-instructions';
import { Wand2, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const simplifySchema = z.object({
  originalInstructions: z.string().min(10, { message: 'Por favor, ingrese al menos 10 caracteres.' }),
});

type SimplifyFormValues = z.infer<typeof simplifySchema>;

export default function SimplifyInstructionsPage() {
  const { toast } = useToast();
  const [simplifiedText, setSimplifiedText] = useState('');
  const [isSimplifying, setIsSimplifying] = useState(false);

  const form = useForm<SimplifyFormValues>({
    resolver: zodResolver(simplifySchema),
  });

  const onSubmit = async (data: SimplifyFormValues) => {
    setIsSimplifying(true);
    setSimplifiedText('');
    try {
      const result = await simplifyInstructions(data.originalInstructions);
      setSimplifiedText(result);
      toast({
        title: 'Instrucciones Simplificadas',
        description: 'El texto ha sido procesado por la IA.',
      });
    } catch (error) {
      console.error('Failed to simplify instructions:', error);
      toast({
        title: 'Error de IA',
        description: `No se pudo simplificar el texto. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    } finally {
      setIsSimplifying(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-headline">Simplificador de Indicaciones</h1>
          <p className="text-sm text-muted-foreground">
            Herramienta con IA para convertir instrucciones médicas complejas en un lenguaje fácil de entender.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Column */}
            <div className="space-y-4">
               <h2 className="text-xl font-semibold text-slate-700">Texto Original</h2>
               <p className="text-sm text-muted-foreground">Pegue aquí las instrucciones médicas que desea simplificar.</p>
               <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="originalInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Ej: Administrar 1 comprimido por vía oral cada 8 horas, preferentemente con alimentos, por un período no inferior a 7 días, aun cuando los síntomas hayan remitido..."
                            className="min-h-[250px] text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSimplifying} className="w-full">
                    {isSimplifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {isSimplifying ? 'Procesando...' : 'Simplificar con IA'}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Output Column */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-700">Texto Simplificado</h2>
                <p className="text-sm text-muted-foreground">La versión para el paciente aparecerá aquí.</p>
                <div className="min-h-[250px] w-full rounded-md border bg-muted/50 p-4">
                    {isSimplifying ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Generando texto...</span>
                        </div>
                    ) : simplifiedText ? (
                        <p className="text-base whitespace-pre-wrap">{simplifiedText}</p>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            <p>El resultado aparecerá aquí.</p>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
