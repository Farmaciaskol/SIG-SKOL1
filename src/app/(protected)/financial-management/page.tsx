'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  getRecipes,
  getExternalPharmacies,
  Recipe,
  ExternalPharmacy,
  RecipeStatus
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Banknote, FileText, CheckCircle2, Loader2, CircleDollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

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

type PharmacyFinancials = {
  pharmacyId: string;
  pharmacyName: string;
  pendingBalance: number;
  paidAmount: number;
  pendingRecipes: Recipe[];
};

export default function FinancialManagementPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pharmacies, setPharmacies] = useState<ExternalPharmacy[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipesData, pharmaciesData] = await Promise.all([
        getRecipes(),
        getExternalPharmacies(),
      ]);
      setRecipes(recipesData);
      setPharmacies(pharmaciesData);
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
      toast({
        title: 'Error de Carga',
        description: 'No se pudieron cargar los datos financieros.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const financialDataByPharmacy = useMemo<PharmacyFinancials[]>(() => {
    if (!pharmacies.length || !recipes.length) return [];

    return pharmacies.map(pharmacy => {
      const pharmacyRecipes = recipes.filter(r => r.externalPharmacyId === pharmacy.id);
      
      const pendingRecipes = pharmacyRecipes.filter(r => r.paymentStatus === 'Pendiente' && r.status !== RecipeStatus.Cancelled && r.status !== RecipeStatus.Rejected);
      const pendingBalance = pendingRecipes.reduce((acc, r) => acc + (r.preparationCost || 0), 0);
      
      const paidAmount = pharmacyRecipes
        .filter(r => r.paymentStatus === 'Pagado')
        .reduce((acc, r) => acc + (r.preparationCost || 0), 0);
        
      return {
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        pendingBalance,
        paidAmount,
        pendingRecipes,
      };
    }).filter(p => p.pendingBalance > 0 || p.paidAmount > 0); // Only show pharmacies with financial activity
  }, [recipes, pharmacies]);

  const globalStats = useMemo(() => {
    const totalPending = financialDataByPharmacy.reduce((acc, p) => acc + p.pendingBalance, 0);
    const totalPaid = financialDataByPharmacy.reduce((acc, p) => acc + p.paidAmount, 0);
    const totalRecipesWithCost = recipes.filter(r => r.preparationCost && r.preparationCost > 0).length;

    return {
      totalPending: `$${totalPending.toLocaleString('es-CL')}`,
      totalPaid: `$${totalPaid.toLocaleString('es-CL')}`,
      totalRecipesWithCost,
      pharmaciesWithDebt: financialDataByPharmacy.filter(p => p.pendingBalance > 0).length,
    };
  }, [financialDataByPharmacy, recipes]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-slate-600">Cargando datos financieros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-headline">Gestión Financiera</h1>
          <p className="text-sm text-muted-foreground">
            Control de costos y pagos a recetarios externos.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Saldo Pendiente Total" value={globalStats.totalPending} icon={Banknote} />
        <StatCard title="Total Pagado (Histórico)" value={globalStats.totalPaid} icon={CheckCircle2} />
        <StatCard title="Recetarios con Saldo" value={globalStats.pharmaciesWithDebt} icon={FileText} />
        <StatCard title="Total Recetas con Costo" value={globalStats.totalRecipesWithCost} icon={FileText} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Saldos por Recetario</CardTitle>
          <CardDescription>
            Revisa las recetas pendientes de pago para cada socio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {financialDataByPharmacy.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {financialDataByPharmacy.map(data => (
                <AccordionItem value={data.pharmacyId} key={data.pharmacyId} className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="text-lg font-semibold text-slate-700 hover:no-underline px-6 py-4 bg-muted/50 data-[state=open]:border-b">
                        <div className="flex justify-between items-center w-full pr-4">
                            <span>{data.pharmacyName}</span>
                            <Badge variant={data.pendingBalance > 0 ? "destructive" : "default"}>
                                Saldo: ${data.pendingBalance.toLocaleString('es-CL')}
                            </Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 pt-4 space-y-4">
                        {data.pendingRecipes.length > 0 ? (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead>ID Receta</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Estado Receta</TableHead>
                                        <TableHead className="text-right">Costo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.pendingRecipes.map(recipe => (
                                        <TableRow key={recipe.id}>
                                            <TableCell className="font-mono">
                                                <Link href={`/recipes/${recipe.id}`} className="text-primary hover:underline">{recipe.id}</Link>
                                            </TableCell>
                                            <TableCell>{format(new Date(recipe.createdAt), "d MMM, yyyy", { locale: es })}</TableCell>
                                            <TableCell><Badge variant="secondary">{recipe.status}</Badge></TableCell>
                                            <TableCell className="text-right">${(recipe.preparationCost || 0).toLocaleString('es-CL')}</TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="flex justify-end pt-4">
                                    <Button disabled>
                                        <CircleDollarSign className="mr-2 h-4 w-4" />
                                        Registrar Pago (Próximamente)
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">Este recetario no tiene saldos pendientes.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700">¡Todo al día!</h3>
                <p className="text-muted-foreground mt-2">
                    No hay saldos pendientes de pago con ningún recetario.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
