
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  getRecipes,
  getExternalPharmacies,
  registerPaymentForPharmacy,
} from '@/lib/data';
import type { Recipe, ExternalPharmacy } from '@/lib/types';
import { RecipeStatus } from '@/lib/types';
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
  TableFooter as UiTableFooter,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Banknote, FileText, CheckCircle2, Loader2, CircleDollarSign, HandCoins, Receipt } from 'lucide-react';
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
  totalPreparationCost: number;
  totalTransportCost: number;
};

export default function FinancialManagementPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pharmacies, setExternalPharmacies] = useState<ExternalPharmacy[]>([]);
  
  const [pharmacyToPay, setPharmacyToPay] = useState<PharmacyFinancials | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipesData, pharmaciesData] = await Promise.all([
        getRecipes(),
        getExternalPharmacies(),
      ]);
      setRecipes(recipesData);
      setExternalPharmacies(pharmaciesData);
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
    if (!pharmacies.length) return [];

    return pharmacies.map(pharmacy => {
      const pharmacyRecipes = recipes.filter(r => r.externalPharmacyId === pharmacy.id);
      
      const pendingRecipes = pharmacyRecipes.filter(r => r.paymentStatus === 'Pendiente' && r.status !== RecipeStatus.Cancelled && r.status !== RecipeStatus.Rejected);
      const totalPreparationCost = pendingRecipes.reduce((acc, r) => acc + (r.preparationCost || 0), 0);
      const totalTransportCost = pendingRecipes.reduce((acc, r) => acc + (r.transportCost || 0), 0);
      const pendingBalance = totalPreparationCost + totalTransportCost;
      
      const paidAmount = pharmacyRecipes
        .filter(r => r.paymentStatus === 'Pagado')
        .reduce((acc, r) => acc + (r.preparationCost || 0) + (r.transportCost || 0), 0);
        
      return {
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        pendingBalance,
        paidAmount,
        pendingRecipes,
        totalPreparationCost,
        totalTransportCost,
      };
    }).filter(p => p.pendingBalance > 0 || p.paidAmount > 0); // Only show pharmacies with financial activity
  }, [recipes, pharmacies]);

  const globalStats = useMemo(() => {
    const totalPending = financialDataByPharmacy.reduce((acc, p) => acc + p.pendingBalance, 0);
    const totalPaid = financialDataByPharmacy.reduce((acc, p) => acc + p.paidAmount, 0);

    return {
      totalPorPagar: `$${totalPending.toLocaleString('es-CL')}`,
      totalPorCobrar: "$0", // Placeholder for Accounts Receivable
      totalPagado: `$${totalPaid.toLocaleString('es-CL')}`,
      pharmaciesWithDebt: financialDataByPharmacy.filter(p => p.pendingBalance > 0).length,
    };
  }, [financialDataByPharmacy]);
  
  const handleConfirmPayment = async () => {
    if (!pharmacyToPay) return;
    setIsPaying(true);
    try {
        const recipeIdsToPay = pharmacyToPay.pendingRecipes.map(r => r.id);
        await registerPaymentForPharmacy(recipeIdsToPay);
        toast({
            title: "Pago Registrado",
            description: `Se ha registrado el pago para ${pharmacyToPay.pharmacyName}.`,
        });
        fetchData();
        setPharmacyToPay(null);
    } catch (error) {
        toast({
            title: "Error al Registrar Pago",
            description: `No se pudo completar la operación. ${error instanceof Error ? error.message : ''}`,
            variant: 'destructive'
        });
    } finally {
        setIsPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-slate-600">Cargando datos financieros...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-headline">Gestión Financiera</h1>
            <p className="text-sm text-muted-foreground">
              Control de cuentas por pagar (a recetarios) y por cobrar.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total por Pagar" value={globalStats.totalPorPagar} icon={HandCoins} />
          <StatCard title="Total por Cobrar" value={globalStats.totalPorCobrar} icon={Receipt} />
          <StatCard title="Total Pagado a Recetarios" value={globalStats.totalPagado} icon={CheckCircle2} />
          <StatCard title="Recetarios con Deuda" value={globalStats.pharmaciesWithDebt} icon={FileText} />
        </div>
        
        <Tabs defaultValue="cuentas-por-pagar" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
                <TabsTrigger value="cuentas-por-pagar">Cuentas por Pagar</TabsTrigger>
                <TabsTrigger value="cuentas-por-cobrar">Cuentas por Cobrar</TabsTrigger>
            </TabsList>
            <TabsContent value="cuentas-por-pagar" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Pagos Pendientes a Recetarios</CardTitle>
                        <CardDescription>
                            Detalle de los montos adeudados a cada recetario socio por preparaciones y despachos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {financialDataByPharmacy.filter(p => p.pendingBalance > 0).length > 0 ? (
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            {financialDataByPharmacy.filter(p => p.pendingBalance > 0).map(data => (
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
                                    <Table>
                                        <TableHeader><TableRow><TableHead>ID Receta</TableHead><TableHead>Fecha</TableHead><TableHead>Estado Receta</TableHead><TableHead className="text-right">Costo Prep.</TableHead><TableHead className="text-right">Costo Despacho</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {data.pendingRecipes.map(recipe => (
                                            <TableRow key={recipe.id}>
                                                <TableCell className="font-mono"><Link href={`/recipes/${recipe.id}`} className="text-primary hover:underline">{recipe.id}</Link></TableCell>
                                                <TableCell>{format(new Date(recipe.createdAt), "d MMM, yyyy", { locale: es })}</TableCell>
                                                <TableCell><Badge variant="secondary">{recipe.status}</Badge></TableCell>
                                                <TableCell className="text-right">${(recipe.preparationCost || 0).toLocaleString('es-CL')}</TableCell>
                                                <TableCell className="text-right">${(recipe.transportCost || 0).toLocaleString('es-CL')}</TableCell>
                                            </TableRow>
                                            ))}
                                        </TableBody>
                                        <UiTableFooter><TableRow><TableCell colSpan={3} className="font-bold text-right text-slate-700">TOTALES</TableCell><TableCell className="font-bold text-right text-slate-700">${data.totalPreparationCost.toLocaleString('es-CL')}</TableCell><TableCell className="font-bold text-right text-slate-700">${data.totalTransportCost.toLocaleString('es-CL')}</TableCell></TableRow></UiTableFooter>
                                    </Table>
                                    <div className="flex justify-end pt-4">
                                        <Button onClick={() => setPharmacyToPay(data)} disabled={data.pendingRecipes.length === 0 || isPaying}>
                                            <CircleDollarSign className="mr-2 h-4 w-4" />
                                            Registrar Pago
                                        </Button>
                                    </div>
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
            </TabsContent>
            <TabsContent value="cuentas-por-cobrar" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Cuentas por Cobrar a Pacientes/Entidades</CardTitle>
                        <CardDescription>
                            Este módulo gestionará las deudas de pacientes o entidades hacia la farmacia.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-16 border-2 border-dashed rounded-lg">
                            <Banknote className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700">Módulo en Desarrollo</h3>
                            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                La funcionalidad para gestionar las cuentas por cobrar estará disponible en una futura actualización.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!pharmacyToPay} onOpenChange={(open) => !open && setPharmacyToPay(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Pago a {pharmacyToPay?.pharmacyName}</AlertDialogTitle>
                <AlertDialogDescription>
                    Se registrará el pago de ${pharmacyToPay?.pendingBalance.toLocaleString('es-CL')} correspondiente a {pharmacyToPay?.pendingRecipes.length} receta(s). Esta acción actualizará el estado de las recetas a "Pagado" y es irreversible.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPharmacyToPay(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmPayment} disabled={isPaying}>
                    {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Pago
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
