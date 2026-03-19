"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ShoppingCart,
    Heart,
    Share2,
    ChevronLeft,
    ChevronRight,
    Check,
    Truck,
    Shield,
    ArrowLeft,
    Clock,
    Delete,
    Trash
} from "lucide-react";
import { logActivity } from "@/lib/logger";
import { Carousel, Popconfirm, Skeleton } from "antd";
import { supabase } from "@/lib/supabase/client";
import { FaEdit } from "react-icons/fa";
import { FaDeleteLeft, FaMinus } from "react-icons/fa6";
import { MdDelete } from "react-icons/md";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import { useRef } from "react";
import type { CarouselRef } from "antd/es/carousel";
import { toast } from "sonner";
import { BiRadioCircle } from "react-icons/bi";
import { useCart } from "@/app/context/CartContext";
import { FaBell } from "react-icons/fa";
import { emailTemplates, sendEmail } from "@/lib/email";
import { WaitlistEmailCC } from "@/lib/emailconst";

// Loading skeleton component
const ProductSkeleton = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    return (
        <div className="min-h-screen">
            {/* Back Navigation Skeleton */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <Skeleton.Button active size="small" style={{ width: 100 }} />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Main Product Section Skeleton */}
                <div className="bg-white rounded-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
                        {/* Left Column - Images Skeleton */}
                        <div>
                            <Skeleton.Image
                                active
                                style={{
                                    width: isMobile ? "340px" : "500px",
                                    height: isMobile ? "340px" : "500px",
                                    marginBottom: "16px",
                                }}
                            />
                            <div className="mt-4">
                                <Skeleton active paragraph={{ rows: 0 }} />
                            </div>
                        </div>

                        {/* Right Column - Info Skeleton */}

                        <div>
                            <Skeleton active paragraph={{ rows: 2 }} />
                            <div className="my-8">
                                <Skeleton active paragraph={{ rows: 1 }} />
                            </div>
                            <div className="mb-8">
                                <Skeleton active title={false} paragraph={{ rows: 6 }} />
                            </div>
                            <Skeleton.Button active size="large" style={{ width: '100%' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};

// Interface for product data - Now using direct text values
interface Product {
    id: string;
    product_name: string;
    slug: string;
    sku: string;
    form_factor: string | null;
    processor: string | null;
    memory: string | null;
    storage: string | null;
    screen_size: string | null;
    technologies: string | null;
    inventory_type: string | null;
    total_inventory: number | null;
    stock_quantity: number | null;
    date: string | null;
    copilot: boolean | null;
    five_g_Enabled: boolean | null;
    post_status: string | null;
    description: string | null;
    isBundle: boolean | null;
    isInStock: boolean | null;
    thumbnail: string | null;
    gallery: string[] | string | null;
    user_id: string | null;
    created_at: string | null;
}

// Related product interface - Same as Product
type RelatedProduct = Product;

export default function Page() {
    const params = useParams();
    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();
    const slug = params.slug as string;
    const admin = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const shopManager = process.env.NEXT_PUBLIC_SHOPMANAGER;

    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
    const [isloading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isAddingToWaitlist, setIsAddingToWaitlist] = useState(false);
    const [showWaitlistModal, setShowWaitlistModal] = useState(false);

    const source = `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/product/${slug}`;

    // Carousel ref for manual control
    const carouselRef = useRef<CarouselRef>(null);

    const {
        addToCart,
        removeFromCart,
        isUpdating,
        addingProductId,
        isInCart,
        cartItems
    } = useCart()

    // Carousel navigation functions
    const goToPreviousSlide = () => {
        if (carouselRef.current) {
            carouselRef.current.prev();
        }
    };

    const goToNextSlide = () => {
        if (carouselRef.current) {
            carouselRef.current.next();
        }
    };

    const [authChecked, setAuthChecked] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(false);

    // Handle auth check
    useEffect(() => {
        if (loading) {
            return;
        }

        setAuthInitialized(true);

        if (!isLoggedIn || profile?.isVerified === false && !profile) {
            router.replace(`/login/?redirect_to=product/${slug}`);
        } else {
            setAuthChecked(true);
        }
    }, [loading, isLoggedIn, profile, user, router]);

    // Handle add to waitlist
    const handleAddToWaitlist = async () => {
        if (!product || !profile?.email) {
            toast.error("Please login to join waitlist");
            return;
        }

        try {
            setIsAddingToWaitlist(true);

            const { data: existingWaitlist, error: checkError } = await supabase
                .from('waitlist')
                .select('id')
                .eq('product_id', product.id)
                .eq('user_id', profile?.id)
                .single();

            if (existingWaitlist) {
                toast.error("You are already on the waitlist for this product");
                setIsAddingToWaitlist(false);
                return;
            }

            const { error } = await supabase
                .from('waitlist')
                .insert({
                    product_id: product.id,
                    user_id: profile?.id,
                    email: profile?.email,
                    date: new Date().toISOString(),
                });

            if (error) {
                if (error.code === '23505') {
                    toast.error("You are already on the waitlist for this product");
                } else {
                    throw error;
                }
            } else {
                toast.success("Added to waitlist! You'll be notified when this product is back in stock");
                sendWinEmail();
                setShowWaitlistModal(false);
            }

        } catch (error: any) {
            toast.error(error.message || "Failed to add to waitlist. Please try again.");
        } finally {
            setIsAddingToWaitlist(false);
        }
    };

    // Check if user is already on waitlist for this product
    useEffect(() => {
        const checkWaitlistStatus = async () => {
            if (!product || !profile?.id) return;

            try {
                const { data } = await supabase
                    .from('waitlist')
                    .select('id')
                    .eq('product_id', product.id)
                    .eq('user_id', profile.id)
                    .single();
            } catch (error) {
                // User is not on waitlist (404 is expected)
            }
        };

        if (product && profile?.id) {
            checkWaitlistStatus();
        }
    }, [product, profile?.id]);

    // Fetch data only after auth is confirmed AND initialized
    useEffect(() => {
        if (!authChecked || !authInitialized) {
            return;
        }
    }, [authChecked, authInitialized]);

    const sendWinEmail = async () => {
        try {
            const template = emailTemplates.waitListEmail({
                email: profile?.email || "",
                sku: product?.sku || "",
                product: product?.product_name || ""
            });

            await sendEmail({
                to: profile?.email || "",
                // cc: WaitlistEmailCC,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });

        } catch (error) {
            toast.error("Failed to send checkout email. Please try again.");
        }
    };

    // Optional: prevent UI flicker - MUST BE AFTER ALL HOOKS
    if (isLoggedIn === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3ba1da] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const handleAddToCart = async (productId: string) => {
        try {
            // ✅ await hata diya - background mein chalega
            logActivity({
                type: 'product',
                level: 'info',
                action: 'add_to_cart_attempt',
                message: `User attempted to add product to cart: ${product?.product_name || 'Unknown product'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    productName: product?.product_name,
                    sku: product?.sku,
                    userRole: profile?.role,
                    isPublished: product?.post_status === 'Publish',
                    stockQuantity: product?.stock_quantity,
                    slug: slug
                }
            });

            await addToCart(productId, 1);

            // ✅ await hata diya - background mein chalega
            logActivity({
                type: 'product',
                level: 'success',
                action: 'add_to_cart_success',
                message: `Product added to cart successfully: ${product?.product_name || 'Unknown product'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    productName: product?.product_name,
                    sku: product?.sku,
                    slug: slug
                },
                status: 'completed'
            });

            toast.success('Product added to cart!', {
                style: { background: "black", color: "white" },
            });

        } catch (error: any) {

            // ✅ await hata diya - background mein chalega
            logActivity({
                type: 'product',
                level: 'error',
                action: 'add_to_cart_failed',
                message: `Failed to add product to cart: ${error?.message || 'Unknown error'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    errorCode: error?.code,
                    errorMessage: error?.message,
                    errorDetails: error
                },
                status: 'failed'
            });

            if (error?.code === '23503') {
                router.push(`/product/${slug}`);
            }
        }
    };

    // Handle cart item removal
    const handleRemoveFromCart = async (productId: string) => {
        try {
            // ✅ await hata diya - background mein chalega
            logActivity({
                type: 'product',
                level: 'info',
                action: 'remove_from_cart_attempt',
                message: `User attempted to remove product from cart: ${product?.product_name || 'Unknown product'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    productName: product?.product_name,
                    sku: product?.sku,
                    slug: slug
                }
            });

            await removeFromCart(productId)

            // ✅ await hata diya - background mein chalega
            logActivity({
                type: 'product',
                level: 'success',
                action: 'remove_from_cart_success',
                message: `Product removed from cart successfully: ${product?.product_name || 'Unknown product'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    productName: product?.product_name,
                    sku: product?.sku,
                    slug: slug
                },
                status: 'completed'
            });

            toast.success('Product removed from cart!', {
                style: { background: "black", color: "white" },
            })
        } catch (error: any) {
            let errorMessage = 'Failed to remove product from cart. Please try again.'

            // ✅ await hata diya - background mein chalega
            logActivity({
                type: 'product',
                level: 'error',
                action: 'remove_from_cart_failed',
                message: `Failed to remove product from cart: ${error?.message || 'Unknown error'}`,
                userId: user?.id || null,
                productId: productId,
                details: {
                    errorMessage: error?.message,
                    errorDetails: error
                },
                status: 'failed'
            });

            if (error?.message?.includes('not found')) {
                errorMessage = 'Product not found in cart.'
            }

            toast.error(errorMessage, {
                style: { background: "red", color: "white" },
            })
        }
    }

    // Check if product is in cart
    const checkIfInCart = (productId: string): boolean => {
        return isInCart(productId)
    }

    // Get cart item for specific product
    const getCartItemForProduct = (productId: string) => {
        return cartItems.find(item => item.product_id === productId)
    }

    // Main product action button with Read More for out of stock
    const renderMainActionButton = () => {
        if (!product) return null;

        if (product.stock_quantity === 0) {
            return (
                <div className="flex flex-col gap-2">
                    <button
                        className="flex items-center justify-center gap-2 px-5 py-2 border border-gray-400 text-gray-400 rounded-sm cursor-not-allowed transition-colors"
                        disabled
                    >
                        Out of Stock
                    </button>
                    <button
                        onClick={() => {
                            const descriptionSection = document.getElementById('product-description');
                            if (descriptionSection) {
                                descriptionSection.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2 border border-[#1D76BC] text-[#1D76BC] rounded-sm hover:bg-[#1660a0] hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Read More Details
                    </button>
                </div>
            );
        }

        if (product.post_status !== "Publish") {
            return (
                <div
                    className="flex w-56 items-center justify-center gap-2 px-5 py-2 border border-[#1d76bc] text-[#1d76bc] rounded-sm"
                >
                    Private
                </div>
            );
        }

        const isProductInCart = checkIfInCart(product.id);
        const cartItem = getCartItemForProduct(product.id);

        if (isProductInCart) {
            return (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleRemoveFromCart(product.id)}
                        disabled={isUpdating}
                        className="flex items-center gap-3 cursor-pointer justify-center px-5 py-2
               border border-red-600 text-red-600 rounded-md
                hover:border-red-700 hover:bg-red-100
               disabled:opacity-50"
                    >
                        <Trash className="h-4 w-4" />
                        {isUpdating ? 'Removing...' : 'Remove from Cart'}
                    </button>
                </div>
            );
        } else {
            return (
                <button
                    onClick={() => handleAddToCart(product.id)}
                    disabled={isUpdating && addingProductId === product.id}
                    className="flex items-center justify-center gap-2 px-9 py-2 cursor-pointer border bg-[#1570EF] text-white rounded-sm hover:bg-[#1660a0] hover:text-white transition-colors disabled:opacity-50"
                >
                    <ShoppingCart className="h-4 w-4" />
                    {isUpdating && addingProductId === product.id ? 'Adding...' : 'Add to Cart'}
                </button>
            );
        }
    };

    // Related product action button with Read More for out of stock
    const renderRelatedProductButton = (product: RelatedProduct) => {
        if (product.stock_quantity === 0) {
            return (
                <div className="flex flex-col gap-2">
                    <button
                        className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium text-gray-400 border border-gray-400 rounded-sm cursor-not-allowed"
                        disabled
                    >
                        Out of Stock
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/product/${product.slug}`);
                        }}
                        className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium text-[#1d76bc] border border-[#1d76bc] rounded-sm cursor-pointer hover:bg-[#1660a0] hover:text-white transition-colors"
                    >
                        Read More
                    </button>
                </div>
            );
        }
        if (product.post_status !== "Publish") {
            return (
                <div className="sm:pt-4 sm:mb-2 mt-auto">
                    <button
                        className="self-start sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium
                                                                text-[#4e5050] border border-[#484a4a] rounded-sm
                                                                hover:bg-[#eaebeb] transition-colors"
                    >
                        Read More
                    </button>
                </div>
            );
        }

        const isProductInCart = checkIfInCart(product.id);
        const cartItem = getCartItemForProduct(product.id);

        if (isProductInCart) {
            return (
                <div className="space-y-2">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveFromCart(product.id);
                        }}
                        disabled={isUpdating}
                        className="sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium text-red-500 border border-red-500 rounded-sm cursor-pointer hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                        Remove
                    </button>
                </div>
            );
        } else {
            return (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddToCart(product.id);
                    }}
                    disabled={isUpdating && addingProductId === product.id}
                    className="sm:px-8 px-5 sm:py-2.5 py-1.5 text-sm font-medium text-[#1d76bc] border border-[#1d76bc] rounded-sm cursor-pointer hover:bg-[#1660a0] hover:text-white transition-colors disabled:opacity-50"
                >
                    {isUpdating && addingProductId === product.id ? 'Adding...' : 'Add to Cart'}
                </button>
            );
        }
    };

    const parseGalleryImages = (galleryData: string | string[] | null): string[] => {
        if (!galleryData) return [];

        if (Array.isArray(galleryData)) {
            return galleryData;
        }

        try {
            if (typeof galleryData === 'string') {
                if (galleryData.startsWith('[') && galleryData.endsWith(']')) {
                    const parsed = JSON.parse(galleryData);
                    if (Array.isArray(parsed)) {
                        return parsed;
                    }
                }

                if (galleryData.includes(',') && galleryData.includes('http')) {
                    const cleaned = galleryData
                        .replace(/[\[\]"]/g, '')
                        .split(',')
                        .map(url => url.trim())
                        .filter(url => url.length > 0);
                    return cleaned;
                }

                return [galleryData];
            }
        } catch (error) {
        }

        return [];
    };

    // Prepare gallery images (thumbnail + gallery)
    const getGalleryImages = () => {
        if (!product) return [];

        const thumbnail = product.thumbnail || '';
        const galleryArray = parseGalleryImages(product.gallery);

        const allImages = [thumbnail, ...galleryArray].filter(Boolean);
        return [...new Set(allImages)];
    };

    // Fetch product data
    useEffect(() => {
        const fetchProductData = async () => {

            const startTime = Date.now();

            // ✅ await hata diya - background mein chalega
            logActivity({
                type: 'product',
                level: 'info',
                action: 'product_fetch_attempt',
                message: `Attempting to fetch product details for slug: ${slug}`,
                userId: user?.id || null,
                details: {
                    slug: slug,
                    userRole: profile?.role,
                    isLoggedIn: isLoggedIn
                }
            });

            try {
                setLoading(true);
                setError(null);

                const { data: productData, error: productError } = await supabase
                    .from("products")
                    .select("*")
                    .eq("slug", slug)
                    .single();

                if (productError) {
                    // ✅ await hata diya - background mein chalega
                    logActivity({
                        type: 'product',
                        level: 'error',
                        action: 'product_fetch_failed',
                        message: `Failed to fetch product for slug: ${slug}`,
                        userId: user?.id || null,
                        details: {
                            slug: slug,
                            error: productError,
                            executionTimeMs: Date.now() - startTime
                        },
                        status: 'failed'
                    });
                    router.push(`/product/${slug}`)
                    setError("Product not found");
                    return;
                }

                if (!productData) {
                    // ✅ await hata diya - background mein chalega
                    logActivity({
                        type: 'product',
                        level: 'warning',
                        action: 'product_not_found',
                        message: `Product not found for slug: ${slug}`,
                        userId: user?.id || null,
                        details: {
                            slug: slug,
                            executionTimeMs: Date.now() - startTime
                        },
                        status: 'failed'
                    });

                    setError("Product not found");
                    return;
                }

                const parsedGallery = parseGalleryImages(productData.gallery);
                const productWithParsedGallery = {
                    ...productData,
                    gallery: parsedGallery
                };

                setProduct(productWithParsedGallery);

                // ✅ await hata diya - background mein chalega
                logActivity({
                    type: 'product',
                    level: 'success',
                    action: 'product_fetch_success',
                    message: `Successfully fetched product details: ${productData.product_name}`,
                    userId: user?.id || null,
                    productId: productData.id,
                    details: {
                        productName: productData.product_name,
                        sku: productData.sku,
                        slug: slug,
                        formFactor: productData.form_factor,
                        processor: productData.processor,
                        memory: productData.memory,
                        storage: productData.storage,
                        screenSize: productData.screen_size,
                        isPublished: productData.post_status === 'Publish',
                        stockQuantity: productData.stock_quantity,
                        executionTimeMs: Date.now() - startTime
                    },
                    status: 'completed'
                });

                const relatedProductsStartTime = Date.now();
                const conditions = [];

                if (productData.form_factor) {
                    conditions.push(`form_factor.eq.${productData.form_factor}`);
                }
                if (productData.processor) {
                    conditions.push(`processor.eq.${productData.processor}`);
                }
                if (productData.memory) {
                    conditions.push(`memory.eq.${productData.memory}`);
                }
                if (productData.storage) {
                    conditions.push(`storage.eq.${productData.storage}`);
                }

                if (conditions.length > 0) {
                    const { data: relatedData, error: relatedError } = await supabase
                        .from("products")
                        .select("*")
                        .or(conditions.join(','))
                        .neq("id", productData.id)
                        .limit(4);

                    if (!relatedError && relatedData) {
                        // ✅ await hata diya - background mein chalega
                        logActivity({
                            type: 'product',
                            level: 'info',
                            action: 'related_products_fetch_success',
                            message: `Fetched ${relatedData.length} related products`,
                            userId: user?.id || null,
                            details: {
                                mainProductId: productData.id,
                                mainProductName: productData.product_name,
                                relatedProductsCount: relatedData.length,
                                executionTimeMs: Date.now() - relatedProductsStartTime
                            },
                            status: 'completed'
                        });
                        setRelatedProducts(relatedData);
                    }
                } else {
                    setRelatedProducts([]);
                }

            } catch (err) {
                // ✅ await hata diya - background mein chalega
                logActivity({
                    type: 'product',
                    level: 'error',
                    action: 'product_fetch_error',
                    message: `Unexpected error while fetching product`,
                    userId: user?.id || null,
                    details: {
                        slug: slug,
                        error: err,
                        executionTimeMs: Date.now() - startTime
                    },
                    status: 'failed'
                });
                setError("Failed to load product");
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchProductData();
        }
    }, [slug]);

    // Handle quantity changes
    const increaseQuantity = () => setQuantity(prev => prev + 1);
    const decreaseQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

    const handleDeleteDevice = async () => {
        if (!product?.id) return;

        const startTime = Date.now();

        // ✅ await hata diya - background mein chalega
        logActivity({
            type: 'product',
            level: 'warning',
            action: 'product_delete_attempt',
            message: `User attempted to delete product: ${product.product_name}`,
            userId: user?.id || null,
            productId: product.id,
            details: {
                productName: product.product_name,
                sku: product.sku,
                slug: slug,
                userRole: profile?.role,
                deletedBy: profile?.email
            }
        });

        try {
            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", product.id)
                .eq("user_id", profile?.userId);

            if (error) {
                // ✅ await hata diya - background mein chalega
                logActivity({
                    type: 'product',
                    level: 'error',
                    action: 'product_delete_failed',
                    message: `Failed to delete product: ${product.product_name}`,
                    userId: user?.id || null,
                    productId: product.id,
                    details: {
                        productName: product.product_name,
                        sku: product.sku,
                        error: error,
                        executionTimeMs: Date.now() - startTime
                    },
                    status: 'failed'
                });

                toast.error("Failed to delete product");
                return;
            }

            // ✅ await hata diya - background mein chalega
            logActivity({
                type: 'product',
                level: 'success',
                action: 'product_delete_success',
                message: `Product deleted successfully: ${product.product_name}`,
                userId: user?.id || null,
                productId: product.id,
                details: {
                    productName: product.product_name,
                    sku: product.sku,
                    slug: slug,
                    deletedBy: profile?.email,
                    executionTimeMs: Date.now() - startTime
                },
                status: 'completed'
            });

            toast.success("Product deleted successfully");
            router.push("/product-category/alldevices");

        } catch (err) {
            // ✅ await hata diya - background mein chalega
            logActivity({
                type: 'product',
                level: 'error',
                action: 'product_delete_error',
                message: `Unexpected error while deleting product`,
                userId: user?.id || null,
                productId: product.id,
                details: {
                    productName: product.product_name,
                    sku: product.sku,
                    error: err,
                    executionTimeMs: Date.now() - startTime
                },
                status: 'failed'
            });
            toast.error("Something went wrong");
        }
    };

    // Split description into bullet points
    const descriptionPoints = product?.description
        ? product.description.split('\n').filter(point => point.trim())
        : [];

    // Calculate stock status
    const stockStatus = () => {
        if (!product) return { text: "", color: "", icon: null };

        if (!product.isInStock) {
            return {
                text: "Out of Stock",
                color: "bg-red-100 text-red-800",
                icon: null
            };
        }

        if (product.stock_quantity && product.stock_quantity > 0 && product.stock_quantity <= 5) {
            return {
                text: `Only ${product.stock_quantity} Left`,
                color: "bg-yellow-100 text-yellow-800",
                icon: <Clock className="h-3 w-3 mr-1" />
            };
        }

        if (product.stock_quantity && product.stock_quantity > 5) {
            return {
                text: `${product.stock_quantity} In Stock`,
                color: "bg-green-100 text-green-800",
                icon: <Check className="h-3 w-3 mr-1" />
            };
        }

        return { text: "", color: "", icon: null };
    };

    const stockInfo = stockStatus();
    const galleryImages = getGalleryImages();

    // Loading state
    if (loading) {
        return <ProductSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || "Product not found"}</h2>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-[#1D76BC] text-white rounded-lg hover:bg-[#1660a0] transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Back Navigation */}
            {/* <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <div className="mt-2 px-3">
                            <span className="text-xs">
                                <Link href={'/'} className="text-xs hover:text-red-700">
                                    Home
                                </Link>
                                {" / "}
                                <Link
                                    href={`/product-category/${product?.memory?.toLowerCase().replace(/\s+/g, '-')}/`}
                                    className="text-xs hover:text-red-700"
                                >
                                    {product?.memory}
                                </Link>
                                {" / "}
                                <span className="text-xs text-gray-600">{product?.product_name}</span>
                            </span>
                        </div>
                    </button>
                </div>
            </div> */}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Product Main Section */}
                <div className="bg-white rounded-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
                        {/* Left Column - Product Images */}
                        <div>
                            {galleryImages.length > 0 ? (
                                <div className="relative rounded-lg overflow-hidden mb-4 border border-gray-200">
                                    {shopManager === profile?.role ? (
                                        <div className="absolute top-8 left-5 z-10">
                                            <div className="flex gap-2">
                                                <Link href={`/add-device?_=${product?.slug}`}>
                                                    <div className="cursor-pointer bg-white/90 text-[#41abd6] border border-[#41abd6] backdrop-blur-sm rounded-full p-2">
                                                        <FaEdit />
                                                    </div>
                                                </Link>
                                                <Popconfirm
                                                    title="Delete the device"
                                                    description="Are you sure to delete this device?"
                                                    okText="Yes"
                                                    cancelText="No"
                                                    onConfirm={handleDeleteDevice}
                                                    okButtonProps={{ danger: true }}
                                                >
                                                    <div className="cursor-pointer bg-white/90 text-red-500 border border-red-500 backdrop-blur-sm rounded-full p-2">
                                                        <MdDelete />
                                                    </div>
                                                </Popconfirm>
                                            </div>
                                        </div>
                                    ) : admin === profile?.role ? (
                                        <div className="absolute top-8 left-5 z-10">
                                            <div className="flex gap-2">
                                                <Link href={`/add-device?_=${product?.slug}`}>
                                                    <div className="cursor-pointer bg-white/90 text-[#41abd6] border border-[#41abd6] backdrop-blur-sm rounded-full p-2">
                                                        <FaEdit />
                                                    </div>
                                                </Link>
                                                <Popconfirm
                                                    title="Delete the device"
                                                    description="Are you sure to delete this device?"
                                                    okText="Yes"
                                                    cancelText="No"
                                                    onConfirm={handleDeleteDevice}
                                                    okButtonProps={{ danger: true }}
                                                >
                                                    <div className="cursor-pointer bg-white/90 text-red-500 border border-red-500 backdrop-blur-sm rounded-full p-2">
                                                        <MdDelete />
                                                    </div>
                                                </Popconfirm>
                                            </div>
                                        </div>
                                    ) : (null)}

                                    <div className="relative">
                                        <Carousel
                                            ref={carouselRef}
                                            dots={false}
                                            arrows={false}
                                            afterChange={(current) => setSelectedImage(current)}
                                        >
                                            {galleryImages.map((image, index) => (
                                                <div key={index} className="relative h-96 md:h-125">
                                                    <img
                                                        src={image}
                                                        alt={`${product?.product_name} - Image ${index + 1}`}
                                                        className="object-contain w-full h-full p-4"
                                                        onError={(e) => {
                                                            e.currentTarget.src = '/placeholder-image.jpg';
                                                            e.currentTarget.alt = 'Image not available';
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </Carousel>

                                        {galleryImages.length > 1 && (
                                            <>
                                                <button
                                                    onClick={goToPreviousSlide}
                                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 cursor-pointer z-10"
                                                    aria-label="Previous image"
                                                >
                                                    <ChevronLeft className="h-6 w-6" />
                                                </button>

                                                <button
                                                    onClick={goToNextSlide}
                                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 cursor-pointer z-10"
                                                    aria-label="Next image"
                                                >
                                                    <ChevronRight className="h-6 w-6" />
                                                </button>

                                                {/* <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full z-10">
                                                    {selectedImage + 1} / {galleryImages.length}
                                                </div> */}
                                            </>
                                        )}
                                    </div>

                                    {/* {product?.five_g_Enabled && (
                                        <div className="absolute top-4 right-4 z-10">
                                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                                                <img
                                                    src="/5g-logo.png"
                                                    alt="5G Enabled"
                                                    className="w-8 h-8 object-contain"
                                                />
                                            </div>
                                        </div>
                                    )} */}
                                </div>
                            ) : (
                                <div className="relative rounded-lg overflow-hidden mb-4 h-96 md:h-125 bg-gray-100 flex items-center justify-center">
                                    <div className="text-gray-400">No images available</div>
                                </div>
                            )}

                            {galleryImages.length > 1 && (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {galleryImages.map((image, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSelectedImage(index);
                                                if (carouselRef.current) {
                                                    carouselRef.current.goTo(index);
                                                }
                                            }}
                                            className={`relative h-20 rounded-lg overflow-hidden border-2 ${selectedImage === index ? 'border-[#0e4647]' : 'border-gray-200'}`}
                                        >
                                            <img
                                                src={image}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="object-cover w-full h-full"
                                                onError={(e) => {
                                                    e.currentTarget.src = '/placeholder-thumbnail.jpg';
                                                    e.currentTarget.alt = 'Thumbnail not available';
                                                }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Column - Product Info */}
                        <div>
                            <div className="mb-3 pb-2">
                                <div className="flex flex-col mb-2">
                                    {product?.five_g_Enabled && (
                                        <div className="mb-2">
                                            <img
                                                src="/5g-logo.png"
                                                alt="5G Enabled"
                                                className="w-10 h-10 object-contain"
                                            />
                                        </div>
                                    )}
                                    <h1 className="text-xl md:text-2xl sm:text-lg font-semibold text-gray-900">
                                        {product?.product_name}
                                    </h1>
                                </div>
                                <div className="text-gray-500 text-sm my-4">
                                    <b>SKU:</b> {product?.sku}
                                </div>
                            </div>

                            {/* Description Points with ID for Read More button */}
                            <div id="product-description" className=" mb-2">
                                {descriptionPoints.length > 0 && (
                                    <div className="mb-6">
                                        <ul className="space-y-2">
                                            {descriptionPoints.map((point, index) => (
                                                <li key={index} className="flex items-center">
                                                    <span className="mr-2 text-black text-lg leading-none">•</span>
                                                    <span className="text-gray-700 text-sm">{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <h3 className={`text-sm font-semibold my-7 ${product?.stock_quantity === 0 ? "text-red-500" : "text-gray-500"}`}>
                                            {product?.stock_quantity} / {product?.total_inventory} In Stock
                                        </h3>
                                    </div>
                                )}
                            </div>

                            {product?.stock_quantity != 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={quantity}
                                            onChange={(e) => {
                                                const selected = Number(e.target.value);
                                                if (selected > 1) {
                                                    toast.error("You cannot add more than 1 of this product.", {
                                                        style: { background: "black", color: "white" },
                                                    });
                                                } else {
                                                    setQuantity(selected);
                                                }
                                            }}
                                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1D76BC]"
                                        >
                                            {[1, 2, 3].map((num) => (
                                                <option key={num} value={num}>{num}</option>
                                            ))}
                                        </select>
                                        {renderMainActionButton()}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="border border-gray-200 rounded-lg p-6 bg-white">
                                        <h2 className="text-xl font-semibold text-gray-900 mb-1">
                                            Notify me when available
                                        </h2>
                                        <p className="text-sm text-gray-500 mb-4">
                                            Enter your email to be notified when this item is back in stock.
                                        </p>

                                        {!profile?.email ? (
                                            <div className="space-y-4">
                                                <p className="text-sm text-gray-500">
                                                    Please login to join the waitlist
                                                </p>
                                                <Link href={`/login/?redirect_to=product/${slug}`}>
                                                    <button className="px-6 py-3 bg-[#1D76BC] text-white rounded-md hover:bg-[#1660A0] transition-colors">
                                                        Login to Continue
                                                    </button>
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <label className="text-sm text-gray-700 font-medium">Your Email</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="email"
                                                        value={profile.email}
                                                        readOnly
                                                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-500 bg-gray-50 cursor-not-allowed focus:outline-none"
                                                        placeholder="support@works360.com"
                                                    />
                                                    <button
                                                        onClick={handleAddToWaitlist}
                                                        disabled={isAddingToWaitlist}
                                                        className="px-4 py-2 bg-[#1D76BC] cursor-pointer text-white text-sm rounded-md hover:bg-[#1660A0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
                                                    >
                                                        {isAddingToWaitlist ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                                <span>Adding...</span>
                                                            </>
                                                        ) : (
                                                            <span>Add to Waitlist</span>
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    You'll receive an email notification when this product is back in stock.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-8">

                       <div className="flex items-center gap-4 mb-6 sm:mx-0 mx-4">
                            <h2 className="text-2xl font-bold text-gray-900 whitespace-nowrap">Related Products</h2>
                            <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6 gap-4 sm:mx-0 mx-4">
                            {relatedProducts.map(product => {
                                if (product.post_status !== "Publish") {
                                    return null;
                                }
                                return (
                                    <Link href={`/product/${product.slug}`} key={product.id}>
                                        <div className="bg-gray-50 border border-gray-300 rounded-lg sm:py-5 p-3 overflow-hidden hover:shadow-md transition-shadow duration-300 group relative h-full flex flex-col">
                                            {product.stock_quantity == 0 && (
                                                <div className="absolute top-4 left-0 z-10 flex items-center gap-1 bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-br-full rounded-tr-full">
                                                    Out of stock
                                                </div>
                                            )}

                                            {product.five_g_Enabled && (
                                                <div className="absolute top-4 right-3 z-10">
                                                    <img
                                                        src="/5g-logo.png"
                                                        alt="5G Enabled"
                                                        className="w-10 h-10 object-contain"
                                                    />
                                                </div>
                                            )}

                                            {product.post_status !== "Publish" && (
                                                <div className="absolute sm:top-45 sm:right-3 top-5 z-10 flex items-center gap-1 text-xs text-white font-semibold px-3 py-1 rounded-full rounded-tr-full bg-[#41abd6]">
                                                    Private
                                                </div>
                                            )}

                                            <div className="flex items-center justify-center transition-colors h-48 min-h-48 sm:mt-0 -mt-12 relative">
                                                {product.thumbnail ? (
                                                    <img
                                                        src={product.thumbnail}
                                                        alt={product.product_name}
                                                        className="object-contain h-full w-full p-2"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full w-full text-gray-400">
                                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col grow space-y-2 text-center sm:mt-4 -mt-7">
                                                <h3 className="text-gray-800 sm:text-md text-sm line-clamp-1 min-h-14 flex items-center justify-center">
                                                    {product.product_name}
                                                </h3>

                                                <div className="text-gray-500 text-xs sm:py-3 py-1 space-y-1">
                                                    <p><b>SKU:</b> {product.sku}</p>
                                                </div>

                                                <div className="grow"></div>

                                                {product.stock_quantity != 0 ? (
                                                    <div className="sm:pt-4 sm:mb-2 mt-auto">
                                                        {renderRelatedProductButton(product)}
                                                    </div>
                                                ) : (
                                                    <div className="sm:pt-4 sm:mb-2 mt-auto">
                                                        <button
                                                            className="self-start sm:px-6 px-3 sm:py-2.5 py-1.5 text-sm font-medium
                                                                text-[#4e5050] border border-[#484a4a] rounded-sm
                                                                hover:bg-[#eaebeb] transition-colors"
                                                        >
                                                            Read More
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}