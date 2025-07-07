'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { fetchRawInventoryFromLioren, type LiorenProduct } from '@/lib/lioren-api';
import { VADEMECUM_DATA } from '@/lib/constants';
import { placePatientOrder } from '@/lib/patient-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, ShoppingCart, MinusCircle, PlusCircle, Trash2, FileUp, AlertTriangle, ShieldCheck, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';

type CartItem = LiorenProduct & { quantity: number };

const ProductCard = ({ product, onAddToCart }: { product: LiorenProduct, onAddToCart: (product: LiorenProduct) => void }) => {
    const requiresPrescription = useMemo(() => VADEMECUM_DATA.some(v => v.productName.toLowerCase() === product.nombre.toLowerCase() && v.isControlled), [product.nombre]);

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-base h-12">{product.nombre}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                 {requiresPrescription && <Badge variant="destructive" className="mb-2">Requiere Receta</Badge>}
                <p className="text-2xl font-bold">${product.precioventabruto.toLocaleString('es-CL')}</p>
                <p className="text-xs text-muted-foreground">SKU: {product.codigo}</p>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={() => onAddToCart(product)}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Añadir al Carro
                </Button>
            </CardFooter>
        </Card>
    );
};

export default function NewOrderPage() {
    const { patient, firebaseUser } = usePatientAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [products, setProducts] = useState<LiorenProduct[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            toast({ title: "Búsqueda vacía", description: "Por favor, ingrese un término para buscar." });
            return;
        }
        setLoadingProducts(true);
        setHasSearched(true);
        try {
            const fetchedProducts = await fetchRawInventoryFromLioren(searchTerm);
            const availableProducts = fetchedProducts.filter(p => p.stocks.some(s => s.stock > 0));
            setProducts(availableProducts);
            if(availableProducts.length === 0) {
                toast({ title: "Sin resultados", description: "No se encontraron productos con ese nombre." });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudieron cargar los productos.', variant: 'destructive' });
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleAddToCart = (product: LiorenProduct) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
        toast({ title: 'Producto Añadido', description: `${product.nombre} se ha añadido al carro.` });
    };

    const updateQuantity = (productId: number, newQuantity: number) => {
        setCart(prevCart => {
            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== productId);
            }
            return prevCart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item);
        });
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + (item.precioventabruto * item.quantity), 0);
    }, [cart]);

    const requiresPrescription = useMemo(() => {
        return cart.some(item => VADEMECUM_DATA.some(v => v.productName.toLowerCase() === item.nombre.toLowerCase() && v.isControlled));
    }, [cart]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPrescriptionFile(e.target.files[0]);
        }
    };
    
    const handleSubmitOrder = async () => {
        if (!patient || !firebaseUser) {
            toast({ title: "Error", description: "Debe iniciar sesión para realizar un pedido.", variant: "destructive" });
            return;
        }
        if (requiresPrescription && !prescriptionFile) {
            toast({ title: "Receta Requerida", description: "Por favor, suba una imagen de su receta médica para continuar.", variant: "destructive" });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const orderItems = cart.map(item => ({
                productId: String(item.id),
                name: item.nombre,
                quantity: item.quantity,
                price: item.precioventabruto,
            }));

            let formData: FormData | undefined;
            if (prescriptionFile) {
                formData = new FormData();
                formData.append('prescription', prescriptionFile);
            }

            await placePatientOrder(patient.id, orderItems, cartTotal, firebaseUser.uid, formData);
            
            toast({ title: "Pedido Realizado", description: "Hemos recibido tu pedido y lo procesaremos a la brevedad." });
            setCart([]);
            setPrescriptionFile(null);
            router.push('/patient-portal/dashboard/orders');
        } catch (error) {
             toast({ title: "Error al realizar el pedido", description: error instanceof Error ? error.message : "Ocurrió un error inesperado.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold font-headline">Hacer un Pedido</h1>
                <Button variant="outline" asChild><Link href="/patient-portal/dashboard/orders"><History className="mr-2 h-4 w-4"/>Ver Mis Pedidos</Link></Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar productos por nombre..." 
                                className="pl-10 h-12 text-lg" 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={loadingProducts} className="h-12">
                            {loadingProducts ? <Loader2 className="h-5 w-5 animate-spin"/> : "Buscar"}
                        </Button>
                    </div>

                    {loadingProducts ? (
                        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : hasSearched ? (
                        products.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {products.map(product => (
                                    <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">No se encontraron productos para su búsqueda.</div>
                        )
                    ) : (
                        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">Ingrese un término en el buscador para encontrar productos.</div>
                    )}
                </div>

                <div className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ShoppingCart /> Carro de Compras</CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-[50vh] overflow-y-auto pr-2">
                            {cart.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">Tu carro está vacío.</p>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-sm">{item.nombre}</p>
                                                <p className="text-sm text-muted-foreground">${item.precioventabruto.toLocaleString('es-CL')} c/u</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}><MinusCircle /></Button>
                                                <span className="font-bold w-4 text-center">{item.quantity}</span>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}><PlusCircle /></Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => updateQuantity(item.id, 0)}><Trash2 /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        {cart.length > 0 && (
                            <CardFooter className="flex-col items-stretch space-y-4 pt-4">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total:</span>
                                    <span>${cartTotal.toLocaleString('es-CL')}</span>
                                </div>
                                {requiresPrescription && (
                                     <div className="space-y-2 pt-4 border-t">
                                        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md">
                                            <p className="font-bold mb-1 text-yellow-800 flex items-center gap-2"><AlertTriangle/>Receta Requerida</p>
                                            <p className="text-sm text-yellow-700">Uno o más productos en tu carro requieren receta médica. Por favor, súbela aquí.</p>
                                        </div>
                                        <Input type="file" onChange={handleFileChange} accept="image/*,.pdf" />
                                        {prescriptionFile && <p className="text-xs text-green-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{prescriptionFile.name} listo para subir.</p>}
                                    </div>
                                )}
                                <Button className="w-full text-lg h-12" onClick={handleSubmitOrder} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Hacer Pedido
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
