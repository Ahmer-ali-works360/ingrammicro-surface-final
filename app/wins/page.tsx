"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { emailTemplates, sendEmail } from "@/lib/email";
import { logAuth, logError, logSuccess, logWarning, logInfo } from "@/lib/logger";

// Role constants
const shopManager = process.env.NEXT_PUBLIC_SHOPMANAGER;
const subscriber = process.env.NEXT_PUBLIC_SUBSCRIBER;
const statusAwaiting = process.env.NEXT_PUBLIC_STATUS_AWAITING;
const statusRejected = process.env.NEXT_PUBLIC_STATUS_REJECTED;

export default function Page() {
    const { profile, isLoggedIn, loading } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        submittedBy: profile?.email || "",
        orderNumber: "",
        deviceType: "product",         // "product" or "other"
        selectedProductId: "",         // selected product id
        otherPartNumber: "",           // SKU/Part# for other device
        resellerAccountNumber: "",
        customerName: "",
        numberOfUnits: "",
        totalDealRevenue: "",
        purchaseType: "",
        purchaseDate: "",
        howHelped: "",
    });
    const router = useRouter();

    const isShopManager = profile?.role === shopManager;
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [products, setProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const source = `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/wins`;

    // Handle auth check
    useEffect(() => {
        if (loading) return;
        if (!isLoggedIn || !profile?.isVerified) {
            router.replace(`/login/?redirect_to=wins`);
            return;
        }
        if (isShopManager) {
            toast.error("Access denied. Admin privileges required.");
            router.replace('/product-category/alldevices');
            return;
        }
    }, [loading, isLoggedIn, profile, router, isShopManager]);

    const fetchOrders = async () => {
        const startTime = Date.now();
        try {
            setIsLoading(true);

            const { data: allWins, error: winsError } = await supabase
                .from('wins')
                .select('order_id')
                .not('order_id', 'is', null);

            let excludedOrderIds: string[] = [];
            if (!winsError && allWins) {
                excludedOrderIds = [...new Set(allWins.map(win => win.order_id).filter(id => id))];
            }

            let query = supabase
                .from('orders')
                .select('*')
                .order('order_no', { ascending: false });

            if (statusAwaiting && statusRejected) {
                query = query.not('order_status', 'in', `(${statusAwaiting},${statusRejected})`);
            }

            if (profile?.role === subscriber || profile?.role === shopManager) {
                query = query.eq('order_by', profile?.id);
            }

            const { data, error } = await query;

            if (error) {
                logError('db', 'orders_fetch_failed', `Failed to fetch orders: ${error.message}`, error, profile?.id, source);
                return;
            }

            const filteredData = data?.filter(order => !excludedOrderIds.includes(order.id)) || [];

            const formattedData = filteredData.map(order => {
                let productIds: string[] = [];
                if (order.product_id) {
                    if (typeof order.product_id === 'string') {
                        try {
                            const parsed = JSON.parse(order.product_id);
                            if (Array.isArray(parsed)) productIds = parsed;
                        } catch {
                            if (order.product_id.includes(',')) {
                                productIds = order.product_id.split(',').map((id: string) => id.trim().replace(/[\[\]"]/g, ''));
                            } else if (order.product_id.trim() !== '') {
                                productIds = [order.product_id.replace(/[\[\]"]/g, '')];
                            }
                        }
                    } else if (Array.isArray(order.product_id)) {
                        productIds = order.product_id;
                    }
                }
                return { ...order, _product_ids: productIds };
            });

            setOrders(formattedData);

            logSuccess('db', 'orders_fetch_success', `Successfully fetched ${formattedData.length} orders`, {
                totalOrders: data?.length || 0,
                filteredOrders: formattedData.length,
                executionTime: Date.now() - startTime,
            }, profile?.id, source);

        } catch (error: any) {
            logError('system', 'orders_fetch_exception', `Exception: ${error.message}`, error, profile?.id, source);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch products when order is selected
    useEffect(() => {
        if (formData.orderNumber) {
            const orderNumber = parseInt(formData.orderNumber);
            const selectedOrder = orders.find(order => order.order_no === orderNumber);

            if (selectedOrder) {
                const fetchProductsForOrder = async () => {
                    setLoadingProducts(true);
                    const productIds = selectedOrder._product_ids || [];

                    if (productIds.length > 0) {
                        const { data: fetchedProducts, error } = await supabase
                            .from('products')
                            .select('id, product_name, sku')
                            .in('id', productIds);

                        if (!error && fetchedProducts && fetchedProducts.length > 0) {
                            const orderProducts = fetchedProducts.map(p => ({
                                id: p.id,
                                name: p.product_name || "Unknown Product",
                                sku: p.sku || "",
                            }));
                            setProducts(orderProducts);

                            setFormData(prev => ({
                                ...prev,
                                deviceType: "product",
                                selectedProductId: orderProducts[0].id,
                                otherPartNumber: "",
                                customerName: selectedOrder.company_name || "",
                                resellerAccountNumber: selectedOrder.crm_account || prev.resellerAccountNumber,
                                numberOfUnits: selectedOrder.dev_opportunity?.toString() || prev.numberOfUnits,
                                totalDealRevenue: selectedOrder.rev_opportunity !== null && selectedOrder.rev_opportunity !== undefined
                                    ? Math.round(Number(selectedOrder.rev_opportunity)).toString()
                                    : prev.totalDealRevenue,
                                purchaseType: "",
                                purchaseDate: "",
                                howHelped: "",
                            }));
                        } else {
                            setProducts([]);
                            setFormData(prev => ({
                                ...prev,
                                deviceType: "other",
                                selectedProductId: "",
                                otherPartNumber: "",
                                purchaseType: "",
                                purchaseDate: "",
                                howHelped: "",
                            }));
                        }
                    } else {
                        setProducts([]);
                        setFormData(prev => ({
                            ...prev,
                            deviceType: "other",
                            selectedProductId: "",
                            otherPartNumber: "",
                            purchaseType: "",
                            purchaseDate: "",
                            howHelped: "",
                        }));
                    }
                    setLoadingProducts(false);
                };

                fetchProductsForOrder();
            } else {
                setProducts([]);
                setFormData(prev => ({
                    ...prev,
                    deviceType: "product",
                    selectedProductId: "",
                    otherPartNumber: "",
                    customerName: "",
                    resellerAccountNumber: "",
                    numberOfUnits: "",
                    totalDealRevenue: "",
                    purchaseType: "",
                    purchaseDate: "",
                    howHelped: "",
                }));
            }
        } else {
            setProducts([]);
            setFormData(prev => ({
                ...prev,
                deviceType: "product",
                selectedProductId: "",
                otherPartNumber: "",
                customerName: "",
                resellerAccountNumber: "",
                numberOfUnits: "",
                totalDealRevenue: "",
                purchaseType: "",
                purchaseDate: "",
                howHelped: "",
            }));
        }
    }, [formData.orderNumber, orders]);

    // Auth + fetch orders
    useEffect(() => {
        if (loading) return;
        if (!isLoggedIn || !profile?.isVerified) {
            logAuth('access_denied', 'Unauthorized access to wins page', profile?.id, {}, 'failed', source);
            router.replace('/login/?redirect_to=wins');
            return;
        }
        logAuth('page_access', `User accessed wins reporting page`, profile.id, { role: profile.role }, 'completed', source);
        fetchOrders();
    }, [loading, isLoggedIn, profile, router]);

    const validateField = (name: string, value: any) => {
        let error = "";
        switch (name) {
            case "submittedBy":
                if (!value.trim()) error = "Email is required";
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Please enter a valid email";
                break;
            case "orderNumber":
                if (!value) error = "Order number is required";
                break;
            case "selectedProductId":
                if (formData.deviceType === "product" && !value) error = "Please select a product";
                break;
            case "otherPartNumber":
                if (formData.deviceType === "other" && !value.trim()) error = "Part number / SKU is required";
                break;
            case "resellerAccountNumber":
                if (!value.trim()) error = "Account number is required";
                break;
            case "customerName":
                if (!value.trim()) error = "Customer name is required";
                break;
            case "numberOfUnits":
                if (!value) error = "Number of units is required";
                else if (parseInt(value) < 1) error = "Must be at least 1 unit";
                break;
            case "totalDealRevenue":
                if (!value) error = "Total deal revenue is required";
                else if (parseFloat(value) < 0) error = "Revenue cannot be negative";
                break;
            case "purchaseType":
                if (!value) error = "Please select purchase type";
                break;
            case "purchaseDate":
                if (!value) error = "Purchase date is required";
                break;
            case "howHelped":
                if (!value.trim()) error = "This field is required";
                break;
        }
        return error;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'radio' && name === "deviceType") {
            setFormData(prev => ({
                ...prev,
                deviceType: value,
                selectedProductId: value === "product" && products.length > 0 ? products[0].id : "",
                otherPartNumber: "",
            }));
            setErrors(prev => ({ ...prev, selectedProductId: "", otherPartNumber: "" }));
        } else if (name === "totalDealRevenue") {
            const numValue = parseInt(value);
            setFormData(prev => ({
                ...prev,
                [name]: !isNaN(numValue) ? numValue.toString() : value === "" ? "" : value
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        Object.keys(formData).forEach(key => {
            if (key === "selectedProductId" && formData.deviceType === "other") return;
            if (key === "otherPartNumber" && formData.deviceType === "product") return;

            const value = formData[key as keyof typeof formData];
            const error = validateField(key, value);
            if (error) newErrors[key] = error;
        });
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            logWarning('validation', 'form_validation_failed', `Form validation failed`, { errors: newErrors }, profile?.id, source);
        }
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const startTime = Date.now();

        if (!validateForm()) {
            const firstError = Object.keys(errors)[0];
            const element = document.getElementsByName(firstError)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
            return;
        }

        try {
            const orderNumber = parseInt(formData.orderNumber);
            const selectedOrder = orders.find(order => order.order_no === orderNumber);

            if (!selectedOrder) {
                toast.error("Order not found!", { style: { background: "red", color: "white" } });
                return;
            }

            const orderHash = selectedOrder.orderHash || "";
            const isOther = formData.deviceType === "other";
            const selectedProduct = products.find(p => p.id === formData.selectedProductId);
            const deviceName = isOther ? formData.otherPartNumber : (selectedProduct?.name || "");

            const winData = {
                product_id: isOther ? null : formData.selectedProductId,
                order_id: selectedOrder.id,
                user_id: profile?.id,
                submitted_by: formData.submittedBy,
                isOther: isOther,
                otherDesc: isOther ? formData.otherPartNumber : null,
                reseller: "",
                orderHash: orderHash,
                resellerAccount: formData.resellerAccountNumber,
                customerName: formData.customerName,
                units: parseInt(formData.numberOfUnits),
                deal_rev: parseFloat(formData.totalDealRevenue),
                purchaseType: formData.purchaseType,
                purchaseDate: formData.purchaseDate,
                notes: formData.howHelped,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase.from('wins').insert([winData]).select();
            if (error) throw error;

            logSuccess('win', 'win_submission_success', `Win reported for order #${selectedOrder.order_no}`, {
                orderId: selectedOrder.id,
                executionTime: Date.now() - startTime,
            }, profile?.id, source);

            await sendWinEmail({
                ...winData,
                order_no: selectedOrder.order_no,
                order_date: selectedOrder.order_date,
                product_details: [{ name: deviceName, quantity: parseInt(formData.numberOfUnits), sku: selectedProduct?.sku || "" }]
            });

            setOrders(prev => prev.filter(order => order.order_no !== orderNumber));

            setFormData({
                submittedBy: profile?.email || "",
                orderNumber: "",
                deviceType: "product",
                selectedProductId: "",
                otherPartNumber: "",
                resellerAccountNumber: "",
                customerName: "",
                numberOfUnits: "",
                totalDealRevenue: "",
                purchaseType: "",
                purchaseDate: "",
                howHelped: "",
            });
            setProducts([]);

            setTimeout(() => { router.push('/thanks?_=thanks'); }, 50);

        } catch (error: any) {
            logError('db', 'win_submission_failed', `Failed to submit win: ${error.message}`, error, profile?.id, source);
            toast.error(`Error: ${error.message || "Failed to submit win"}`, { style: { background: "red", color: "white" } });
        }
    };

    const sendWinEmail = async (oData: any) => {
        try {
            let productRowsHTML = '';
            let productText = '';
            let totalQuantity = 0;

            if (oData.product_details && Array.isArray(oData.product_details)) {
                productRowsHTML = oData.product_details.map((p: any) => `
                    <tr><td style="padding:10px; border:1px solid #ddd;">${p.name}</td></tr>
                `).join('');
                productText = oData.product_details.map((p: any, i: number) => `${i + 1}. ${p.name} (Quantity: ${p.quantity})`).join('\n');
                totalQuantity = oData.product_details.reduce((sum: number, p: any) => sum + p.quantity, 0);
            }

            const template = emailTemplates.reportWinEmail({
                orderNumber: oData.order_no || "N/A",
                ingramOrderNumber: oData.orderHash || "N/A",
                orderDate: oData.order_date,
                customerName: oData.customerName,
                submittedEmail: oData.submitted_by,
                productName: productText,
                productDetails: productRowsHTML,
                quantity: totalQuantity,
                resellerAccount: oData.resellerAccount,
                units: oData.units,
                pType: oData.purchaseType,
                dealRev: oData.deal_rev,
                reseller: oData.reseller,
                notes: oData.notes,
            });

            await sendEmail({
                to: oData.submitted_by,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });

        } catch (error: any) {
            logError('email', 'win_email_exception', `Exception: ${error.message}`, error, profile?.id, source);
            toast.error("Failed to send win email. Please try again.");
        }
    };

    if (loading || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D76BC] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const inputClass = (field: string) =>
        `w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors[field]
            ? "border-red-500 focus:ring-2 focus:ring-red-300"
            : "border-gray-300 focus:border-[#1D76BC] focus:ring-2 focus:ring-[#1D76BC]/30"
        }`;

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-4xl">
                        Report a Win
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-xl p-5 sm:p-6 md:p-8">

                    {/* Submitted By */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Submitted by <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="email"
                            name="submittedBy"
                            value={formData.submittedBy}
                            disabled
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-500 bg-gray-100 cursor-not-allowed text-sm"
                        />
                        {errors.submittedBy && <p className="mt-1 text-sm text-red-600">{errors.submittedBy}</p>}
                    </div>

                    {/* Order # and Devices */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Left - Order # */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Ingrammicro Surface Order # <span className="text-red-600">*</span>
                            </label>
                            <select
                                name="orderNumber"
                                value={formData.orderNumber}
                                onChange={handleChange}
                                className={`${inputClass('orderNumber')} bg-white`}
                            >
                                <option value="">Select Your Order #</option>
                                {orders.map(order => (
                                    <option key={order.id} value={order.order_no}>
                                        Order #{order.order_no}
                                    </option>
                                ))}
                            </select>
                            {orders.length === 0 && !isLoading && (
                                <p className="mt-2 text-sm text-gray-500">No orders available to report wins.</p>
                            )}
                            {errors.orderNumber && <p className="mt-1 text-sm text-red-600">{errors.orderNumber}</p>}

                            {/* Other Part# / SKU field - order dropdown ke neeche */}
                            {formData.orderNumber && formData.deviceType === "other" && (
                                <div className="mt-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Please specify Part# / SKU <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="otherPartNumber"
                                        value={formData.otherPartNumber}
                                        onChange={handleChange}
                                        placeholder="Enter part number or SKU"
                                        className={inputClass('otherPartNumber')}
                                    />
                                    {errors.otherPartNumber && <p className="mt-1 text-sm text-red-600">{errors.otherPartNumber}</p>}
                                </div>
                            )}
                        </div>

                        {/* Right - Devices (Radio Buttons) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Devices <span className="text-red-600">*</span>
                            </label>

                            {!formData.orderNumber ? (
                                <div className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-400 text-sm bg-gray-50 min-h-[48px]">
                                    Please select device
                                </div>
                            ) : loadingProducts ? (
                                <div className="flex items-center border border-gray-200 rounded-lg px-4 py-3">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1D76BC] mr-2"></div>
                                    <span className="text-sm text-gray-500">Loading product...</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Product radio button */}
                                    {products.length > 0 && (
                                        <label className={`flex items-start space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition ${formData.deviceType === "product" ? "border-[#1D76BC] bg-blue-50" : "border-gray-300"}`}>
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="product"
                                                checked={formData.deviceType === "product"}
                                                onChange={handleChange}
                                                className="h-4 w-4 text-[#1D76BC] focus:ring-[#1D76BC] mt-1 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-gray-700 text-sm block">
                                                    {products[0].name}
                                                </span>
                                                {products[0].sku && (
                                                    <p className="text-xs text-gray-500 mt-1">SKU: {products[0].sku}</p>
                                                )}
                                            </div>
                                        </label>
                                    )}

                                    {/* Other Product radio button */}
                                    <label className={`flex items-start space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition ${formData.deviceType === "other" ? "border-[#1D76BC] bg-blue-50" : "border-gray-300"}`}>
                                        <input
                                            type="radio"
                                            name="deviceType"
                                            value="other"
                                            checked={formData.deviceType === "other"}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-[#1D76BC] focus:ring-[#1D76BC] mt-1 shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium text-gray-700 text-sm">Other Product</span>
                                            <p className="text-xs text-gray-500 mt-1">Select if you have a different part</p>
                                        </div>
                                    </label>

                                    {errors.selectedProductId && (
                                        <p className="text-sm text-red-600">{errors.selectedProductId}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Account # and Customer Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Account # <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                name="resellerAccountNumber"
                                value={formData.resellerAccountNumber}
                                onChange={handleChange}
                                className={inputClass('resellerAccountNumber')}
                            />
                            {errors.resellerAccountNumber && <p className="mt-1 text-sm text-red-600">{errors.resellerAccountNumber}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Customer Name <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                name="customerName"
                                value={formData.customerName}
                                onChange={handleChange}
                                className={inputClass('customerName')}
                            />
                            {errors.customerName && <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>}
                        </div>
                    </div>

                    {/* Number of Units and Total Deal Revenue */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Number of Units <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="number"
                                name="numberOfUnits"
                                value={formData.numberOfUnits}
                                onChange={handleChange}
                                min="1"
                                className={inputClass('numberOfUnits')}
                            />
                            {errors.numberOfUnits && <p className="mt-1 text-sm text-red-600">{errors.numberOfUnits}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Total Deal Revenue ($) <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="number"
                                name="totalDealRevenue"
                                value={formData.totalDealRevenue}
                                onChange={handleChange}
                                min="0"
                                className={inputClass('totalDealRevenue')}
                            />
                            {errors.totalDealRevenue && <p className="mt-1 text-sm text-red-600">{errors.totalDealRevenue}</p>}
                        </div>
                    </div>

                    {/* Purchase Type and Purchase Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Is this a one time purchase or roll-out? <span className="text-red-600">*</span>
                            </label>
                            <select
                                name="purchaseType"
                                value={formData.purchaseType}
                                onChange={handleChange}
                                className={`${inputClass('purchaseType')} bg-white`}
                            >
                                <option value="">Select option</option>
                                <option value="one-time">One Time Purchase</option>
                                <option value="roll-out">Roll-out</option>
                            </select>
                            {errors.purchaseType && <p className="mt-1 text-sm text-red-600">{errors.purchaseType}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Date of Purchase <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="date"
                                name="purchaseDate"
                                value={formData.purchaseDate}
                                onChange={handleChange}
                                className={inputClass('purchaseDate')}
                            />
                            {errors.purchaseDate && <p className="mt-1 text-sm text-red-600">{errors.purchaseDate}</p>}
                        </div>
                    </div>

                    {/* How Helped */}
                    <div className="mb-8">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            How did Ingrammicro Surface help you close this deal? <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            name="howHelped"
                            value={formData.howHelped}
                            onChange={handleChange}
                            rows={6}
                            maxLength={500}
                            className={`${inputClass('howHelped')} resize-none`}
                        />
                        <p className="text-xs text-gray-500 mt-1">{formData.howHelped.length}/500 characters</p>
                        {errors.howHelped && <p className="mt-1 text-sm text-red-600">{errors.howHelped}</p>}
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center pt-4">
                        <button
                            type="submit"
                            className="w-48 rounded-lg bg-[#1D76BC] cursor-pointer px-6 py-2.5 text-base font-semibold text-white transition-all duration-300 hover:bg-[#1660a0] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#1D76BC]/50"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}