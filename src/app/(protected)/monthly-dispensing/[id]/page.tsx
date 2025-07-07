
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getMonthlyDispensationBox,
  updateMonthlyDispensationBox,
  getPatient,
} from '@/lib/data';
import type {
  MonthlyDispensationBox,
  Patient,
  DispensationItem,
} from '@/lib/types';
import {
  DispensationItemStatus,
  MonthlyDispensationBoxStatus,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, Loader2, User, Calendar, CheckCircle, AlertTriangle, XCircle, Printer, Box, Save, Package, PackageCheck } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

const itemStatusConfig: Record<DispensationItemStatus, { text: string; icon: React.ElementType; color: string }> = {
  [DispensationItemStatus.OkToInclude]: { text: 'OK para Incluir', icon: CheckCircle, color: 'text-green-500' },
  [DispensationItemStatus.RequiresAttention]: { text: 'Requiere Atención', icon: AlertTriangle, color: 'text-orange-500' },
  [DispensationItemStatus.DoNotInclude]: { text: 'No Incluir', icon: XCircle, color: 'text-red-500' },
  [DispensationItemStatus.ManuallyAdded]: { text: 'Añadido Manualmente', icon: CheckCircle, color: 'text-blue-500' },
};

const DispenseConfirmationDialog = ({ 
  isOpen, 
  onOpenChange, 
  onConfirm,
  isSaving,
  retrieverName,
  setRetrieverName,
  retrieverRut,
  setRetrieverRut,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isSaving: boolean;
    retrieverName: string;
    setRetrieverName: (value: string) => void;
    retrieverRut: string;
    setRetrieverRut: (value: string) => void;
}) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Dispensación</AlertDialogTitle>
                <AlertDialogDescription>
                    Ingrese los datos de la persona que retira la caja. Esta acción es irreversible.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="retriever-name">Nombre de quien retira *</Label>
                    <Input id="retriever-name" value={retrieverName} onChange={(e) => setRetrieverName(e.target.value)} placeholder="Nombre completo" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="retriever-rut">RUT de quien retira *</Label>
                    <Input id="retriever-rut" value={retrieverRut} onChange={(e) => setRetrieverRut(e.target.value)} placeholder="XX.XXX.XXX-X" />
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm} disabled={isSaving || !retrieverName || !retrieverRut}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Dispensar
                </AlertDialogAction>
            </AlertDialogFooter>
        </DialogContent>
    </Dialog>
);

