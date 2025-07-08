
'use client';

import { extractRecipeDataFromImage } from '@/ai/flows/extract-recipe-data-from-image';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PHARMACEUTICAL_FORM_DEFAULTS } from '@/lib/constants';
import {
  getAppSettings,
  getDoctors,
  getExternalPharmacies,
  getInventory,
  getPatient,
  getPatients,
  getRecipe,
  saveRecipe,
  type AppSettings,
  type Doctor,
  type ExternalPharmacy,
  type InventoryItem,
  type Patient,
} from '@/lib/data';
import { RecipeStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { addMonths, format, isValid, parseISO } from 'date-fns';
import { Bot, Calendar as CalendarIcon, Image as ImageIcon, Loader2, PlusCircle, Trash2, Wand2, ZoomIn, X as XIcon, Check, ZoomOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';


// Zod schema for form validation
const recipeItemSchema = z.object({
  principalActiveIngredient: z.string().min(1, "El Principio Activo Principal es requerido."),
  pharmaceuticalForm: z.string().min(1, "La Forma Farmacéutica es requerida."),
  concentrationValue: z.string().min(1, "El valor de la Concentración es requerido."),
  concentrationUnit: z.string().min(1, "La unidad de la Concentración es requerida."),
  dosageValue: z.string().min(1, "El valor de la Dosis es requerido."),
  dosageUnit: z.string().min(1, "La unidad de la Dosis es requerida."),
  frequency: z.string().min(1, "La Frecuencia es requerida."),
  treatmentDurationValue: z.string().min(1, "El valor de la Duración del Tratamiento es requerido."),
  treatmentDurationUnit: z.string().min(1, "La unidad de la Duración del Tratamiento es requerida."),
  safetyStockDays: z.coerce.number().optional(),
  totalQuantityValue: z.string().min(1, "El valor de la Cantidad Total es requerido."),
  totalQuantityUnit: z.string().min(1, "La unidad de la Cantidad Total es requerida."),
  usageInstructions: z.string().min(1, "Las Instrucciones de Uso son requeridas."),
});

const recipeFormSchema = z.object({
  prescriptionDate: z.date({
    required_error: "La fecha de prescripción es requerida."
  }),
  dueDate: z.date().optional(),
  patientSelectionType: z.enum(['existing', 'new']).default('existing'),
  patientId: z.string().optional(),
  newPatientName: z.string().optional(),
  newPatientRut: z.string().optional(),
  dispatchAddress: z.string().optional(),
  doctorSelectionType: z.enum(['existing', 'new']).default('existing'),
  doctorId: z.string().optional(),
  newDoctorName: z.string().optional(),
  newDoctorLicense: z.string().optional(),
  newDoctorRut: z.string().optional(),
  newDoctorSpecialty: z.string().optional(),
  externalPharmacyId: z.string().min(1, 'Debe seleccionar un recetario.'),
  supplySource: z.string().min(1, 'Debe seleccionar un origen de insumos.'),
  preparationCost: z.coerce.number().min(0, 'El costo de preparación debe ser un número positivo.'),
  isControlled: z.boolean().default(false).optional(),
  controlledRecipeType: z.string().optional(),
  controlledRecipeFolio: z.string().optional(),
  prescriptionImageUrl: z.string().optional(),
  items: z.array(recipeItemSchema).min(1, 'Debe haber al menos un ítem en la receta.'),
}).refine(data => data.patientSelectionType === 'existing' ? !!data.patientId : !!data.newPatientName && !!data.newPatientRut, {
  message: 'Debe seleccionar un paciente existente o ingresar el nombre y RUT de uno nuevo.',
  path: ['patientId'],
}).refine(data => data.doctorSelectionType === 'existing' ? !!data.doctorId : !!data.newDoctorName && !!data.newDoctorSpecialty, {
  message: 'Debe seleccionar un médico existente o ingresar nombre y especialidad de uno nuevo.',
  path: ['doctorId']
}).superRefine((data, ctx) => {
  if (data.isControlled) {
    if (!data.controlledRecipeType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El tipo de receta controlada es requerido.",
        path: ["controlledRecipeType"],
      });
    }
    if (!data.controlledRecipeFolio?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El folio de la receta es requerido.",
        path: ["controlledRecipeFolio"],
      });
    }
  }
});


