    //src/app/order-details/[order]/page.tsx

    "use client"

    import { useParams, useRouter } from "next/navigation"
    import { useEffect, useState } from "react"
    import { useAuth } from "../../context/AuthContext"
    import { supabase } from "@/lib/supabase/client"
    import {
        Table,
        TableBody,
        TableCell,
        TableHead,
        TableHeader,
        TableRow,
    } from "@/components/ui/table"
    import { Button } from "@/components/ui/button"
    import { Input } from "@/components/ui/input"
    import { CheckCircle, ChevronDown, ExternalLink, Pencil, XCircle } from "lucide-react"
    import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
    } from "@/components/ui/select"
    import {
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
        DialogTrigger,
    } from "@/components/ui/dialog"
    import Link from "next/link"
    import { emailTemplates, sendEmail } from "@/lib/email"
    import { logActivity } from "@/lib/logger";
    import { toast } from "sonner"
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
    import { ApprovedEmail, ReturnedEmail, ShippedEmail } from "@/lib/emailconst"

    export type Product = {
        id: string;
        product_name: string;
        sku: string;
        thumbnail: string;
        stock_quantity: string;
        withCustomer: string;
        processor?: string | null;
        form_factor?: string | null;
        slug?: string | null;
    }

    export type Order = {
        id: string
        order_no: string
        order_date: string
        order_status: string
        rev_opportunity: number | null
        dev_budget: number | null
        dev_opportunity: number | null
        se_email: string | null
        company_name: string | null
        shipped_date: string | null
        returned_date: string | null
        quantity: number | null
        segment: string | null
        order_month: string | null
        order_quarter: string | null
        order_year: string | null
        sales_executive: string | null
        current_manufacturer: string | null
        contact_name: string | null
        email: string | null
        approvedBy: string | null
        rejectedBy: string | null
        action_date: string | null
        address: string | null
        tracking: string | null
        return_tracking: string | null
        tracking_link: string | null
        return_tracking_link: string | null
        username: string | null
        case_type: string | null
        password: string | null
        return_label: string | null
        state: string | null
        city: string | null
        zip: string | null
        desired_date: string | null
        notes: string | null
        product_id: string | null
        ingram_account: string | null
        quote_number: string | null
        is_competitive: string | null
        estimated_close_date: string | null
        wants_5g_sim: string | null
        products?: Product
        product_ids_array?: string[]
        quantities_array?: number[]
        products_array?: Product[]
        approved_user?: {
            id: string
            email: string
            name?: string
        }
        rejected_user?: {
            id: string
            email: string
            name?: string

        }
        order_by_user?: {
            id: string
            email: string
            name?: string
        }
        wins?: {
            id: string;
            order_id: string;
            created_at: string;
        }[];
    }

    export default function Page() {
        const router = useRouter();
        const params = useParams();
        const orderHash = params.order as string;
        const { profile, isLoggedIn, loading } = useAuth();
        const [orders, setOrders] = useState<Order[]>([]);
        const [isLoading, setIsLoading] = useState<boolean>(true);
        const [error, setError] = useState<string | null>(null);
        const [editingField, setEditingField] = useState<string | null>(null);
        const [editedValue, setEditedValue] = useState<string>("");
        const [editingRowId, setEditingRowId] = useState<string | null>(null);
        const [allProducts, setAllProducts] = useState<Product[]>([]);
        const [isUploading, setIsUploading] = useState(false);
        const [uploadError, setUploadError] = useState<string | null>(null);
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [pendingStatusChange, setPendingStatusChange] = useState<{ field: string, value: string, rowId: string } | null>(null);
        const [trackingData, setTrackingData] = useState({
            tracking: "",
            return_tracking: "",
            tracking_link: "",
            return_tracking_link: "",
            username: "",
            case_type: "",
            password: ""
        });

        const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
        const [returnedProducts, setReturnedProducts] = useState<{
            productId: string;
            productName: string;
            shippedQuantity: number;
            returnedQuantity: number;
            isDamaged: boolean;
        }[]>([]);

        const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
        const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
        const ssRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
        const sRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

        const allowedRoles = [smRole, adminRole, sRole, ssRole].filter(Boolean);

        const isAdmin = profile?.role === adminRole;
        const isSSRole = profile?.role === ssRole;
        const isSMRole = profile?.role === smRole;
        const isSubscriber = profile?.role === sRole;

        const canApproveReject = isAdmin || isSSRole;
        const canEditAll = isAdmin;
        const canEditStatus = isAdmin || isSMRole;
        const canEditTracking = isAdmin || isSMRole;
        const canUploadReturnLabel = isAdmin || isSMRole;

        const isAuthorized = profile?.role && allowedRoles.includes(profile.role);

        const statusOptions = [
            { value: `${process.env.NEXT_PUBLIC_STATUS_AWAITING}`, label: "Awaiting Approval" },
            { value: `${process.env.NEXT_PUBLIC_STATUS_PROCESSING}`, label: "Processing" },
            { value: `${process.env.NEXT_PUBLIC_STATUS_SHIPPED}`, label: "Shipped" },
            { value: `${process.env.NEXT_PUBLIC_STATUS_EXTENSION}`, label: "Shipped (Order Extension)" },
            { value: `${process.env.NEXT_PUBLIC_IN_TRANSIT}`, label: "Return In transit" },
            { value: `${process.env.NEXT_PUBLIC_FEDEX_DELIVERED}`, label: "Delivered to warehouse" },
            { value: `${process.env.NEXT_PUBLIC_STATUS_RETURNED}`, label: "Returned" },
            { value: `${process.env.NEXT_PUBLIC_STATUS_REJECTED}`, label: "Rejected" }
        ];

        useEffect(() => {
            if (loading) return;
            if (!isLoggedIn || !profile?.isVerified) {
                router.replace(`/login/?redirect_to=order-details/${orderHash}`);
                return;
            }
            if (!isAuthorized) {
                router.replace('/product-category/alldevices');
                return;
            }
        }, [loading, isLoggedIn, profile, router, isAuthorized, orderHash]);

        const handleStatusChangeToReturned = (field: string, value: string, rowId: string = "order") => {
            if (field !== "order_status" || value !== process.env.NEXT_PUBLIC_STATUS_RETURNED) return;
            if (!order || !canEditStatus) return;
            if (!order.shipped_date || !order.products) {
                toast.error("Order is not shipped or has no products");
                return;
            }

            const productsData = [{
                productId: order.products.id,
                productName: order.products.product_name,
                shippedQuantity: order.quantity || 0,
                returnedQuantity: order.quantity || 0,
                isDamaged: false
            }];

            setReturnedProducts(productsData);
            setPendingStatusChange({ field, value, rowId });
            setIsReturnModalOpen(true);
        };

        const fetchAllProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('id, product_name, sku')
                    .eq('post_status', 'Publish')
                    .neq('stock_quantity', 0)
                    .order('product_name');

                if (error) throw error;
                if (data) setAllProducts(data as Product[]);
            } catch (err) {
                console.error('Error fetching products:', err);
            }
        };

        const fetchOrders = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const { data, error: supabaseError } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        approved_user:users!orders_approved_by_fkey(id, email, name),
                        rejected_user:users!orders_rejected_by_fkey(id, email, name),
                        order_by_user:users!orders_order_by_fkey(id, email, name),
                        wins:wins(*),
                        products:product_id (*)
                    `)
                    .eq('order_no', orderHash);

                if (supabaseError) throw supabaseError;

                if (data && data.length > 0) {
                    if (sRole === profile?.role && data[0].order_by !== profile?.id) {
                        router.replace('/order-details');
                        return;
                    }

                    const processedOrder: Order = {
                        ...data[0],
                        product_id: data[0].product_id,
                        quantity: data[0].quantity,
                        product_ids_array: [data[0].product_id],
                        quantities_array: [data[0].quantity],
                        products_array: data[0].products ? [data[0].products] : [],
                        approved_user: data[0].approved_user || undefined,
                        rejected_user: data[0].rejected_user || undefined,
                        order_by_user: data[0].order_by_user || undefined,
                    };

                    setOrders([processedOrder]);

                    setTrackingData({
                        tracking: processedOrder.tracking || "",
                        return_tracking: processedOrder.return_tracking || "",
                        tracking_link: processedOrder.tracking_link || "",
                        return_tracking_link: processedOrder.return_tracking_link || "",
                        username: processedOrder.username || "",
                        case_type: processedOrder.case_type || "",
                        password: processedOrder.password || ""
                    });
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to fetch orders');
            } finally {
                setIsLoading(false);
            }
        };

        useEffect(() => {
            if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
                fetchOrders();
                fetchAllProducts();
            }
        }, [loading, isLoggedIn, profile, isAuthorized]);

        const renderAllProducts = () => {
            if (!order.products) {
                return (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center">
                            <span className="text-gray-500">No product found</span>
                        </TableCell>
                    </TableRow>
                );
            }

            const isEditing = editingField === "product_id" && editingRowId === "product";

            return (
                <TableRow>
                    <TableCell className="w-[85%]">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <Select value={editedValue} onValueChange={setEditedValue}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allProducts.map(product => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.product_name} ({product.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button size="sm" onClick={() => handleProductSelect(editedValue)} className="bg-[#1D76BC] hover:bg-[#1660a0] cursor-pointer" disabled={!(isAdmin || isSMRole)}>Save</Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit} className="cursor-pointer" disabled={!(isAdmin || isSMRole)}>Cancel</Button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <span>{order.products?.product_name}</span>
                                    {order.products?.sku && <span className="text-xs text-gray-500">(SKU: {order.products.sku})</span>}
                                </div>
                                {(isAdmin || isSMRole) && (
                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer"
                                        onClick={() => { setEditingField("product_id"); setEditedValue(order.product_id || ""); setEditingRowId("product"); }}>
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </TableCell>
                    <TableCell className="w-[15%] border-l text-center">{order.quantity || 0}</TableCell>
                </TableRow>
            );
        };

        const handleReturnSubmit = async () => {
            if (!order || !canEditStatus) { toast.error("Not authorized or no order"); return; }

            try {
                toast.loading("Processing return...");
                const currentDate = new Date().toISOString().split('T')[0];

                for (const returnedProduct of returnedProducts) {
                    if (returnedProduct.returnedQuantity > 0) {
                        const product = order.products;
                        if (product && product.id === returnedProduct.productId) {
                            const newStock = (parseInt(product.stock_quantity) || 0) + returnedProduct.returnedQuantity;
                            const newWithCustomer = Math.max(0, (parseInt(product.withCustomer) || 0) - returnedProduct.shippedQuantity);

                            const { error: productError } = await supabase.from('products')
                                .update({ stock_quantity: newStock.toString(), withCustomer: newWithCustomer.toString() })
                                .eq('id', returnedProduct.productId);

                            if (productError) throw new Error(`Failed to update product: ${productError.message}`);
                        }
                    }
                }

                const returnStatus = process.env.NEXT_PUBLIC_STATUS_RETURNED || "Returned";
                const { error: orderError } = await supabase.from('orders')
                    .update({ order_status: returnStatus, returned_date: currentDate })
                    .eq('id', order.id);

                if (orderError) throw new Error(`Failed to update order: ${orderError.message}`);

                if (order.order_by_user?.email) {
                    try { await sendReturnedOrderEmail({ ...order, order_status: returnStatus, returned_date: currentDate }, returnedProducts); }
                    catch (emailError) { console.error('Email sending failed:', emailError); }
                }

                toast.dismiss();
                toast.success("Return processed successfully!");
                setIsReturnModalOpen(false);
                setReturnedProducts([]);
                setPendingStatusChange(null);
                setEditingField(null);
                setEditingRowId(null);
                setEditedValue("");
                await fetchOrders();
                await fetchAllProducts();

            } catch (err: any) {
                toast.dismiss();
                toast.error(err.message || "Failed to process return");
            }
        };

        const formatActionDate = (dateTimeString: string | null) => {
            if (!dateTimeString) return "-";
            try {
                const date = new Date(dateTimeString);
                if (isNaN(date.getTime())) return "-";
                const day = date.getDate().toString().padStart(2, '0');
                const month = date.toLocaleString('default', { month: 'short' });
                const year = date.getFullYear();
                return `${day}-${month}-${year}`;
            } catch { return dateTimeString; }
        };

        const renderReturnModal = () => (
            <Dialog open={isReturnModalOpen} onOpenChange={(open) => {
                if (!open) {
                    const hasSelected = returnedProducts.some(p => p.returnedQuantity > 0);
                    if (hasSelected && !window.confirm("You have selected products to return. Are you sure you want to cancel?")) return;
                    setIsReturnModalOpen(false);
                    setReturnedProducts([]);
                }
            }}>
                <DialogContent className="sm:max-w-300 max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle>Process Return for Order #{order?.order_no}</DialogTitle>
                        <p className="text-sm text-gray-600 mt-1">Specify quantity to return to inventory</p>
                    </DialogHeader>
                    <div className="space-y-4 py-4 overflow-x-hidden">
                        <div className="overflow-x-auto">
                            <Table className="td-table w-full min-w-162.5">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-25 td-th">Shipped</TableHead>
                                        <TableHead className="w-37.5 td-th">Return to Stock</TableHead>
                                        <TableHead className="td-th">Product</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {returnedProducts.map((product, index) => (
                                        <TableRow key={product.productId} className="hover:bg-gray-50">
                                            <TableCell className="font-medium text-center td-td">{product.shippedQuantity}</TableCell>
                                            <TableCell className="td-td">
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" min={0} max={product.shippedQuantity} value={product.returnedQuantity}
                                                        onChange={(e) => {
                                                            const newQty = Math.min(Math.max(0, parseInt(e.target.value) || 0), product.shippedQuantity);
                                                            setReturnedProducts(prev => prev.map((p, i) => i === index ? { ...p, returnedQuantity: newQty, isDamaged: newQty === 0 } : p));
                                                        }}
                                                        className="w-24 text-center" />
                                                    <span className="text-sm text-gray-500">/ {product.shippedQuantity}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium td-td">{product.productName}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => { setIsReturnModalOpen(false); setReturnedProducts([]); toast.info("Return process cancelled"); }} className="cursor-pointer">Cancel</Button>
                        <Button onClick={() => { if (!order) { toast.error("No order data"); return; } if (!canEditStatus) { toast.error("You are not authorized"); return; } handleReturnSubmit(); }}
                            className="bg-[#1D76BC] hover:bg-[#1660a0] cursor-pointer" disabled={!order || !canEditStatus}>
                            Confirm Return
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );

        const handleApprove = async () => {
            if (!order || !canApproveReject) return;
            try {
                const { error } = await supabase.from('orders').update({
                    order_status: `${process.env.NEXT_PUBLIC_STATUS_PROCESSING}`,
                    approved_by: profile?.id,
                    action_date: new Date().toISOString().split('T')[0]
                }).eq('id', order.id);

                if (error) throw error;
                await fetchOrders();
                sendApprovedOrderEmail(order);
            } catch (err) {
                toast.error("Failed to approve order");
            }
        };

        const calculateDaysShipped = (shippedDate: string | null): number => {
            if (!shippedDate) return 0;
            return Math.ceil(Math.abs(new Date().getTime() - new Date(shippedDate).getTime()) / (1000 * 60 * 60 * 24));
        };

        const calculateEstimatedReturnDate = (shippedDate: string | null): Date | null => {
            if (!shippedDate) return null;
            const date = new Date(shippedDate);
            date.setDate(date.getDate() + 45);
            return date;
        };

        const formatEstimatedReturnDate = (shippedDate: string | null): string => {
            const date = calculateEstimatedReturnDate(shippedDate);
            if (!date) return "-";
            return `${date.getDate().toString().padStart(2, '0')}-${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear()}`;
        };

        const hasReturnDatePassed = (shippedDate: string | null): boolean => {
            const estimated = calculateEstimatedReturnDate(shippedDate);
            if (!estimated) return false;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            estimated.setHours(0, 0, 0, 0);
            return estimated < today;
        };

        const formatDateToCustomFormat = (dateString: string | null) => {
            if (!dateString) return "-";
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return "-";
                return `${date.getDate().toString().padStart(2, '0')}-${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear()}`;
            } catch { return dateString; }
        };

        const calculateDaysOverdue = (shippedDate: string | null): number => Math.max(0, calculateDaysShipped(shippedDate) - 45);

        const handleReject = async () => {
            if (!order || !canApproveReject) return;
            try {
                const currentDate = new Date().toISOString().split('T')[0];

                const allowedPreviousStatuses = [
                    process.env.NEXT_PUBLIC_STATUS_AWAITING,
                    process.env.NEXT_PUBLIC_STATUS_PROCESSING,
                    process.env.NEXT_PUBLIC_STATUS_SHIPPED,
                    process.env.NEXT_PUBLIC_STATUS_EXTENSION,
                    process.env.NEXT_PUBLIC_IN_TRANSIT,
                    process.env.NEXT_PUBLIC_FEDEX_DELIVERED
                ].filter(Boolean);

                if (allowedPreviousStatuses.includes(order.order_status) && order.products && order.quantity) {
                    const orderQuantity = order.quantity || 0;
                    if (orderQuantity > 0) {
                        const newStockQty = Math.max(0, (parseInt(order.products.stock_quantity) || 0) + orderQuantity);
                        const newWithCustomerQty = Math.max(0, (parseInt(order.products.withCustomer) || 0) - orderQuantity);

                        await supabase.from('products').update({
                            stock_quantity: newStockQty.toString(),
                            withCustomer: newWithCustomerQty.toString()
                        }).eq('id', order.product_id);
                    }
                }

                const updateData: any = {
                    order_status: `${process.env.NEXT_PUBLIC_STATUS_REJECTED}`,
                    rejected_by: profile?.id,
                    action_date: currentDate,
                    shipped_date: null,
                    returned_date: null
                };

                const { error } = await supabase.from('orders').update(updateData).eq('id', order.id);
                if (error) throw error;

                setOrders(prev => prev.map(o => o.id === order.id ? {
                    ...o, ...updateData,
                    rejected_user: profile ? { id: profile.id, email: profile.email, name: profile.name || '' } : undefined
                } : o));

                sendRejectedOrderEmail({ ...order, ...updateData });
                toast.success("Order rejected successfully!");
            } catch (err) {
                toast.error("Failed to reject order");
            }
        };

        const handleEditClick = (field: string, value: string, rowId: string) => {
            let canEdit = isAdmin;
            if (!canEdit && isSMRole) {
                canEdit = ["order_status", "tracking", "return_tracking", "tracking_link", "return_tracking_link", "username", "case_type", "password", "product_id"].includes(field);
            }
            if (!canEdit) return;
            setEditingField(field);
            setEditedValue(value || "");
            setEditingRowId(rowId);
        };

        const handleSaveEdit = async (field: string) => {
            if (!order || editingField !== field) return;

            let canEdit = isAdmin;
            if (!canEdit && isSMRole) {
                canEdit = ["order_status", "tracking", "return_tracking", "tracking_link", "return_tracking_link", "username", "case_type", "password", "product_id"].includes(field);
            }
            if (!canEdit) return;

            const oldValue = order[field as keyof Order];

            try {
                const updateData: any = { [field]: editedValue };

                if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_REJECTED) {
                    await handleReject(); setEditingField(null); setEditingRowId(null); setEditedValue(""); return;
                }
                if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                    await handleApprove(); setEditingField(null); setEditingRowId(null); setEditedValue(""); return;
                }

                if (field === "dev_opportunity" || field === "dev_budget") {
                    const devOpp = field === "dev_opportunity" ? parseInt(editedValue) : order.dev_opportunity;
                    const devBud = field === "dev_budget" ? parseFloat(editedValue) : order.dev_budget;
                    if (devOpp && devBud) updateData.rev_opportunity = devOpp * devBud;
                }

                if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED) {
                    const missing = [];
                    if (!order.tracking) missing.push('Tracking Number');
                    if (!order.tracking_link) missing.push('Tracking Link');
                    if (!order.return_tracking) missing.push('Return Tracking Number');
                    if (!order.return_tracking_link) missing.push('Return Tracking Link');
                    const missingLabel = !order.return_label;

                    if (missing.length > 0 || missingLabel) {
                        let msg = missing.length > 0 ? `Please fill: ${missing.join(', ')}` : "";
                        if (missingLabel) { if (msg) msg += " and "; msg += `<span style="color: red; font-weight: bold;">Upload Return Label</span>`; }
                        msg += " before marking as Shipped";
                        toast.error(<div dangerouslySetInnerHTML={{ __html: msg }} />, { duration: 5000, style: { background: "white", color: "black", border: "1px solid #ef4444" } });
                        setIsModalOpen(true);
                        setPendingStatusChange({ field, value: editedValue, rowId: editingRowId || "order" });
                        return;
                    }
                }

                if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_RETURNED) {
                    handleStatusChangeToReturned(field, editedValue); return;
                }

                if (field === "order_status") {
                    const currentDate = new Date().toISOString().split('T')[0];
                    if (editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED || editedValue === process.env.NEXT_PUBLIC_STATUS_EXTENSION) {
                        updateData.shipped_date = currentDate; updateData.returned_date = null;
                    }
                    if ([process.env.NEXT_PUBLIC_STATUS_REJECTED, process.env.NEXT_PUBLIC_STATUS_AWAITING, process.env.NEXT_PUBLIC_STATUS_PROCESSING].includes(editedValue)) {
                        updateData.shipped_date = null; updateData.returned_date = null;
                    }
                }

                setOrders(prev => prev.map(o => {
                    if (o.id !== order.id) return o;
                    const updated: any = { ...o, [field]: editedValue };
                    if (field === "order_status") {
                        if (editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) { updated.approvedBy = profile?.id || null; updated.action_date = new Date().toISOString().split('T')[0]; updated.rejectedBy = null; }
                        if (editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED || editedValue === process.env.NEXT_PUBLIC_STATUS_EXTENSION) { updated.shipped_date = new Date().toISOString().split('T')[0]; updated.returned_date = null; }
                        else if (editedValue === process.env.NEXT_PUBLIC_STATUS_RETURNED) { updated.returned_date = new Date().toISOString().split('T')[0]; updated.shipped_date = null; }
                        else if ([process.env.NEXT_PUBLIC_STATUS_REJECTED, process.env.NEXT_PUBLIC_STATUS_AWAITING, process.env.NEXT_PUBLIC_STATUS_PROCESSING].includes(editedValue)) { updated.shipped_date = null; updated.returned_date = null; }
                    }
                    if (field === "dev_opportunity" || field === "dev_budget") {
                        const devOpp = field === "dev_opportunity" ? parseInt(editedValue) : order.dev_opportunity;
                        const devBud = field === "dev_budget" ? parseFloat(editedValue) : order.dev_budget;
                        if (devOpp && devBud) updated.rev_opportunity = devOpp * devBud;
                    }
                    return updated;
                }));

                const { error } = await supabase.from('orders').update(updateData).eq('id', order.id);
                if (error) { setOrders(prev => prev.map(o => o.id === order.id ? { ...o, [field]: oldValue } : o)); throw error; }

                if (field === "order_status") {
                    const updatedOrder = { ...order, ...updateData };
                    if (editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) sendApprovedOrderEmail(updatedOrder);
                    else if (editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED) sendShippedOrderEmail(updatedOrder);
                }

                setEditingField(null); setEditingRowId(null); setEditedValue("");
                toast.success(`Order updated successfully!`);
            } catch (err) {
                toast.error(`Failed to update ${field}`);
            }
        };

        const handleCancelEdit = () => {
            if (pendingStatusChange) { setPendingStatusChange(null); toast.info("Status change cancelled"); }
            setEditingField(null); setEditingRowId(null); setEditedValue("");
        };

        useEffect(() => {
            if (!isModalOpen && pendingStatusChange) {
                setPendingStatusChange(null); setEditingField(null); setEditingRowId(null); setEditedValue("");
            }
        }, [isModalOpen, pendingStatusChange]);

        const handleTrackingUpdate = async () => {
            if (!order || !canEditTracking) return;
            try {
                const { error } = await supabase.from('orders').update(trackingData).eq('id', order.id);
                if (error) throw error;

                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...trackingData } : o));

                if (pendingStatusChange?.field === "order_status") {
                    setIsModalOpen(false);
                    toast.success("Tracking details saved. Now updating status to Shipped...");

                    const updatedOrderData = { ...order, ...trackingData, order_status: pendingStatusChange.value, shipped_date: new Date().toISOString().split('T')[0] };
                    const { error: statusError } = await supabase.from('orders').update({ order_status: pendingStatusChange.value, shipped_date: new Date().toISOString().split('T')[0] }).eq('id', order.id);
                    if (statusError) throw statusError;

                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...updatedOrderData } : o));
                    sendShippedOrderEmail(updatedOrderData);
                    setEditingField(null); setEditingRowId(null); setEditedValue(""); setPendingStatusChange(null);
                    toast.success("Status updated to Shipped successfully!");
                } else {
                    setIsModalOpen(false);
                    toast.success("Tracking details updated successfully");
                }
            } catch (err) {
                toast.error("Failed to update tracking details");
            }
        };

        const buildEmailBase = (orderData: Order) => ({
            salesExecutive: orderData.sales_executive || "",
            salesExecutiveEmail: orderData.se_email || "",
            companyName: orderData.company_name || "",
            contactName: orderData.contact_name || "",
            contactEmail: orderData.email || "",
            shippingAddress: orderData.address || "",
            city: orderData.city || "",
            state: orderData.state || "",
            zip: orderData.zip || "",
            deliveryDate: orderData.desired_date || "",
            deviceUnits: orderData.dev_opportunity || 0,
            budgetPerDevice: orderData.dev_budget || 0,
            revenue: orderData.rev_opportunity || 0,
            ingramAccount: orderData.ingram_account || "",
            quoteNumber: orderData.quote_number || "",
            competitiveOpportunity: orderData.is_competitive || "",
            estimatedCloseDate: orderData.estimated_close_date || "",
            wants5gSim: orderData.wants_5g_sim || "",
            segment: orderData.segment || "",
            currentManufacturer: orderData.current_manufacturer || "",
            note: orderData.notes || "",
        });

        const sendApprovedOrderEmail = async (orderData: Order) => {
            try {
                if (!orderData.order_by_user?.email || !orderData.products_array?.length) return;
                const products = orderData.products_array.map((p, i) => ({ name: p.product_name || `Product ${i + 1}`, quantity: orderData.quantities_array?.[i] || 0 }));
                const totalQuantity = products.reduce((s, p) => s + p.quantity, 0);
                const template = emailTemplates.approvedOrderEmail({ orderNumber: orderData.order_no, orderDate: orderData.order_date, customerName: orderData.contact_name || "Customer", customerEmail: orderData.order_by_user.email, products, totalQuantity, ...buildEmailBase(orderData) });
                await sendEmail({ to: [orderData.order_by_user.email, ...ApprovedEmail], subject: template.subject, text: template.text, html: template.html });
            } catch (e) { console.error('Error sending approved email:', e); }
        };

        const sendRejectedOrderEmail = async (orderData: Order) => {
            try {
                if (!orderData.order_by_user?.email || !orderData.products_array?.length) return;
                const products = orderData.products_array.map((p, i) => ({ name: p.product_name || `Product ${i + 1}`, quantity: orderData.quantities_array?.[i] || 0 }));
                const totalQuantity = products.reduce((s, p) => s + p.quantity, 0);
                const template = emailTemplates.rejectedOrderEmail({ orderNumber: orderData.order_no, orderDate: orderData.order_date, customerName: orderData.contact_name || "Customer", customerEmail: orderData.order_by_user.email, products, totalQuantity, ...buildEmailBase(orderData) });
                await sendEmail({ to: orderData.order_by_user.email, subject: template.subject, text: template.text, html: template.html });
            } catch (e) { console.error('Error sending rejected email:', e); }
        };

        const sendReturnedOrderEmail = async (orderData: Order, returnedProductsData: typeof returnedProducts) => {
            try {
                if (!orderData.order_by_user?.email || !orderData.products_array?.length) return;
                const products = orderData.products_array.map((p, i) => {
                    const shipped = orderData.quantities_array?.[i] || 0;
                    const returned = returnedProductsData.find(rp => rp.productId === p.id)?.returnedQuantity || 0;
                    return { name: p.product_name || `Product ${i + 1}`, shippedQuantity: shipped, returnedQuantity: returned, leftWithCustomer: shipped - returned };
                });
                const totalShipped = products.reduce((s, p) => s + p.shippedQuantity, 0);
                const totalReturned = products.reduce((s, p) => s + p.returnedQuantity, 0);
                const template = emailTemplates.returnedOrderEmail({ orderNumber: orderData.order_no, orderDate: orderData.order_date, customerName: orderData.contact_name || "Customer", customerEmail: orderData.order_by_user.email, products, totalQuantity: totalShipped, totalReturned, totalLeft: totalShipped - totalReturned, ...buildEmailBase(orderData) });
                await sendEmail({ to: [orderData.order_by_user.email, ...ReturnedEmail], subject: template.subject, text: template.text, html: template.html });
            } catch (e) { console.error('Error sending returned email:', e); }
        };

        const sendShippedOrderEmail = async (orderData: Order) => {
            try {
                if (!orderData.order_by_user?.email || !orderData.products_array?.length) return;
                const products = orderData.products_array.map((p, i) => ({ name: p.product_name || `Product ${i + 1}`, quantity: orderData.quantities_array?.[i] || 0 }));
                const totalQuantity = products.reduce((s, p) => s + p.quantity, 0);
                const template = emailTemplates.shippedOrderEmail({ orderNumber: orderData.order_no, orderDate: orderData.order_date, customerName: orderData.contact_name || "Customer", customerEmail: orderData.order_by_user.email, orderTracking: orderData.tracking || "", orderTrackingLink: orderData.tracking_link || "", returnTracking: orderData.return_tracking || "", returnTrackingLink: orderData.return_tracking_link || "", caseType: orderData.case_type || "", fileLink: orderData.return_label || "", products, totalQuantity, ...buildEmailBase(orderData) });
                await sendEmail({ to: [orderData.order_by_user.email, ...ShippedEmail], subject: template.subject, text: template.text, html: template.html });
            } catch (e) { console.error('Error sending shipped email:', e); }
        };

        const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
            if (!order || !canUploadReturnLabel) return;
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setUploadError('Please upload a valid PDF file'); return; }
            try {
                setIsUploading(true); setUploadError(null);
                const filePath = `return-labels/${order.order_no}/${Date.now()}-${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage.from('ingram').upload(filePath, file, { cacheControl: '3600', upsert: true });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('ingram').getPublicUrl(filePath);
                const { error: updateError } = await supabase.from('orders').update({ return_label: publicUrl }).eq('id', order.id);
                if (updateError) throw updateError;
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, return_label: publicUrl } : o));
                event.target.value = '';
            } catch (err: any) {
                setUploadError(err.message || 'Failed to upload file.');
            } finally { setIsUploading(false); }
        };

        const handleProductSelect = async (productId: string) => {
            if (!order || !(isAdmin || isSMRole)) { toast.error("You don't have permission to change product"); return; }
            try {
                const { error } = await supabase.from('orders').update({ product_id: productId }).eq('id', order.id);
                if (error) throw error;
                toast.success("Product updated successfully!");
                await fetchOrders();
                setEditingField(null); setEditingRowId(null); setEditedValue("");
            } catch (err) { toast.error("Failed to update product"); }
        };

        if (loading || isLoading) return <div className="flex items-center justify-center h-screen"><div className="text-lg">Loading...</div></div>;
        if (!isAuthorized) return <div className="flex items-center justify-center h-screen"><div className="text-lg">Redirecting...</div></div>;
        if (error) return <div className="flex items-center justify-center h-screen"><div className="text-lg text-red-600">Error: {error}</div></div>;
        if (orders.length === 0) return <div className="flex items-center justify-center h-screen"><div className="text-lg">No order found</div></div>;

        const order = orders[0];

        const renderEditableCell = (field: string, value: any, rowId: string = "order") => {
            const isEditing = editingField === field && editingRowId === rowId;
            let canEdit = isAdmin;
            if (!canEdit && isSMRole) canEdit = ["tracking", "return_tracking", "tracking_link", "return_tracking_link", "username", "case_type", "password"].includes(field);

            if (isEditing) return (
                <div className="flex items-center gap-2">
                    <Input value={editedValue} onChange={(e) => setEditedValue(e.target.value)} className="flex-1" autoFocus />
                    <Button size="sm" onClick={() => handleSaveEdit(field)} className="bg-[#1D76BC] hover:bg-[#1660a0] cursor-pointer" disabled={!canEdit}>Save</Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="cursor-pointer" disabled={!canEdit}>Cancel</Button>
                </div>
            );

            return (
                <div className="flex items-center justify-between group">
                    <span>{value || "-"}</span>
                    {canEdit && <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer" onClick={() => handleEditClick(field, value, rowId)}><Pencil className="h-3 w-3" /></Button>}
                </div>
            );
        };

        const renderStatusDropdown = (field: string, value: any, rowId: string = "order") => {
            const isEditing = editingField === field && editingRowId === rowId;
            const isPendingShipped = pendingStatusChange?.field === field && pendingStatusChange?.value === process.env.NEXT_PUBLIC_STATUS_SHIPPED && pendingStatusChange?.rowId === rowId;
            const isPendingReturned = pendingStatusChange?.field === field && pendingStatusChange?.value === process.env.NEXT_PUBLIC_STATUS_RETURNED && pendingStatusChange?.rowId === rowId;

            if (isEditing || isPendingShipped || isPendingReturned) return (
                <div className="flex items-center gap-2">
                    <Select value={isPendingShipped || isPendingReturned ? pendingStatusChange!.value : editedValue}
                        onValueChange={(val) => val === process.env.NEXT_PUBLIC_STATUS_RETURNED ? handleStatusChangeToReturned(field, val, rowId) : setEditedValue(val)}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => { if (editedValue !== process.env.NEXT_PUBLIC_STATUS_RETURNED) handleSaveEdit(field); }} className="bg-[#1D76BC] hover:bg-[#1660a0] cursor-pointer" disabled={!canEditStatus}>
                        {isPendingShipped ? "Awaiting Tracking..." : isPendingReturned ? "Processing Return..." : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { if (pendingStatusChange) setPendingStatusChange(null); handleCancelEdit(); }} className="cursor-pointer" disabled={!canEditStatus}>Cancel</Button>
                    {isPendingShipped && <div className="text-xs text-amber-600 ml-2">Please complete tracking details</div>}
                    {isPendingReturned && <div className="text-xs text-amber-600 ml-2">Please verify returned products in modal</div>}
                </div>
            );

            return (
                <div className="flex items-center justify-between group">
                    <span>{statusOptions.find(o => o.value === value)?.label || value}</span>
                    {canEditStatus && <Button size="sm" variant="ghost" className="group h-6 w-6 p-0 cursor-pointer" onClick={() => { setEditingField(field); setEditedValue(value || ""); setEditingRowId(rowId); }}><Pencil className="h-3 w-3" /></Button>}
                </div>
            );
        };

        const renderReturnLabelUpload = (field: string, currentValue: any) => (
            <div className="flex flex-col items-center justify-center gap-2">
                {currentValue ? <Link href={currentValue} target="_blank" rel="noopener noreferrer" className="bg-[#1D76BC] text-white px-4 py-2 rounded-md hover:bg-[#1660a0] cursor-pointer">View Return Label (PDF)</Link>
                    : <span className="text-gray-500">No Return Label uploaded</span>}
                {uploadError && <div className="text-sm text-red-600 mt-1 text-center">{uploadError}</div>}
                {canUploadReturnLabel && (
                    <div className="mt-2">
                        <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" id="return-label-upload" />
                        <label htmlFor="return-label-upload" className="inline-flex items-center justify-center px-3 py-1.5 text-sm bg-[#1D76BC] text-white rounded-md hover:bg-[#1660a0] cursor-pointer">
                            {isUploading ? "Uploading..." : currentValue ? "Replace PDF" : "Upload PDF"}
                        </label>
                    </div>
                )}
            </div>
        );

        const renderNotesCell = () => {
            const isEditing = editingField === "notes" && editingRowId === "notes";
            if (isEditing) return (
                <div className="flex items-center gap-2">
                    <Input value={editedValue} onChange={(e) => setEditedValue(e.target.value)} className="flex-1" autoFocus />
                    <Button size="sm" onClick={() => handleSaveEdit("notes")} className="bg-[#1D76BC] hover:bg-[#1660a0] cursor-pointer" disabled={!canEditAll}>Save</Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="cursor-pointer" disabled={!canEditAll}>Cancel</Button>
                </div>
            );
            return (
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <b className="block mb-2">Notes:</b>
                        <div className="whitespace-pre-wrap wrap-break-word max-h-30 overflow-y-auto pr-2 border border-gray-200 rounded p-2 bg-white">{order.notes || "No notes available"}</div>
                    </div>
                    {canEditAll && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-2 cursor-pointer shrink-0" onClick={() => handleEditClick("notes", order.notes || "", "notes")}><Pencil className="h-3 w-3" /></Button>}
                </div>
            );
        };

        const renderTrackingSection = () => {
            const isReturnLabelMissing = !order.return_label;
            return (
                <div className="space-y-6">
                    <Table className="border">
                        <TableHeader>
                            <TableRow><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }} colSpan={2}>Tracking & Return Tracking</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-semibold">Tracking</TableCell>
                                <TableCell className="border-l">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {order.tracking ? (order.tracking_link ? <Link href={order.tracking_link} target="_blank" className="text-[#1D76BC] underline font-bold cursor-pointer">{order.tracking}</Link> : <span>{order.tracking}</span>) : <span className="text-gray-500">No tracking available</span>}
                                        </div>
                                        {canEditTracking && (
                                            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 cursor-pointer"><Pencil className="h-3 w-3 text-black" /></Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto overflow-x-hidden">
                                                    <DialogHeader><DialogTitle>Edit Tracking Details</DialogTitle></DialogHeader>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                                        <div className="space-y-2"><label className="text-sm font-medium">Tracking Number</label><Input value={trackingData.tracking} onChange={(e) => setTrackingData({ ...trackingData, tracking: e.target.value })} placeholder="Enter tracking number" /></div>
                                                        <div className="space-y-2"><label className="text-sm font-medium">Return Tracking Number</label><Input value={trackingData.return_tracking} onChange={(e) => setTrackingData({ ...trackingData, return_tracking: e.target.value })} placeholder="Enter return tracking number" /></div>
                                                        <div className="space-y-2"><label className="text-sm font-medium">Tracking Link</label><Input value={trackingData.tracking_link} onChange={(e) => setTrackingData({ ...trackingData, tracking_link: e.target.value })} placeholder="Enter tracking link" type="url" /></div>
                                                        <div className="space-y-2"><label className="text-sm font-medium">Return Tracking Link</label><Input value={trackingData.return_tracking_link} onChange={(e) => setTrackingData({ ...trackingData, return_tracking_link: e.target.value })} placeholder="Enter return tracking link" type="url" /></div>
                                                        <div className="space-y-2"><label className="text-sm font-medium">Username</label><Input value={trackingData.username} onChange={(e) => setTrackingData({ ...trackingData, username: e.target.value })} placeholder="Enter username" /></div>
                                                        <div className="space-y-2"><label className="text-sm font-medium">Case Type</label><Input value={trackingData.case_type} onChange={(e) => setTrackingData({ ...trackingData, case_type: e.target.value })} placeholder="Enter case type" /></div>
                                                        <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium">Password</label><Input value={trackingData.password} onChange={(e) => setTrackingData({ ...trackingData, password: e.target.value })} placeholder="Enter password" type="password" /></div>
                                                    </div>
                                                    {isReturnLabelMissing && (
                                                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                                                            <div className="flex items-start"><span className="text-red-600 mr-2">⚠️</span>
                                                                <div><strong className="text-red-700">Return Label Required:</strong><p className="text-red-600 text-sm mt-1">After saving tracking details, please upload the Return Label below. Order cannot be marked as Shipped without Return Label.</p></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-end space-x-2 pt-4">
                                                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="cursor-pointer">Cancel</Button>
                                                        <Button onClick={handleTrackingUpdate} className="bg-[#1D76BC] hover:bg-[#1660a0] cursor-pointer" disabled={!canEditTracking}>Save Changes</Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-semibold">Return Tracking</TableCell>
                                <TableCell className="border-l">
                                    {order.return_tracking ? (order.return_tracking_link ? <Link href={order.return_tracking_link} target="_blank" className="text-[#1D76BC] underline font-bold cursor-pointer">{order.return_tracking}</Link> : <span>{order.return_tracking}</span>) : <span className="text-gray-500">No return tracking available</span>}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    <Table className="border">
                        <TableHeader>
                            <TableRow>
                                <TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }} colSpan={2}>
                                    Return Label {isReturnLabelMissing && <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded">Required</span>}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow><TableCell colSpan={2} className="text-center">{renderReturnLabelUpload("return_label", order.return_label)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </div>
            );
        };

        return (
            <div className="container mx-auto py-10 px-5">
                {order.order_status !== process.env.NEXT_PUBLIC_STATUS_AWAITING && profile?.role !== process.env.NEXT_PUBLIC_SUBSCRIBER && (
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold">Order #{order.order_no}</h1>
                        <p className="text-gray-600 mt-2">Order Date: {formatDateToCustomFormat(order.order_date)}</p>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-[72%] space-y-6">

                        {/* Approve/Reject or Approved By */}
                        <div>
                            {order.order_status === process.env.NEXT_PUBLIC_STATUS_AWAITING && profile?.role !== process.env.NEXT_PUBLIC_SUBSCRIBER ? (
                                <>
                                    {canApproveReject && (
                                        <Table className="hover:bg-white">
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell colSpan={2}>
                                                        <div className="flex">
                                                            <Button onClick={handleApprove} className="bg-[#267d5a] hover:bg-[#267d5a] text-white cursor-pointer flex items-center gap-2" disabled={!canApproveReject}><CheckCircle size={18} />Approve Order</Button>
                                                            <Button onClick={handleReject} className="bg-white border border-red-700 hover:bg-red-700 text-red-800 hover:text-white cursor-pointer mx-4 flex items-center gap-2" variant="destructive" disabled={!canApproveReject}><XCircle size={18} />Reject Order</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    )}
                                    <div className="my-6">
                                        <h1 className="text-2xl font-bold">Order #{order.order_no}</h1>
                                        <p className="text-gray-600 mt-2">Order Date: {formatDateToCustomFormat(order.order_date)}</p>
                                    </div>
                                </>
                            ) : (
                                <Table className="border">
                                    {order.order_status === process.env.NEXT_PUBLIC_STATUS_REJECTED ? (
                                        <>
                                            <TableHeader><TableRow><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }}>Rejected By</TableHead><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }}>Date</TableHead></TableRow></TableHeader>
                                            <TableBody><TableRow><TableCell>{order.rejected_user?.email || order.rejectedBy || "N/A"}</TableCell><TableCell>{order.action_date ? formatActionDate(order.action_date) : "-"}</TableCell></TableRow></TableBody>
                                        </>
                                    ) : (
                                        <>
                                            <TableHeader><TableRow><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }}>Approved By</TableHead><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }}>Date</TableHead></TableRow></TableHeader>
                                            <TableBody><TableRow><TableCell>{order.approved_user?.email || order.approvedBy || "-"}</TableCell><TableCell>{order.action_date ? formatActionDate(order.action_date) : "-"}</TableCell></TableRow></TableBody>
                                        </>
                                    )}
                                </Table>
                            )}
                        </div>

                        {/* Products */}
                        <div>
                            <Table className="border">
                                <TableHeader><TableRow><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }} className="w-[85%]">Products</TableHead><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }} className="w-[15%]">Quantity</TableHead></TableRow></TableHeader>
                                <TableBody>{renderAllProducts()}</TableBody>
                            </Table>
                        </div>

                        {/* Team Details - Sales Executive only */}
                        <div>
                            <Table className="border">
                                <TableHeader><TableRow><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }} colSpan={2}>Team Details</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="w-[65%] font-semibold">Sales Executive</TableCell>
                                        <TableCell className="w-[35%] border-l">{renderEditableCell("sales_executive", order.sales_executive, "team_sales_executive")}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="w-[65%] font-semibold">Sales Executive Email</TableCell>
                                        <TableCell className="w-[35%] border-l">{renderEditableCell("se_email", order.se_email, "team_se_email")}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Shipping Details */}
                        <div>
                            <Table className="border">
                                <TableHeader><TableRow><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }} colSpan={2}>Shipping Details</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Company Name</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("company_name", order.company_name, "shipping_company")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Contact Name</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("contact_name", order.contact_name, "shipping_contact")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Email Address</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("email", order.email, "shipping_email")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Shipping Address</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("address", order.address, "shipping_address")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">City</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("city", order.city, "shipping_city")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">State</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("state", order.state, "shipping_state")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Zip</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("zip", order.zip, "shipping_zip")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Desired Demo Delivery Date</TableCell><TableCell className="w-[35%] border-l">{formatDateToCustomFormat(order.desired_date)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Opportunity Details - New Fields */}
                        <div>
                            <Table className="border">
                                <TableHeader><TableRow><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }} colSpan={2}>Opportunity Details</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Device Opportunity Size (Units)</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("dev_opportunity", order.dev_opportunity, "opp_units")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Budget Per Device ($)</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("dev_budget", order.dev_budget, "opp_budget")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Revenue Opportunity Size ($ Device Rev)</TableCell><TableCell className="w-[35%] border-l">{order.rev_opportunity ? `$${order.rev_opportunity}` : "-"}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">INGRAM Account #</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("ingram_account", order.ingram_account, "opp_ingram")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Quote #</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("quote_number", order.quote_number, "opp_quote")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Segment</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("segment", order.segment, "opp_segment")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Current Manufacturer</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("current_manufacturer", order.current_manufacturer, "opp_manufacturer")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Is this a competitive opportunity?</TableCell><TableCell className="w-[35%] border-l">{renderEditableCell("is_competitive", order.is_competitive ? "Yes" : "No", "opp_competitive")}</TableCell></TableRow>
                                    <TableRow><TableCell className="w-[65%] font-semibold">Estimated Close Date</TableCell><TableCell className="w-[35%] border-l">{formatDateToCustomFormat(order.estimated_close_date)}</TableCell></TableRow>
                                    {order.wants_5g_sim && (
                                        <TableRow><TableCell className="w-[65%] font-semibold">Wants 5G SIM (AT&T)?</TableCell><TableCell className="w-[35%] border-l">{order.wants_5g_sim}</TableCell></TableRow>
                                    )}
                                    <TableRow><TableCell colSpan={2} className="py-3">{renderNotesCell()}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="lg:w-[28%] space-y-6">
                        <div>
                            {!isSubscriber && !isSMRole && order.order_status === "Awaiting Approval" && <div className="mb-40"></div>}
                            {isSMRole && order.order_status === "Awaiting Approval" && <div className="mb-28"></div>}
                            <Table className="border">
                                <TableHeader><TableRow><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }} colSpan={2}>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={2}>
                                            {order.order_status === process.env.NEXT_PUBLIC_STATUS_AWAITING
                                                ? order.order_status === "Shipped Extension" ? "Shipped (Order Extension)" : order.order_status
                                                : renderStatusDropdown("order_status", order.order_status, "status")}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {renderTrackingSection()}

                        {order.shipped_date && !isSubscriber && (
                            <div>
                                <Table className="border">
                                    <TableHeader><TableRow><TableHead style={{ backgroundColor: '#1D76BC', color: 'white' }} colSpan={2}>Win Status</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {order.wins && order.wins.length === 0 && (
                                            <>
                                                <TableRow>
                                                    <TableCell className="font-semibold">Days Since Shipped</TableCell>
                                                    <TableCell className="border-l">
                                                        {order.shipped_date ? (() => { const days = calculateDaysShipped(order.shipped_date); const overdue = calculateDaysOverdue(order.shipped_date) > 0; return <span className={overdue ? "text-red-600 font-semibold" : ""}>{days} days</span>; })() : <span className="text-gray-500">Not shipped yet</span>}
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-semibold">Expected Return Date</TableCell>
                                                    <TableCell className="border-l">
                                                        {order.shipped_date ? (() => { const passed = hasReturnDatePassed(order.shipped_date); return <span className={passed ? "text-red-600 font-semibold" : ""}>{formatEstimatedReturnDate(order.shipped_date)}</span>; })() : <span className="text-gray-500">Not shipped yet</span>}
                                                    </TableCell>
                                                </TableRow>
                                            </>
                                        )}
                                        <TableRow>
                                            <TableCell className="font-semibold">Win Status</TableCell>
                                            <TableCell className="border-l">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        {order.wins && order.wins.length > 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-green-600 font-semibold">Win Reported</span>
                                                                {order.wins[0]?.id && <Link href={`/view-windetails/${order.wins[0].id}`} target="_blank" className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" title="View Win Details"><ExternalLink className="h-4 w-4 ml-1" /></Link>}
                                                            </div>
                                                        ) : <span className="text-amber-600 font-semibold">Win Not Reported</span>}
                                                    </div>
                                                    {order.wins && order.wins.length > 1 && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0 cursor-pointer"><ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Multiple Wins</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                {order.wins.map((win, index) => (
                                                                    <DropdownMenuItem key={win?.id}>
                                                                        <Link href={`/view-windetails/${win?.id}`} target="_blank" className="flex items-center gap-2 w-full cursor-pointer"><ExternalLink className="h-3 w-3" />Win #{index + 1}</Link>
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
                {renderReturnModal()}
            </div>
        );
    }