const PrintLabelDialog = ({
    isOpen,
    onOpenChange,
    box,
    patient,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    box: MonthlyDispensationBox | null;
    patient: Patient | null;
}) => {
    const handlePrint = () => {
        setTimeout(() => { window.print(); }, 100);
    };

    if (!box || !patient) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="printable-label">
                <div className="p-6 space-y-4">
                     <h2 className="text-xl font-bold text-center">FARMACIA SKOL</h2>
                     <Separator />
                     <div className="text-center">
                        <p className="font-semibold text-lg">{patient.name}</p>
                        <p className="text-sm">{patient.rut}</p>
                     </div>
                     <Separator />
                     <div>
                        <p className="font-semibold">Contenido:</p>
                        <ul className="list-disc list-inside text-sm">
                            {box.items.filter(i => i.status === 'OK para Incluir' || i.status === 'Añadido Manualmente').map(item => (
                                <li key={item.id}>{item.name}</li>
                            ))}
                        </ul>
                     </div>
                     <Separator />
                     <p className="text-sm"><span className="font-semibold">Período:</span> {format(parse(box.period, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: es })}</p>
                </div>
                 <DialogFooter className="p-4 border-t no-print">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cerrar</Button>
                    </DialogClose>
                    <Button type="button" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function DispensationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [box, setBox] = useState<MonthlyDispensationBox | null>(null);
  const [originalBox, setOriginalBox] = useState<MonthlyDispensationBox | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // States for dialogs
  const [isDispenseDialogOpen, setIsDispenseDialogOpen] = useState(false);
  const [retrieverName, setRetrieverName] = useState('');
  const [retrieverRut, setRetrieverRut] = useState('');
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const boxData = await getMonthlyDispensationBox(id);
      if (boxData) {
        setBox(boxData);
        setOriginalBox(JSON.parse(JSON.stringify(boxData))); // Deep copy for comparison
        const patientData = await getPatient(boxData.patientId);
        setPatient(patientData);
      } else {
        toast({ title: 'Error', description: 'Caja de dispensación no encontrada.', variant: 'destructive' });
        router.push('/monthly-dispensing');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({ title: 'Error de Carga', description: 'No se pudieron cargar los datos de la caja.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, toast, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleItemChange = <T extends keyof DispensationItem>(itemId: string, field: T, value: DispensationItem[T]) => {
    setBox(prevBox => {
      if (!prevBox) return null;
      return {
        ...prevBox,
        items: prevBox.items.map(item =>
          item.id === itemId ? { ...item, [field]: value } : item
        ),
      };
    });
  };
  
  const saveProgress = async () => {
      if (!box) return;
      setIsSaving(true);
      try {
          await updateMonthlyDispensationBox(box.id, { items: box.items });
          toast({ title: 'Progreso Guardado', description: 'Los cambios en la caja han sido guardados.' });
          fetchData(); // Refreshes originalBox as well
      } catch (error) {
           console.error('Failed to save changes:', error);
           toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
      } finally {
          setIsSaving(false);
      }
  }

  const handleMarkAsReadyClick = () => {
    if (!box) return;
    const itemsWithIssues = box.items.filter(i => i.status === DispensationItemStatus.RequiresAttention).length;
    if (itemsWithIssues > 0) {
      setShowConfirmation(true);
    } else {
      handleConfirmReadyForPickup();
    }
  };

  const handleConfirmReadyForPickup = async () => {
    if (!box) return;
    setIsSaving(true);
    setShowConfirmation(false);
    try {
      await updateMonthlyDispensationBox(box.id, { 
        items: box.items, 
        status: MonthlyDispensationBoxStatus.ReadyForPickup 
      });
      toast({ title: 'Caja Lista para Retiro', description: 'El estado de la caja ha sido actualizado.' });
      fetchData();
    } catch (error) {
      console.error('Failed to mark as ready:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el estado de la caja.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDispenseBox = async () => {
    if (!box || !retrieverName || !retrieverRut) return;
    setIsSaving(true);
    try {
      await updateMonthlyDispensationBox(box.id, {
        status: MonthlyDispensationBoxStatus.Dispensed,
        dispensedAt: new Date().toISOString(),
        retrievedBy_Name: retrieverName,
        retrievedBy_RUT: retrieverRut,
      });
      toast({ title: "Caja Dispensada", description: "La dispensación ha sido registrada." });
      setIsDispenseDialogOpen(false);
      fetchData();
    } catch (error) {
       console.error('Failed to dispense box:', error);
       toast({ title: 'Error', description: 'No se pudo registrar la dispensación.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando mesa de trabajo...</p>
      </div>
    );
  }
  
  if (!box || !patient) {
      return null;
  }
  
  const formattedPeriod = format(parse(box.period, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: es });

  const itemsToIncludeCount = box.items.filter(i => i.status === DispensationItemStatus.OkToInclude || i.status === DispensationItemStatus.ManuallyAdded).length;
  const itemsWithAttentionCount = box.items.filter(i => i.status === DispensationItemStatus.RequiresAttention).length;
  const canMarkAsReady = box.status === MonthlyDispensationBoxStatus.InPreparation;
  const canDispense = box.status === MonthlyDispensationBoxStatus.ReadyForPickup;

  return (
    <>
      <DispenseConfirmationDialog
        isOpen={isDispenseDialogOpen}
        onOpenChange={setIsDispenseDialogOpen}
        onConfirm={handleDispenseBox}
        isSaving={isSaving}
        retrieverName={retrieverName}
        setRetrieverName={setRetrieverName}
        retrieverRut={retrieverRut}
        setRetrieverRut={setRetrieverRut}
      />
      <PrintLabelDialog
        isOpen={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        box={box}
        patient={patient}
      />
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-10 w-10" asChild>
          <Link href="/monthly-dispensing"><ChevronLeft className="h-5 w-5"/></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Mesa de Trabajo de Dispensación</h1>
          <p className="text-sm text-muted-foreground">Paciente: <span className="font-semibold text-primary">{patient.name}</span> | Período: <span className="font-semibold text-primary">{formattedPeriod}</span></p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
              <Card>
                  <CardHeader>
                      <CardTitle>Contenido de la Caja de Dispensación</CardTitle>
                      <CardDescription>Revise y confirme los ítems a incluir. El sistema ha realizado una validación inicial.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="w-1/3">Medicamento</TableHead>
                                      <TableHead>Validación del Sistema</TableHead>
                                      <TableHead className="w-[200px]">Acción Farmacéutico</TableHead>
                                      <TableHead className="w-1/4">Notas</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {box.items.map(item => {
                                      const originalItem = originalBox?.items.find(i => i.id === item.id);
                                      const isOverridden = originalItem && originalItem.status !== item.status;
                                      const isFormDisabled = box.status !== MonthlyDispensationBoxStatus.InPreparation;

                                      return (
                                        <TableRow key={item.id} className={isFormDisabled ? 'bg-muted/30' : ''}>
                                            <TableCell>
                                                <p className="font-semibold text-foreground">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.details}</p>
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                  {React.createElement(itemStatusConfig[item.status].icon, { className: `h-4 w-4 ${itemStatusConfig[item.status].color}` })}
                                                  <p className="text-sm">{item.reason}</p>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Select 
                                                      value={item.status} 
                                                      onValueChange={(value) => handleItemChange(item.id, 'status', value as DispensationItemStatus)}
                                                      disabled={isFormDisabled}
                                                    >
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {Object.values(DispensationItemStatus).map(s => (
                                                              <SelectItem key={s} value={s}>{itemStatusConfig[s].text}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {isOverridden && <Badge variant="outline">Manual</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Textarea
                                                  placeholder="Anotaciones..." 
                                                  className="text-xs"
                                                  value={item.pharmacistNotes || ''}
                                                  onChange={(e) => handleItemChange(item.id, 'pharmacistNotes', e.target.value)}
                                                  disabled={isFormDisabled}
                                                />
                                            </TableCell>
                                        </TableRow>
                                      );
                                  })}
                              </TableBody>
                          </Table>
                      </div>
                  </CardContent>
              </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Resumen y Acciones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <p>Estado Actual: <Badge className="text-base">{box.status}</Badge></p>
                      {box.status === MonthlyDispensationBoxStatus.Dispensed && box.retrievedBy_Name && (
                        <div className="text-sm">
                            <p className="font-semibold">Dispensado a:</p>
                            <p>{box.retrievedBy_Name} ({box.retrievedBy_RUT})</p>
                        </div>
                      )}
                     <Separator />
                     <p className="text-sm font-semibold">Ítems a Incluir: {itemsToIncludeCount}</p>
                     <p className="text-sm font-semibold text-orange-600">Ítems con Alertas: {itemsWithAttentionCount}</p>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                     {canDispense && (
                        <Button className="w-full" onClick={() => setIsDispenseDialogOpen(true)} disabled={isSaving}>
                            <PackageCheck className="mr-2 h-4 w-4"/>
                            Dispensar Caja
                        </Button>
                     )}
                     <Button className="w-full" onClick={handleMarkAsReadyClick} disabled={!canMarkAsReady || isSaving}>
                        {isSaving && box.status === MonthlyDispensationBoxStatus.InPreparation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Package className="mr-2 h-4 w-4"/>}
                        Marcar como Lista para Retiro
                     </Button>
                     <Button className="w-full" variant="outline" onClick={saveProgress} disabled={!canMarkAsReady || isSaving}>
                         {isSaving && box.status !== MonthlyDispensationBoxStatus.InPreparation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Guardar Progreso
                     </Button>
                     <Button className="w-full" variant="outline" onClick={() => setIsPrintDialogOpen(true)}>
                        <Printer className="mr-2 h-4 w-4"/>
                        Imprimir Etiqueta de Caja
                     </Button>
                  </CardFooter>
              </Card>
          </div>
      </div>
    </div>
    <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar y Continuar?</AlertDialogTitle>
                <AlertDialogDescription>
                    Hay {itemsWithAttentionCount} ítem(s) que requieren atención. ¿Está seguro que desea marcar esta caja como lista para retiro de todas formas?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowConfirmation(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmReadyForPickup} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirmar de todos modos
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