type RecipeFormValues = z.infer < typeof recipeFormSchema > ;

interface RecipeFormProps {
  recipeId ? : string;
  copyFromId ? : string;
  patientId ? : string;
}

const defaultItem = {
  principalActiveIngredient: '',
  pharmaceuticalForm: '',
  concentrationValue: '',
  concentrationUnit: '',
  dosageValue: '',
  dosageUnit: '',
  frequency: '',
  treatmentDurationValue: '30',
  treatmentDurationUnit: 'días',
  safetyStockDays: 0,
  totalQuantityValue: '',
  totalQuantityUnit: '',
  usageInstructions: '',
};

const RecipeItemCard = ({
  index,
  remove,
  form,
  appSettings,
  totalFields,
}: {
  index: number;
  remove: (index: number) => void;
  form: any;
  appSettings: AppSettings | null;
  totalFields: number;
}) => {
  const {
    control,
    getValues,
    setValue
  } = form;

  const dosageValue = useWatch({ control, name: `items.${index}.dosageValue` });
  const frequency = useWatch({ control, name: `items.${index}.frequency` });
  const treatmentDurationValue = useWatch({ control, name: `items.${index}.treatmentDurationValue` });
  const treatmentDurationUnit = useWatch({ control, name: `items.${index}.treatmentDurationUnit` });
  const safetyStockDays = useWatch({ control, name: `items.${index}.safetyStockDays` });

  // Effect to calculate Total Quantity based on duration and safety days
  React.useEffect(() => {
    const dose = parseInt(dosageValue, 10);
    const freq = parseInt(frequency, 10);
    const duration = parseInt(treatmentDurationValue, 10);
    const safetyDays = parseInt(String(safetyStockDays), 10) || 0;

    if (!isNaN(freq) && freq > 0 && !isNaN(duration) && !isNaN(dose) && dose > 0) {
      let durationInDays = duration;
      if (treatmentDurationUnit === 'semanas') {
        durationInDays = duration * 7;
      } else if (treatmentDurationUnit === 'meses') {
        durationInDays = duration * 30; // Approximation
      }

      const totalDurationInDays = durationInDays + safetyDays;
      const administrationsPerDay = 24 / freq;
      const totalQuantity = Math.ceil(administrationsPerDay * totalDurationInDays * dose);

      const currentTotalVal = getValues(`items.${index}.totalQuantityValue`);
      if (String(totalQuantity) !== currentTotalVal) {
        setValue(`items.${index}.totalQuantityValue`, String(totalQuantity), {
          shouldValidate: true
        });
      }
    }
  }, [dosageValue, frequency, treatmentDurationValue, treatmentDurationUnit, safetyStockDays, index, setValue, getValues]);


  return (
    <Card className="relative bg-card border-border">
      <CardContent className="p-4">
        {totalFields > 1 && (
          <Button type="button" variant="ghost" size="icon"
            className="absolute top-2 right-2 text-red-500 hover:text-red-600 h-7 w-7"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Eliminar Ítem</span>
          </Button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={control} name={`items.${index}.principalActiveIngredient`} render={({ field }) => (
            <FormItem className="md:col-span-3"><FormLabel>Principio Activo Principal *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={control} name={`items.${index}.pharmaceuticalForm`} render={({ field }) => (
            <FormItem>
              <FormLabel>Forma Farmacéutica *</FormLabel>
              <Select onValueChange={(value) => {
                field.onChange(value);
                const defaults = PHARMACEUTICAL_FORM_DEFAULTS[value];
                if (defaults && appSettings) {
                  setValue(`items.${index}.concentrationUnit`, defaults.concentrationUnit, { shouldValidate: true });
                  setValue(`items.${index}.dosageUnit`, defaults.dosageUnit, { shouldValidate: true });
                  setValue(`items.${index}.totalQuantityUnit`, defaults.totalQuantityUnit, { shouldValidate: true });
                }
              }} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                <SelectContent>{appSettings?.pharmaceuticalForms.map(unit => <SelectItem key={unit} value={unit.toLowerCase()}>{unit}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={control} name={`items.${index}.concentrationValue`} render={({ field }) => (
            <FormItem><FormLabel>Concentración(Valor) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={control} name={`items.${index}.concentrationUnit`} render={({ field }) => (
            <FormItem>
              <FormLabel>Concentración(Unidad) *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger></FormControl>
                <SelectContent>{appSettings?.concentrationUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={control} name={`items.${index}.dosageValue`} render={({ field }) => (
            <FormItem><FormLabel>Dosis(Valor) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={control} name={`items.${index}.dosageUnit`} render={({ field }) => (
            <FormItem>
              <FormLabel>Dosis(Unidad) *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger></FormControl>
                <SelectContent>{appSettings?.dosageUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
           <FormField control={control} name={`items.${index}.frequency`} render={({ field }) => (
            <FormItem>
              <FormLabel>Frecuencia(horas) *</FormLabel>
              <FormControl><Input placeholder="Ej: 8, 12, 24" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />


          <FormField control={control} name={`items.${index}.treatmentDurationValue`} render={({ field }) => (
            <FormItem><FormLabel>Duración Trat.(Valor) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={control} name={`items.${index}.treatmentDurationUnit`} render={({ field }) => (
            <FormItem>
              <FormLabel>Duración Trat.(Unidad) *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger></FormControl>
                <SelectContent>{appSettings?.treatmentDurationUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name={`items.${index}.safetyStockDays`} render={({ field }) => (
            <FormItem><FormLabel>Días de Seguridad</FormLabel><FormControl><Input type="number" placeholder="Ej: 5" {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={control} name={`items.${index}.totalQuantityValue`} render={({ field }) => (
            <FormItem><FormLabel>Cant. Total (Valor) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={control} name={`items.${index}.totalQuantityUnit`} render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Cant. Total (Unidad) *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger></FormControl>
                <SelectContent>{appSettings?.quantityToPrepareUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={control} name={`items.${index}.usageInstructions`} render={({ field }) => (
            <FormItem className="md:col-span-3">
              <FormLabel>Instrucciones de Uso *</FormLabel>
              <FormControl><Textarea placeholder="Instrucciones de uso para el paciente..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      </CardContent>
    </Card>
  );
};

const STEPS = [
  { id: 1, name: "Paciente y Médico", fields: ['patientSelectionType', 'patientId', 'newPatientName', 'newPatientRut', 'dispatchAddress', 'doctorSelectionType', 'doctorId', 'newDoctorName', 'newDoctorLicense', 'newDoctorRut', 'newDoctorSpecialty'] },
  { id: 2, name: "Detalles de la Receta", fields: ['prescriptionDate', 'dueDate', 'isControlled', 'controlledRecipeType', 'controlledRecipeFolio'] },
  { id: 3, name: "Items del Preparado", fields: ['items'] },
  { id: 4, name: "Costos y Revisión", fields: ['externalPharmacyId', 'supplySource', 'preparationCost'] },
];

export function RecipeForm({ recipeId, copyFromId, patientId }: RecipeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [currentStep, setCurrentStep] = React.useState(1);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [externalPharmacies, setExternalPharmacies] = React.useState<ExternalPharmacy[]>([]);
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [appSettings, setAppSettings] = React.useState<AppSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAiExtracting, setIsAiExtracting] = React.useState(false);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [zoomOrigin, setZoomOrigin] = React.useState('center center');

  const isEditMode = !!recipeId;

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    mode: 'onTouched',
    defaultValues: {
      prescriptionDate: new Date(),
      dueDate: addMonths(new Date(), 6),
      patientSelectionType: 'existing',
      patientId: '',
      newPatientName: '',
      newPatientRut: '',
      dispatchAddress: '',
      doctorSelectionType: 'existing',
      doctorId: '',
      newDoctorName: '',
      newDoctorLicense: '',
      newDoctorRut: '',
      newDoctorSpecialty: '',
      externalPharmacyId: '',
      supplySource: '',
      preparationCost: 0,
      isControlled: false,
      controlledRecipeType: '',
      controlledRecipeFolio: '',
      prescriptionImageUrl: '',
      items: [defaultItem],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedPatientId = form.watch('patientId');
  const patientSelectionType = form.watch('patientSelectionType');

  React.useEffect(() => {
    if (patientSelectionType === 'existing' && watchedPatientId) {
      const selectedPatient = patients.find(p => p.id === watchedPatientId);
      if (selectedPatient?.address) {
        form.setValue('dispatchAddress', selectedPatient.address, { shouldValidate: true });
      }
    }
  }, [watchedPatientId, patientSelectionType, patients, form]);
  
  const prescriptionDate = useWatch({ control: form.control, name: 'prescriptionDate' });
  const prevPrescriptionDateRef = React.useRef<string | undefined>();

  React.useEffect(() => {
    if (prescriptionDate && isValid(prescriptionDate)) {
      const currentPrescriptionDateString = prescriptionDate.toISOString();
      const prevPrescriptionDateString = prevPrescriptionDateRef.current;
      
      if (currentPrescriptionDateString !== prevPrescriptionDateString) {
        const newDueDate = addMonths(prescriptionDate, 6);
        form.setValue('dueDate', newDueDate, { shouldValidate: true });
      }

      prevPrescriptionDateRef.current = currentPrescriptionDateString;
    }
  }, [prescriptionDate, form]);

  const loadFormData = React.useCallback(async (recipeData: any) => {
    const valuesToSet = {
      ...recipeData,
      prescriptionDate: recipeData.prescriptionDate ? parseISO(recipeData.prescriptionDate) : new Date(),
      dueDate: recipeData.dueDate ? parseISO(recipeData.dueDate) : addMonths(new Date(), 6),
      patientSelectionType: recipeData.patientId ? 'existing' : 'new',
      doctorSelectionType: recipeData.doctorId ? 'existing' : 'new',
      patientId: recipeData.patientId ?? '',
      newPatientName: recipeData.newPatientName ?? '',
      newPatientRut: recipeData.newPatientRut ?? '',
      dispatchAddress: recipeData.dispatchAddress ?? '',
      doctorId: recipeData.doctorId ?? '',
      newDoctorName: recipeData.newDoctorName ?? '',
      newDoctorLicense: recipeData.newDoctorLicense ?? '',
      newDoctorRut: recipeData.newDoctorRut ?? '',
      newDoctorSpecialty: recipeData.newDoctorSpecialty ?? '',
      externalPharmacyId: recipeData.externalPharmacyId ?? '',
      supplySource: recipeData.supplySource ?? '',
      preparationCost: recipeData.preparationCost ?? 0,
      isControlled: recipeData.isControlled ?? false,
      controlledRecipeType: recipeData.controlledRecipeType ?? '',
      controlledRecipeFolio: recipeData.controlledRecipeFolio ?? '',
      prescriptionImageUrl: recipeData.prescriptionImageUrl ?? '',
      items: recipeData.items && recipeData.items.length > 0 ? recipeData.items : [defaultItem],
    };
    form.reset(valuesToSet);

    if (recipeData.prescriptionImageUrl) {
      setPreviewImage(recipeData.prescriptionImageUrl);
    }
  }, [form]);
  
  
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (isZoomed) {
      setIsZoomed(false);
    } else {
      const { offsetX, offsetY } = e.nativeEvent;
      const { offsetWidth, offsetHeight } = e.currentTarget;
      const x = (offsetX / offsetWidth) * 100;
      const y = (offsetY / offsetHeight) * 100;
      setZoomOrigin(`${x}% ${y}%`);
      setIsZoomed(true);
    }
  };

  const handleZoomButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isZoomed) {
      setZoomOrigin('center center');
    }
    setIsZoomed((prev) => !prev);
  };


  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [patientsData, doctorsData, externalPharmaciesData, settingsData, inventoryData] = await Promise.all([
          getPatients(),
          getDoctors(),
          getExternalPharmacies(),
          getAppSettings(),
          getInventory(),
        ]);
        setPatients(patientsData);
        setDoctors(doctorsData);
        setExternalPharmacies(externalPharmaciesData);
        setAppSettings(settingsData);
        setInventory(inventoryData);

        const recipeToLoad = copyFromId || recipeId;

        if (recipeToLoad) {
          const recipeData = await getRecipe(recipeToLoad);
          if (recipeData) {
            if (copyFromId) {
              const today = new Date();
              const expiry = addMonths(today, 6);
              const newRecipeData = { ...recipeData, status: RecipeStatus.PendingValidation, paymentStatus: 'Pendiente', prescriptionDate: today, dueDate: expiry, };
              delete(newRecipeData as any).id;
              delete(newRecipeData as any).createdAt;
              delete(newRecipeData as any).updatedAt;
              delete(newRecipeData as any).auditTrail;
              await loadFormData(newRecipeData);
              toast({ title: 'Receta Duplicada', description: 'Revisa los datos y guarda la nueva receta.' });
            } else {
              await loadFormData(recipeData);
            }
          } else {
            toast({ title: 'Error', description: 'No se encontró la receta.', variant: 'destructive' });
            router.push('/recipes');
          }
        } else if (patientId) {
          const preselectedPatient = patientsData.find(p => p.id === patientId);
          if (preselectedPatient) {
            form.setValue('patientId', preselectedPatient.id);
            form.setValue('patientSelectionType', 'existing');
            if (preselectedPatient.associatedDoctorIds && preselectedPatient.associatedDoctorIds.length > 0) {
              const mainDoctorId = preselectedPatient.associatedDoctorIds[0];
              if (doctorsData.some(d => d.id === mainDoctorId)) {
                form.setValue('doctorId', mainDoctorId);
                form.setValue('doctorSelectionType', 'existing');
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos necesarios.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [recipeId, copyFromId, patientId, toast, router, form, loadFormData]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      form.setValue('prescriptionImageUrl', ''); // Clear existing URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractWithAI = async () => {
    if (!previewImage) {
      toast({ title: 'Error', description: 'Por favor, selecciona un archivo primero.', variant: 'destructive' });
      return;
    }

    setIsAiExtracting(true);
    const currentValues = form.getValues();

    try {
      const result = await extractRecipeDataFromImage({ photoDataUri: previewImage });
      
      const patientNameIsEmpty = !currentValues.newPatientName && !currentValues.patientId;
      if (result.patientName && patientNameIsEmpty) {
        form.setValue('patientSelectionType', 'new');
        form.setValue('newPatientName', result.patientName);
        form.setValue('newPatientRut', result.patientRut || '');
      }

      const doctorNameIsEmpty = !currentValues.newDoctorName && !currentValues.doctorId;
      if (result.doctorName && doctorNameIsEmpty) {
        form.setValue('doctorSelectionType', 'new');
        form.setValue('newDoctorName', result.doctorName);
        form.setValue('newDoctorLicense', result.doctorLicense || '');
        form.setValue('newDoctorRut', result.doctorRut || '');
        form.setValue('newDoctorSpecialty', result.doctorSpecialty || '');
      }

      if (result.patientAddress && !currentValues.dispatchAddress) {
        form.setValue('dispatchAddress', result.patientAddress);
      }

      if (result.prescriptionDate) {
        try {
            const parsedDate = parseISO(result.prescriptionDate);
            if (isValid(parsedDate)) {
                 form.setValue('prescriptionDate', parsedDate);
            }
        } catch (e) {
            console.warn("Could not parse AI extracted date:", result.prescriptionDate);
        }
      }

      if (result.items && result.items.length > 0) {
        remove(); // Clear all items first
        const filledItems = result.items.map(item => ({ ...defaultItem, ...item, safetyStockDays: item.safetyStockDays || 0 }));
        append(filledItems);
      }

      toast({ title: 'Extracción Completada', description: 'Los campos del formulario se han rellenado. Por favor, verifique.' });

    } catch (error) {
      console.error('AI extraction failed:', error);
      toast({ title: 'Error de IA', description: 'No se pudo extraer la información de la imagen.', variant: 'destructive' });
    } finally {
      setIsAiExtracting(false);
    }
  };
  
  const handleNextStep = async () => {
    const fieldsToValidate = STEPS[currentStep - 1].fields;
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    } else {
       toast({ title: "Campos incompletos", description: "Por favor, complete todos los campos requeridos en este paso.", variant: "destructive" });
    }
  }

  const onSubmit = async (data: RecipeFormValues) => {
    if (!user) {
      toast({ title: 'Error de Autenticación', description: 'No se pudo verificar el usuario. Por favor, inicie sesión de nuevo.', variant: 'destructive' });
      return;
    }
    try {
      const finalRecipeId = isEditMode && !copyFromId ? recipeId : undefined;
      await saveRecipe(data, imageFile, user.uid, finalRecipeId);
      toast({ title: isEditMode && !copyFromId ? 'Receta Actualizada' : 'Receta Creada', description: 'Los datos se han guardado correctamente.' });
      
      if (patientId && !isEditMode) {
        router.push(`/patients/${patientId}`);
      } else {
        router.push('/recipes');
      }
      
      router.refresh();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Por favor, intente de nuevo.';
        toast({ 
            title: 'Error al Guardar', 
            description: `No se pudo guardar la receta. ${errorMessage}`, 
            variant: 'destructive',
            duration: 9000,
        });
    }
  };

  const isControlled = form.watch('isControlled');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando formulario...</p>
      </div>
    );
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start p-6">
            
            {/* --- Left Column: Image Viewer --- */}
            <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-24">
              <h2 className="text-xl font-semibold text-foreground mt-1">Imagen de la Receta</h2>
              <div className="w-full aspect-[4/5] flex items-center justify-center border-2 border-dashed rounded-lg overflow-hidden bg-muted/50 relative">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                  {previewImage ? (
                    <>
                      <Image 
                          src={previewImage} 
                          alt="Vista previa de receta" 
                          fill 
                          className={cn(
                              "object-contain transition-transform duration-300 ease-in-out",
                              isZoomed ? "scale-[2.5] cursor-zoom-out" : "scale-100 cursor-zoom-in"
                          )}
                          onClick={handleImageClick}
                          style={{ transformOrigin: zoomOrigin }}
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
                        <Button type="button" variant="secondary" size="icon" className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-full" onClick={handleZoomButtonClick}>
                          {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                        </Button>
                        <Button type="button" variant="secondary" size="icon" className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-full" onClick={() => { setPreviewImage(null); setImageFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; setIsZoomed(false); setZoomOrigin('center center'); }}>
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer p-4">
                      <ImageIcon className="h-10 w-10 text-muted-foreground mb-2 mx-auto" />
                      <p className="text-sm text-muted-foreground mb-1">Arrastra o haz clic para subir</p>
                    </div>
                  )}
              </div>
              <Button type="button" onClick={handleExtractWithAI} disabled={!previewImage || isAiExtracting} className="w-full mt-2">
                {isAiExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                {isAiExtracting ? 'Extrayendo...' : 'Extraer con IA'}
              </Button>
            </div>
            
            {/* --- Right Column: Form Steps --- */}
            <div className="lg:col-span-3">
              {/* Stepper Navigation */}
              <div className="mb-8">
                <ol className="flex items-center w-full">
                  {STEPS.map((step, index) => (
                    <li key={step.id} className={cn("flex w-full items-center", { "text-primary dark:text-blue-500 after:border-primary dark:after:border-blue-500": currentStep > step.id }, { "after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:inline-block dark:after:border-gray-700": index !== STEPS.length - 1 })}>
                      <span className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0",
                        currentStep >= step.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}>
                        {currentStep > step.id ? <Check className="w-5 h-5"/> : <span className="font-bold">{step.id}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Step 1: Patient and Doctor */}
              <div className={cn(currentStep !== 1 && "hidden")}>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-4 text-foreground">Paciente *</h2>
                      <FormField control={form.control} name="patientSelectionType" render={({ field }) => (
                        <Tabs value={field.value} onValueChange={(value) => field.onChange(value as 'existing' | 'new')} className="w-full">
                          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="existing">Paciente Existente</TabsTrigger><TabsTrigger value="new">Paciente Nuevo</TabsTrigger></TabsList>
                          <TabsContent value="existing" className="mt-4">
                            <FormField control={form.control} name="patientId" render={({ field }) => (
                              <FormItem><FormLabel>Buscar Paciente</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un paciente..." /></SelectTrigger></FormControl>
                                  <SelectContent><>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.rut}</SelectItem>)}</>
                                  </SelectContent>
                                </Select><FormMessage />
                              </FormItem>
                            )} />
                          </TabsContent>
                          <TabsContent value="new" className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField control={form.control} name="newPatientName" render={({ field }) => (<FormItem><FormLabel>Nombre Paciente</FormLabel><FormControl><Input placeholder="Nombre Apellido" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="newPatientRut" render={({ field }) => (<FormItem><FormLabel>RUT Paciente</FormLabel><FormControl><Input placeholder="12.345.678-9" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                          </TabsContent>
                        </Tabs>
                      )} />
                      <FormField control={form.control} name="dispatchAddress" render={({ field }) => (
                        <FormItem className="mt-4"><FormLabel>Dirección de Despacho</FormLabel><FormControl><Input placeholder="Ej: Calle Falsa 123, Comuna" {...field} /></FormControl><FormDescription className="text-xs text-muted-foreground">(Opcional. Por defecto, se retira en farmacia.)</FormDescription><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-4 text-foreground">Médico *</h2>
                      <FormField control={form.control} name="doctorSelectionType" render={({ field }) => (
                        <Tabs value={field.value} onValueChange={(value) => field.onChange(value as 'existing' | 'new')} className="w-full">
                          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="existing">Médico Existente</TabsTrigger><TabsTrigger value="new">Médico Nuevo</TabsTrigger></TabsList>
                          <TabsContent value="existing" className="mt-4">
                            <FormField control={form.control} name="doctorId" render={({ field }) => (
                              <FormItem><FormLabel>Buscar Médico</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un médico..." /></SelectTrigger></FormControl>
                                  <SelectContent><>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name} - {d.specialty}</SelectItem>)}</>
                                  </SelectContent>
                                </Select><FormMessage />
                              </FormItem>
                            )} />
                          </TabsContent>
                          <TabsContent value="new" className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField control={form.control} name="newDoctorName" render={({ field }) => (<FormItem><FormLabel>Nombre Médico</FormLabel><FormControl><Input placeholder="Nombre Apellido" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="newDoctorSpecialty" render={({ field }) => (<FormItem><FormLabel>Especialidad Médico</FormLabel><FormControl><Input placeholder="Ej: Cardiología" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="newDoctorLicense" render={({ field }) => (<FormItem><FormLabel>N° Colegiatura (Opcional)</FormLabel><FormControl><Input placeholder="Ej: 12345" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="newDoctorRut" render={({ field }) => (<FormItem><FormLabel>RUT Médico (Opcional)</FormLabel><FormControl><Input placeholder="12.345.678-K" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                          </TabsContent>
                        </Tabs>
                      )} />
                    </div>
                  </div>
              </div>

              {/* Step 2: Recipe Details */}
              <div className={cn(currentStep !== 2 && "hidden")}>
                <h2 className="text-xl font-semibold mb-4 text-foreground">Detalles Generales</h2>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormItem>
                        <FormLabel>ID Receta</FormLabel>
                        <FormControl><Input disabled value={isEditMode && !copyFromId ? recipeId : "Nuevo (se genera al guardar)"} /></FormControl>
                      </FormItem>
                      <FormField control={form.control} name="prescriptionDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha Prescripción *</FormLabel>
                          <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-between text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'dd-MM-yyyy') : <span>dd-mm-aaaa</span>}<CalendarIcon className="h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha Vencimiento</FormLabel>
                          <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-between text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'dd-MM-yyyy') : <span>dd-mm-aaaa</span>}<CalendarIcon className="h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                          <FormDescription className="text-xs text-muted-foreground">(Por defecto 6 meses, editable.)</FormDescription>
                        </FormItem>
                      )} />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">Medicamento Controlado</h3>
                        <FormField control={form.control} name="isControlled" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Es Controlado</FormLabel></FormItem>)} />
                        {isControlled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="controlledRecipeType" render={({ field }) => (<FormItem><FormLabel>Tipo de Receta Controlada *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione tipo..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Receta Cheque">Receta Cheque</SelectItem><SelectItem value="Receta Retenida">Receta Retenida</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="controlledRecipeFolio" render={({ field }) => (<FormItem><FormLabel>Folio Receta *</FormLabel><FormControl><Input placeholder="Ej: F123456 o Folio Cheque" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                        )}
                    </div>
                </div>
              </div>
              
              {/* Step 3: Items */}
              <div className={cn(currentStep !== 3 && "hidden")}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-foreground">Preparado Magistral</h2>
                    <Button type="button" variant="link" onClick={() => append(defaultItem)} className="text-primary hover:text-primary/80"><PlusCircle className="mr-2 h-4 w-4" />Añadir Ítem</Button>
                  </div>
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {fields.map((item, index) => (
                      <RecipeItemCard key={item.id} index={index} remove={remove} form={form} appSettings={appSettings} totalFields={fields.length} />
                    ))}
                  </div>
                  <FormField control={form.control} name="items" render={() => (<FormItem><FormMessage className="mt-4" /></FormItem>)} />
              </div>

              {/* Step 4: Costs and Review */}
              <div className={cn(currentStep !== 4 && "hidden")}>
                  <h2 className="text-xl font-semibold mb-4 text-foreground">Recetario, Costos y Guardado</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <FormField control={form.control} name="externalPharmacyId" render={({ field }) => (
                      <FormItem><FormLabel>Recetario Asignado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un recetario..." /></SelectTrigger></FormControl>
                          <SelectContent>{externalPharmacies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="supplySource" render={({ field }) => (
                      <FormItem><FormLabel>Origen de Insumos *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un origen..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Stock del Recetario">Stock del Recetario</SelectItem>
                            <SelectItem value="Insumos de Skol">Insumos de Skol</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <div className="md:col-span-2">
                      <FormField control={form.control} name="preparationCost" render={({ field }) => (
                        <FormItem><FormLabel>Costo Preparación (CLP) *</FormLabel>
                          <FormControl><Input type="number" placeholder="Ej: 15000" {...field} /></FormControl>
                          <FormDescription className="text-xs text-muted-foreground">Costo que Skol pagará al recetario.</FormDescription><FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
              </div>

              {/* Form Navigation */}
              <div className="flex justify-between items-center mt-8 pt-4 border-t">
                <Button type="button" variant="ghost" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 1}>
                    Anterior
                </Button>
                {currentStep < STEPS.length ? (
                    <Button type="button" onClick={handleNextStep}>
                      Siguiente
                    </Button>
                ) : (
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode && !copyFromId ? 'Guardar Cambios' : 'Crear Receta'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
