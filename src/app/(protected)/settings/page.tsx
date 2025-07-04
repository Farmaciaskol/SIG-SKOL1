

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAppSettings, updateAppSettings } from '@/lib/data';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Save, X } from 'lucide-react';

const settingsSchema = z.object({
  pharmaceuticalForms: z.array(z.string()),
  concentrationUnits: z.array(z.string()),
  dosageUnits: z.array(z.string()),
  treatmentDurationUnits: z.array(z.string()),
  quantityToPrepareUnits: z.array(z.string()),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const SettingsListEditor = ({
  title,
  values,
  onAdd,
  onRemove,
}: {
  title: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {values.map((value, index) => (
            <Badge key={index} variant="secondary" className="text-sm font-normal py-1 pr-1">
              {value}
              <button onClick={() => onRemove(index)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Añadir nuevo valor..."
          />
          <Button type="button" size="icon" onClick={handleAdd}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Partial<AppSettings>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAppSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las configuraciones.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleUpdateList = (key: keyof AppSettings, newList: string[]) => {
      setSettings(prev => ({...prev, [key]: newList }));
  }
  
  const handleSaveSettings = async () => {
      setIsSaving(true);
      try {
          await updateAppSettings(settings);
          toast({ title: 'Configuración Guardada', description: 'Los cambios han sido guardados exitosamente.' });
          fetchData();
      } catch(error) {
          toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
      } finally {
          setIsSaving(false);
      }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando configuraciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Configuración del Sistema</h1>
            <p className="text-sm text-muted-foreground">
              Personalice los valores de los formularios de la aplicación.
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Cambios
          </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SettingsListEditor 
            title="Formas Farmacéuticas"
            values={settings.pharmaceuticalForms || []}
            onAdd={(val) => handleUpdateList('pharmaceuticalForms', [...(settings.pharmaceuticalForms || []), val])}
            onRemove={(index) => handleUpdateList('pharmaceuticalForms', (settings.pharmaceuticalForms || []).filter((_, i) => i !== index))}
          />
           <SettingsListEditor 
            title="Unidades de Concentración"
            values={settings.concentrationUnits || []}
            onAdd={(val) => handleUpdateList('concentrationUnits', [...(settings.concentrationUnits || []), val])}
            onRemove={(index) => handleUpdateList('concentrationUnits', (settings.concentrationUnits || []).filter((_, i) => i !== index))}
          />
           <SettingsListEditor 
            title="Unidades de Dosis"
            values={settings.dosageUnits || []}
            onAdd={(val) => handleUpdateList('dosageUnits', [...(settings.dosageUnits || []), val])}
            onRemove={(index) => handleUpdateList('dosageUnits', (settings.dosageUnits || []).filter((_, i) => i !== index))}
          />
           <SettingsListEditor 
            title="Unidades de Duración de Tratamiento"
            values={settings.treatmentDurationUnits || []}
            onAdd={(val) => handleUpdateList('treatmentDurationUnits', [...(settings.treatmentDurationUnits || []), val])}
            onRemove={(index) => handleUpdateList('treatmentDurationUnits', (settings.treatmentDurationUnits || []).filter((_, i) => i !== index))}
          />
           <SettingsListEditor 
            title="Unidades de Cantidad a Preparar"
            values={settings.quantityToPrepareUnits || []}
            onAdd={(val) => handleUpdateList('quantityToPrepareUnits', [...(settings.quantityToPrepareUnits || []), val])}
            onRemove={(index) => handleUpdateList('quantityToPrepareUnits', (settings.quantityToPrepareUnits || []).filter((_, i) => i !== index))}
          />
      </div>

    </div>
  );
}
