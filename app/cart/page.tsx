"use client";
// Adjust the import path as needed
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import { FaRemoveFormat } from 'react-icons/fa';
import { MdDeleteSweep, MdOutlineDeleteOutline } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon, Trash } from 'lucide-react';
import { toast } from "sonner";
import { AiOutlineShoppingCart } from 'react-icons/ai';
import { logActivity, logError, logSuccess, logInfo, logWarning } from "@/lib/logger";

// Cart summary data (you might want to fetch this from your API too)
const cartSummary = {
    shipsWithin: "48 hours of Approval",
    shipmentType: "Overnight",
    demoPeriod: "Up to 30 Days",
};

export default function Page() {
    const {
        cartItems,
        isLoading,
        isUpdating,
        updateQuantity,
        removeFromCart,
        clearCart,
        getCartTotal,
        getCartTotalItems,
        refreshCart,
        cartCount
    } = useCart();

    const [shippingCost, setShippingCost] = useState(19.99);
    const [taxRate] = useState(0.08); // 8% tax
    const [removingItemId, setRemovingItemId] = useState<string | null>(null); // Track which item is being removed
    const [debugInfo, setDebugInfo] = useState<string>(''); // For debugging
    const [showSingleProductAlert, setShowSingleProductAlert] = useState(false);

    // Calculate totals
    const subtotal = getCartTotal();
    const tax = subtotal * taxRate;
    const total = subtotal + shippingCost + tax;

    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();
    const [authChecked, setAuthChecked] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(false);

    // Handle auth check - IMPROVED VERSION
    useEffect(() => {
        // Only run auth check after auth is fully initialized
        if (loading) {
            return;
        }
        setAuthInitialized(true);

        // Now check authentication status
        if (!isLoggedIn || !profile?.isVerified) {
            logActivity({
                type: 'auth',
                level: 'warning',
                action: 'unauthorized_cart_access_attempt',
                message: 'User attempted to access cart without proper authentication',
                userId: profile?.id || null,
                details: {
                    isLoggedIn,
                    isVerified: profile?.isVerified,
                    userRole: profile?.role
                },
                status: 'failed'
            });
            router.replace('/login/?redirect_to=cart');
        } else {
            setAuthChecked(true);
            logActivity({
                type: 'ui',
                level: 'info',
                action: 'cart_page_accessed',
                message: 'User accessed cart page',
                userId: profile?.id || null,
                details: {
                    userRole: profile?.role,
                    email: profile?.email,
                    cartCountOnAccess: cartCount
                },
                status: 'completed'
            });
        }
    }, [loading, isLoggedIn, profile, user, router]);

    // Fetch data only after auth is confirmed AND initialized
    useEffect(() => {
        if (!authChecked || !authInitialized) {
            return; // Don't fetch data until auth is fully checked AND initialized
        }
    }, [authChecked, authInitialized]);

    const [quantityInputValues, setQuantityInputValues] = useState<Record<string, string>>({});
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    useEffect(() => {
        if (cartItems.length > 0) {
            const initialValues: Record<string, string> = {};
            cartItems.forEach(item => {
                initialValues[item.product_id] = item.quantity.toString();
            });
            setQuantityInputValues(initialValues);
        }
    }, [cartItems]);

    // Quantity input change handler
    const handleQuantityInputChange = (productId: string, value: string) => {
        // Only allow numbers
        if (value === '' || /^\d+$/.test(value)) {
            setQuantityInputValues(prev => ({
                ...prev,
                [productId]: value
            }));

            // Set this product as being edited
            if (value !== cartItems.find(item => item.product_id === productId)?.quantity.toString()) {
                setEditingProductId(productId);
            } else {
                setEditingProductId(null);
            }
        }
    };

    // Save quantity handler - SIMPLIFIED VERSION
    const handleSaveQuantity = async (productId: string, newQuantity: number) => {
        if (newQuantity < 1) return;

        // Get current item to check stock
        const currentItem = cartItems.find(item => item.product_id === productId);
        const stockQuantity = currentItem?.product?.stock_quantity || 0;

        // Validate against stock if stock information is available
        if (stockQuantity > 0 && newQuantity > stockQuantity) {
            newQuantity = stockQuantity; // Cap at stock quantity
        }

        try {
            await updateQuantity(productId, newQuantity);

            // Update the input value
            setQuantityInputValues(prev => ({
                ...prev,
                [productId]: newQuantity.toString()
            }));

            setEditingProductId(null);
        } catch (error) {
            // Revert to original value on error
            if (currentItem) {
                setQuantityInputValues(prev => ({
                    ...prev,
                    [productId]: currentItem.quantity.toString()
                }));
            }
        }
    };

    const handleIncreaseQuantity = async (productId: string) => {
        const currentItem = cartItems.find(item => item.product_id === productId);
        if (!currentItem) {
            return;
        }

        const newQuantity = currentItem.quantity + 1;

        // Call the simplified save function
        await handleSaveQuantity(productId, newQuantity);
    };

    const handleDecreaseQuantity = async (productId: string) => {
        const currentItem = cartItems.find(item => item.product_id === productId);
        if (!currentItem || currentItem.quantity <= 1) {
            return;
        }

        const newQuantity = currentItem.quantity - 1;

        // Call the simplified save function
        await handleSaveQuantity(productId, newQuantity);
    };

    // Handle Enter key in input field
    const handleInputSave = async (productId: string) => {
        const inputValue = quantityInputValues[productId];
        if (!inputValue || inputValue.trim() === '') return;

        const numericValue = parseInt(inputValue);
        if (isNaN(numericValue) || numericValue < 1) return;

        await handleSaveQuantity(productId, numericValue);
    };

    // Handle item removal
    const handleRemoveItem = async (productId: string) => {
        setRemovingItemId(productId); // Set the specific item being removed
        try {
            await removeFromCart(productId);
        } catch (error) {
            console.error('Error removing item:', error);
        } finally {
            setRemovingItemId(null); // Clear the removing state
        }
    };

    // Handle clear cart
    const handleClearCart = async () => {
        if (confirm('Are you sure you want to clear your entire cart?')) {
            try {
                await clearCart();
            } catch (error) {
                console.error('Error clearing cart:', error);
            }
        }
    };

    // Handle checkout
    const handleCheckout = () => {
        // Check if more than one product in cart

        logActivity({
            type: 'navigation',
            level: 'info',
            action: 'checkout_initiated',
            message: 'User initiated checkout from cart',
            userId: profile?.id || null,
            details: {
                cartItemCount: cartItems.length,
                cartCount,
                totalItems: getCartTotalItems(),
                totalAmount: getCartTotal(),
                items: cartItems.map(item => ({
                    productId: item.product_id,
                    productName: item.product?.product_name,
                    sku: item.product?.sku
                }))
            },
            status: 'completed'
        });

        router.replace('/checkout')
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6 lg:px-15 2xl:px-[70px]">
                <div className="w-full">
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Empty cart state
    if (cartItems.length === 0) {
        logActivity({
            type: 'cart',
            level: 'info',
            action: 'empty_cart_viewed',
            message: 'User viewed empty cart',
            userId: profile?.id || null,
            details: {
                userRole: profile?.role,
                email: profile?.email
            },
            status: 'completed'
        });
        return (
            <div className="h-[83vh] px-2 sm:px-6 lg:px-15 2xl:px-[70px] flex items-center justify-center">
                <div className="w-full">
                    <div className="bg-white rounded-lg p-12 text-center">
                        <div className="text-6xl mb-6 flex justify-center">
                            <AiOutlineShoppingCart />
                        </div>

                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                            Your cart is empty
                        </h2>

                        <p className="text-gray-600 mb-8">
                            Add items to your cart to get started
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
            <div className="min-h-screen py-8 px-2 sm:px-6 lg:px-15 2xl:px-[70px]">
                <div className="w-full">
                {/* <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1> */}
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Cart Items Section */}
                    <div className="lg:w-2/3">
                        <div className=" mb-6 pt-4">
                            {cartItems.map((item) => {
                                const isRemovingThisItem = removingItemId === item.product_id;
                                return (
                                    <div
                                        key={item.product_id}
                                        className="flex flex-col sm:flex-row gap-6 py-4 mb-4 "
                                    >
                                        {/* Product Image */}
                                        <div className="sm:w-1/4 flex justify-center">
                                            <div // ✅ Fix:
className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                {item.product?.thumbnail ? (
                                                    <Image
                                                        src={item.product.thumbnail}
                                                        alt={item.product.product_name || 'Product image'}
                                                        width={70}
                                                        height={70}
                                                        className="object-contain w-full h-full p-2"
                                                    />
                                                ) : (
                                                    <span className="text-gray-400">No Image</span>
                                                )}
                                            </div>
                                        </div>

{/* Product Details */}
<div className="sm:w-3/4 flex flex-col justify-between py-1">
    
        <Link href={`/product/${item.product?.slug}`}>
            <h3 className="text-md font-semibold text-black mb-2">
                {item.product?.product_name || 'Product Name Not Available'}
            </h3>
        </Link>

        {item.product?.sku && (
            <Link href={`/product/${item.product?.slug}`}>
                <p className="text-sm text-gray-500 mb-2">SKU: <b className='text-gray-500'>{item.product.sku}</b></p>
            </Link>
        )}
    

                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-3">
                                                <select
                                                    defaultValue={1}
                                                    onChange={(e) => {
                                                        const selected = Number(e.target.value);
                                                        if (selected > 1) {
                                                            toast.error("Maximum 1 unit allowed per order.", {
                                                                style: { background: "black", color: "white" },
                                                            });
                                                            e.target.value = "1";
                                                        }
                                                    }}
                                                    className="border border-gray-300 rounded-sm px-2 py-1.5 text-sm text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-gray-400"
                                                >
                                                    {[1, 2, 3].map((num) => (
                                                        <option key={num} value={num}>{num}</option>
                                                    ))}
                                                </select>

                                                <button
                                                    onClick={() => handleRemoveItem(item.product_id)}
                                                    disabled={isRemovingThisItem || isUpdating}
                                                    className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Remove item"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* {(cartItems.length > 1 || cartItems.some(item => item.quantity > 1)) && (
                            <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                                <AlertCircleIcon className="h-4 w-4 text-red-600" />
                                <AlertTitle className="text-red-800 font-semibold">
                                    Demo Unit Limitation
                                </AlertTitle>
                                <AlertDescription className="text-red-700">
                                    <div className="space-y-1">
                                        <p>You can only request <span className="font-bold">one demo unit</span> at a time.</p>
                                        <p className="text-sm">
                                            {cartItems.length > 1
                                                ? `Please remove ${cartItems.length - 1} item(s) to proceed with checkout.`
                                                : 'Only 1 quantity allowed per demo unit. Please reduce quantity to 1.'
                                            }
                                        </p>
                                        {cartItems.length > 1 && (
                                            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                                {cartItems.map((item, index) => (
                                                    <li key={item.product_id} className="text-red-600">
                                                        {item.product?.product_name || 'Product'}
                                                        {item.quantity > 1 && (
                                                            <span className="font-medium"> (Quantity: {item.quantity})</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )} */}
                    </div>

{/* Order Summary Section */}
<div className="lg:w-1/3 flex flex-col gap-4 sticky top-8">
    
    {/* Cart Summary Card */}
    <div className="bg-white rounded border p-6 shadow-md">
        <h2 className="text-center text-lg font-semibold text-gray-800 mb-4">Cart Summary</h2>
        
        {/* Cart Summary Details */}
        <div className="space-y-4 mb-4">
            <div className="flex justify-between items-center border border-gray-200 rounded-sm bg-gray-100">
                <span className="text-gray-600 text-xs px-4 py-3">Number of Item(s)</span>
                <span className="font-medium text-xs bg-gray-100 px-4 py-3 rounded-r-sm">{cartItems.length}</span>
            </div>
            <div className="flex justify-between items-center border border-gray-200 rounded-sm bg-gray-100">
                <span className="text-gray-600 text-xs px-4 py-3">Ships Within</span>
                <span className="font-medium text-xs bg-gray-100 px-4 py-3 rounded-r-sm">{cartSummary.shipsWithin}</span>
            </div>
            <div className="flex justify-between items-center border border-gray-200 rounded-sm bg-gray-100">
                <span className="text-gray-600 text-xs px-4 py-3">Shipment Type</span>
                <span className="font-medium text-xs bg-gray-100 px-4 py-3 rounded-r-sm">{cartSummary.shipmentType}</span>
            </div>
            <div className="flex justify-between items-center border border-gray-200 rounded-sm bg-gray-100">
                <span className="text-gray-600 text-xs px-4 py-3">Demo Period</span>
                <span className="font-medium text-xs bg-gray-100 px-4 py-3 rounded-r-sm">{cartSummary.demoPeriod}</span>
            </div>
        </div>

        {/* Show alert if multiple products */}
        {showSingleProductAlert && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start">
                    <AlertCircleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                        <p className="text-sm text-red-700 font-medium">
                            Only one product can be selected for checkout
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                            Please remove other items from your cart to proceed.
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>

    {/* Proceed to Checkout Button — outside card */}
    <button
        onClick={handleCheckout}
        className="w-full py-4 px-4 cursor-pointer font-semibold transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md bg-[#1570EF] hover:bg-[#1660a0] text-white"
        disabled={isUpdating || cartItems.length === 0}
    >
        {isUpdating ? 'Processing...' : 'Proceed to Checkout'}
    </button>

</div>
                </div>
            </div>
        </div >
    );
}