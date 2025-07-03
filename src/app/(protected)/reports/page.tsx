
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  getRecipes,
  getInventory,
  getControlledSubstanceLog,
} from '@/lib/data';
import type {
  Recipe,
  InventoryItem,
  ControlledSubstanceLogEntry
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Banknote, Package, BookLock, FileSpreadsheet, BarChart, UserCheck, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import React from 'react';

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-700">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
    </CardContent>
  </Card>
);

const ReportCard = ({ title, description, icon: Icon, actionText, onAction, disabled = false, isLoading = false }: { title:string, description: string, icon: React.ElementType, actionText: string, onAction: () => void, disabled?: boolean, isLoading?: boolean }) => (
    <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle className="text-lg font-bold text-slate-800">{title}</CardTitle>
                <CardDescription className="mt-1 text-sm">{description}</CardDescription>
            </div>
        </CardHeader>
        <CardFooter className="mt-auto bg-muted/50 p-3">
             <Button onClick={onAction} className="w-full" disabled={disabled || isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isLoading ? 'Generando...' : actionText}
            </Button>
        </CardFooter>
    </Card>
);

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [controlledLog, setControlledLog] = useState<ControlledSubstanceLogEntry[]>([]);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipesData, inventoryData, controlledLogData] = await Promise.all([
        getRecipes(),
        getInventory(),
        getControlledSubstanceLog(),
      ]);
      setRecipes(recipesData);
      setInventory(inventoryData);
      setControlledLog(controlledLogData);
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
      toast({
        title: 'Error de Carga',
        description: 'No se pudieron cargar los datos para los reportes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const globalStats = useMemo(() => {
    const totalPreparationCost = recipes.reduce((sum, recipe) => sum + (recipe.preparationCost || 0), 0);
    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);

    return {
      totalRecipes: recipes.length,
      totalControlledDispensations: controlledLog.length,
      totalPreparationCost: `$${totalPreparationCost.toLocaleString('es-CL')}`,
      totalInventoryValue: `$${totalInventoryValue.toLocaleString('es-CL')}`,
    };
  }, [recipes, inventory, controlledLog]);

  const handleGenerateInventoryReport = () => {
    setIsGeneratingReport(true);
    try {
      const headers = [
        "ID Producto", "Nombre Producto", "SKU", "Stock Total Producto", "Unidad",
        "N° Lote", "Cantidad Lote", "Vencimiento Lote"
      ];
      
      const csvRows = [headers.join(',')];

      inventory.forEach(item => {
        if (item.lots && item.lots.length > 0) {
          item.lots.forEach(lot => {
            const row = [
              `"${item.id}"`,
              `"${item.name.replace(/"/g, '""')}"`,
              `"${item.sku || ''}"`,
              item.quantity,
              `"${item.unit}"`,
              `"${lot.lotNumber}"`,
              lot.quantity,
              `"${format(parseISO(lot.expiryDate), 'dd-MM-yyyy')}"`
            ];
            csvRows.push(row.join(','));
          });
        } else {
          const row = [
            `"${item.id}"`,
            `"${item.name.replace(/"/g, '""')}"`,
            `"${item.sku || ''}"`,
            item.quantity,
            `"${item.unit}"`,
            '"N/A"',
            '"N/A"',
            '"N/A"'
          ];
          csvRows.push(row.join(','));
        }
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const dateStamp = format(new Date(), 'yyyy-MM-dd');
      link.setAttribute('download', `inventario_skol_${dateStamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Reporte Generado',
        description: 'La descarga del informe de inventario ha comenzado.',
      });

    } catch (error) {
      console.error("Failed to generate inventory report:", error);
      toast({
        title: 'Error al Generar Reporte',
        description: 'No se pudo crear el archivo CSV.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGeneratePlaceholderReport = (reportName: string) => {
    toast({
        title: `Generando ${reportName}`,
        description: 'Esta funcionalidad estará disponible próximamente.',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-slate-600">Cargando central de reportes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-headline">Central de Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Genere informes y analice datos clave de la operación.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Recetas Totales Procesadas" value={globalStats.totalRecipes} icon={FileText} />
        <StatCard title="Dispensaciones Controladas" value={globalStats.totalControlledDispensations} icon={BookLock} />
        <StatCard title="Valor Total del Inventario" value={globalStats.totalInventoryValue} icon={Package} />
        <StatCard title="Costo Total de Preparaciones" value={globalStats.totalPreparationCost} icon={Banknote} />
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800 font-headline mb-4">Informes Disponibles</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ReportCard 
                title="Informe de Inventario"
                description="Exporte un listado completo del inventario actual, incluyendo detalles de lotes, cantidades y fechas de vencimiento."
                icon={FileSpreadsheet}
                actionText="Generar CSV"
                onAction={handleGenerateInventoryReport}
                isLoading={isGeneratingReport}
            />
             <ReportCard 
                title="Informe Financiero"
                description="Desglose de costos de preparación, pagos realizados y saldos pendientes por cada recetario externo."
                icon={BarChart}
                actionText="Generar Reporte (Próximamente)"
                onAction={() => handleGeneratePlaceholderReport('Informe Financiero')}
                disabled={true}
            />
             <ReportCard 
                title="Libro de Control de Sustancias"
                description="Exporte el registro oficial de dispensación de psicotrópicos y estupefacientes para auditorías."
                icon={BookLock}
                actionText="Generar PDF (Próximamente)"
                onAction={() => handleGeneratePlaceholderReport('Libro de Control de Sustancias')}
                disabled={true}
            />
             <ReportCard 
                title="Análisis por Médico"
                description="Visualice la cantidad de recetas y tipos de preparados por cada médico prescriptor."
                icon={UserCheck}
                actionText="Ver Análisis (Próximamente)"
                onAction={() => handleGeneratePlaceholderReport('Análisis por Médico')}
                disabled={true}
            />
        </div>
      </div>
    </div>
  );
}
