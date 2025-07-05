'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getDashboardData, submitNewPrescription } from '@/lib/patient-actions';
import { Patient, Recipe, ProactivePatientStatus } from '@/lib/types';
import { Loader2, AlertTriangle, Clock, FileText, Upload, X, Pill, History, DollarSign, FileUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

const PrescriptionUploadDialog = ({ isOpen, onOpenChange, patientId, onUploadSuccess, userId }: { isOpen: boolean; onOpenChange: (open: boolean) => void; patientId: string; onUploadSuccess: () => void; userId?: string; }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!imageFile) {
      toast({ title: "Error", description: "Por favor, selecciona una imagen.", variant: "destructive" });
      return;
    }
     if (!userId) {
      toast({ title: "Error de Sesión", description: "No se pudo verificar su sesión. Por favor, recargue la página.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      await submitNewPrescription(patientId, imageFile, userId);
      toast({
        title: "Receta Enviada",
        description: "Hemos recibido tu receta y la procesaremos pronto.",
      });
      onOpenChange(false);
      onUploadSuccess();
    } catch (error) {
        console.error("Upload failed:", error);
        const errorMessage = error instanceof Error ? error.message : "No se pudo enviar la receta. Intente de nuevo.";
        toast({ title: "Error al Subir", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };
  
  useEffect(() => {
    if(!isOpen) {
        setPreviewImage(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar Nueva Receta</DialogTitle>
          <DialogDescription>Sube una foto clara de tu receta médica para que la procesemos.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div
            className="flex-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary relative"
            onClick={() => fileInputRef.current?.click()}
            >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
            {previewImage ? (
                <>
                <Image src={previewImage} alt="Vista previa" width={200} height={150} className="rounded-md object-contain max-h-32" />
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 bg-background/50 rounded-full h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewImage(null); setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                    <X className="h-4 w-4" />
                </Button>
                </>
            ) : (
                <div className="text-center">
                <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Clic o arrastra para subir</p>
                </div>
            )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={isUploading || !imageFile}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? 'Enviando...' : 'Enviar Receta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card className="p-4">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-muted rounded-full">
                <Icon className="h-6 w-6 text-muted-foreground"/>
            </div>
            <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
            </div>
        </div>
    </Card>
);

const ActionCard = ({ title, description, icon: Icon, href }: { title: string, description: string, icon: React.ElementType, href: string }) => (
    <Link href={href}>
        <Card className="hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                <Icon className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription className="text-xs">{description}</CardDescription>
                </div>
            </CardHeader>
        </Card>
    </Link>
);


export default function PatientPortalDashboardPage() {
    const { patient } = usePatientAuth();
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [dashboardData, setDashboardData] = useState<{
        activeMagistralRecipes: Recipe[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!patient) return;
        setLoading(true);
        try {
            const data = await getDashboardData(patient.id);
            setDashboardData({ activeMagistralRecipes: data.activeMagistralRecipes });
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudieron cargar los datos del portal.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [patient, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeTreatmentsCount = useMemo(() => {
        const magistralCount = dashboardData?.activeMagistralRecipes.length || 0;
        const commercialCount = patient?.commercialMedications?.length || 0;
        return magistralCount + commercialCount;
    }, [dashboardData, patient]);

    const lastDispensationDate = useMemo(() => {
        const recipesWithDispensationDate = dashboardData?.activeMagistralRecipes
            .flatMap(r => r.auditTrail || [])
            .filter(t => t.status === 'Dispensada' && t.date) || [];
            
        if (recipesWithDispensationDate.length === 0) return 'N/A';

        const lastDate = recipesWithDispensationDate
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date;

        return format(parseISO(lastDate), 'dd MMMM, yyyy', { locale: es });
    }, [dashboardData]);

    if (loading || !patient || !dashboardData) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Hola, {patient.name}</h1>
                <p className="text-lg text-muted-foreground">{patient.proactiveMessage}</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Tratamientos Activos" value={activeTreatmentsCount} icon={Pill}/>
                <StatCard title="Última Dispensación" value={lastDispensationDate} icon={Clock}/>
                <StatCard title="Alertas Importantes" value={patient.proactiveStatus === ProactivePatientStatus.URGENT || patient.proactiveStatus === ProactivePatientStatus.ATTENTION ? 'Sí' : 'No'} icon={AlertTriangle}/>
            </div>
            
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Accesos Directos</h2>
                 <div className="grid gap-4 md:grid-cols-2">
                    <ActionCard 
                        title="Mis Tratamientos"
                        description="Ver y gestionar tus medicamentos activos."
                        icon={FileText}
                        href="/patient-portal/dashboard/treatments"
                    />
                    <ActionCard 
                        title="Historial de Despachos"
                        description="Revisa tus entregas y preparados anteriores."
                        icon={History}
                        href="/patient-portal/dashboard/history"
                    />
                    <div onClick={() => setIsUploadOpen(true)} className="cursor-pointer">
                        <Card className="hover:bg-muted/50 transition-colors h-full">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                                <Upload className="h-8 w-8 text-primary"/>
                                <div>
                                    <CardTitle className="text-base">Cargar Nueva Receta</CardTitle>
                                    <CardDescription className="text-xs">Sube una nueva receta médica para procesar.</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    </div>
                     <ActionCard 
                        title="Precios y Pagos"
                        description="Consulta los costos y el estado de tus pagos."
                        icon={DollarSign}
                        href="/patient-portal/dashboard/payments"
                    />
                </div>
            </div>

            <PrescriptionUploadDialog
                isOpen={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                patientId={patient.id}
                userId={user?.uid}
                onUploadSuccess={fetchData}
            />
        </div>
    );
}
