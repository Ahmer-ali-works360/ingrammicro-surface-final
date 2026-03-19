"use client"

import * as React from "react"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, CheckSquare, Square } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { TbFileTypeCsv } from "react-icons/tb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { emailTemplates, sendEmail } from "@/lib/email"
import { logActivity } from "@/lib/logger";

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
    segment: string | null
    order_month: string | null
    order_quarter: string | null
    order_year: string | null
    sales_executive: string | null
    current_manufacturer: string | null
    contact_name: string | null
    email: string | null
    address: string | null
    state: string | null
    city: string | null
    zip: string | null
    desired_date: string | null
    notes: string | null
    product_id: string | null
    tracking: string | null
    return_tracking: string | null
    tracking_link: string | null
    return_tracking_link: string | null
    username: string | null
    case_type: string | null
    password: string | null
    return_label: string | null
    ingram_account: string | null
    quote_number: string | null
    is_competitive: string | null
    estimated_close_date: string | null
    wants_5g_sim: string | null
    products?: any[]
}

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
    const [isSendingReminders, setIsSendingReminders] = useState(false);

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 1000,
    });
    const [globalFilter, setGlobalFilter] = useState<string>("")

    const formatDateToCustomFormat = (dateString: string | null) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        } catch { return '-'; }
    };

    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const ssRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const sRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    const allowedRoles = [adminRole, ssRole, smRole].filter(Boolean);
    const actionRoles = [adminRole, ssRole, smRole].filter(Boolean);

    const columnDisplayNames: Record<string, string> = {
        "select": "Select",
        "order_no": "Order #",
        "order_date": "Order Date",
        "order_status": "Shipping Status",
        "rev_opportunity": "Pipeline Opportunity",
        "dev_budget": "Budget Per Device",
        "dev_opportunity": "Device Opportunity Size",
        "se_email": "Sales Executive Email",
        "company_name": "Customer Name",
        "shipped_date": "Shipped Date",
        "returned_date": "Returned Date",
        "segment": "Segment",
        "order_month": "Order Month",
        "order_quarter": "Order Quarter",
        "order_year": "Order Year",
        "actions": "Actions"
    };

    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);
    const isActionAuthorized = profile?.role && actionRoles.includes(profile.role);

    useEffect(() => {
        if (loading) return;
        if (!isLoggedIn || !profile?.isVerified) {
            router.replace('/login/?redirect_to=overdue-orders');
            return;
        }
        if (!isAuthorized) {
            router.replace('/product-category/alldevices');
            return;
        }
    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    const calculateDaysShipped = (shippedDate: string | null): number => {
        if (!shippedDate) return 0;
        const diffTime = Math.abs(new Date().getTime() - new Date(shippedDate).getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const calculateEstimatedReturnDate = (shippedDate: string | null): Date | null => {
        if (!shippedDate) return null;
        const date = new Date(shippedDate);
        date.setDate(date.getDate() + 30);
        return date;
    };

    const formatEstimatedReturnDate = (shippedDate: string | null): string => {
        const date = calculateEstimatedReturnDate(shippedDate);
        if (!date) return "-";
        return `${date.getDate().toString().padStart(2, '0')}-${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear()}`;
    };

    const hasReturnDatePassed = (shippedDate: string | null): boolean => {
        if (!shippedDate) return false;
        const estimated = calculateEstimatedReturnDate(shippedDate);
        if (!estimated) return false;
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const returnMidnight = new Date(estimated.getFullYear(), estimated.getMonth(), estimated.getDate());
        return returnMidnight < todayMidnight;
    };

    const calculateDaysOverdue = (shippedDate: string | null): number => {
        return Math.max(0, calculateDaysShipped(shippedDate) - 30);
    };

    const fetchOrders = async () => {
        const startTime = Date.now();

        await logActivity({
            type: 'order',
            level: 'info',
            action: 'overdue_orders_fetch_attempt',
            message: 'Attempting to fetch overdue orders',
            userId: profile?.id || null,
            details: { userRole: profile?.role, isActionAuthorized }
        });

        try {
            setIsLoading(true);
            setError(null);

            const shippedStatus = process.env.NEXT_PUBLIC_STATUS_SHIPPED;
            if (!shippedStatus) throw new Error("Shipping status environment variable not set");

            let ordersData: Order[] = [];

            if (!isActionAuthorized) {
                const { data, error: supabaseError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('order_status', shippedStatus)
                    .eq("order_by", profile?.id)
                    .order('order_no', { ascending: false });

                if (supabaseError) throw supabaseError;
                if (data) ordersData = data as Order[];
            } else {
                const { data, error: supabaseError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('order_status', shippedStatus)
                    .order('order_no', { ascending: false });

                if (supabaseError) throw supabaseError;
                if (data) ordersData = data as Order[];
            }

            const filteredOrders = ordersData.filter(order => hasReturnDatePassed(order.shipped_date));

            await logActivity({
                type: 'order',
                level: 'success',
                action: 'overdue_orders_fetch_success',
                message: `Successfully fetched ${filteredOrders.length} overdue orders`,
                userId: profile?.id || null,
                details: {
                    totalOrders: ordersData.length,
                    overdueOrders: filteredOrders.length,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'completed'
            });

            setOrders(filteredOrders);
            setSelectedRows({});

        } catch (err: unknown) {
            await logActivity({
                type: 'order',
                level: 'error',
                action: 'overdue_orders_fetch_error',
                message: 'Failed to fetch overdue orders',
                userId: profile?.id || null,
                details: { error: err, executionTimeMs: Date.now(), userRole: profile?.role },
                status: 'failed'
            });
            setError(err instanceof Error ? err.message : 'Failed to fetch orders');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            fetchOrders();
        }
    }, [loading, isLoggedIn, profile, isAuthorized]);

    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateString: string | null) => formatDateToCustomFormat(dateString);

    const handleSelectAll = () => {
        const allSelected = Object.keys(selectedRows).length === orders.length && orders.length > 0 && Object.values(selectedRows).every(Boolean);
        if (allSelected) {
            setSelectedRows({});
        } else {
            const newSelected: Record<string, boolean> = {};
            orders.forEach(o => { newSelected[o.id] = true; });
            setSelectedRows(newSelected);
        }
    };

    const handleSelectRow = (orderId: string) => {
        setSelectedRows(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const handleSendReminders = async () => {
        const selectedOrderIds = Object.keys(selectedRows).filter(id => selectedRows[id]);

        if (selectedOrderIds.length === 0) {
            toast.error("Please select at least one order to send reminder", { style: { color: "white", backgroundColor: "red" } });
            return;
        }

        await logActivity({
            type: 'email',
            level: 'info',
            action: 'send_overdue_reminders_attempt',
            message: `Attempting to send reminders for ${selectedOrderIds.length} overdue orders`,
            userId: profile?.id || null,
            details: { selectedOrderIds, selectedCount: selectedOrderIds.length, userRole: profile?.role }
        });

        const startTime = Date.now();
        setIsSendingReminders(true);

        try {
            const { data: selectedOrdersData, error: orderError } = await supabase
                .from('orders')
                .select(`*, users:order_by (id, email), products:product_id (*)`)
                .in('id', selectedOrderIds);

            if (orderError) throw orderError;

            if (!selectedOrdersData || selectedOrdersData.length === 0) {
                toast.error("No orders found", { style: { color: "white", backgroundColor: "red" } });
                return;
            }

            const emailPromises = selectedOrdersData.map(async (order: any) => {
                if (!order.users?.email) {
                    return { success: false, orderId: order.id, orderNumber: order.order_no, reason: 'User email not found' };
                }

                try {
                    const customerName = order.contact_name || order.company_name || "Customer";
                    const productName = order.products?.product_name || "Standard Device Package";
                    const productSlug = order.products?.slug || "standard-device-package";
                    const quantity = order.quantity || 1;

                    const products = [{ name: productName, quantity, slug: productSlug }];
                    const daysSinceShipped = calculateDaysShipped(order.shipped_date);
                    const daysOverdue = calculateDaysOverdue(order.shipped_date);
                    let daysCountText = `${daysSinceShipped} days`;
                    if (daysOverdue > 0) daysCountText += ` (${daysOverdue} days overdue)`;

                    const emailData = {
                        orderNumber: order.order_no,
                        orderDate: formatDateToCustomFormat(order.order_date),
                        customerName,
                        customerEmail: order.users.email,
                        products,
                        totalQuantity: quantity,
                        returnTracking: order.return_tracking || "Not provided yet",
                        fileLink: order.return_label || "https://ingrammicro-surface.com",

                        // Updated fields - removed old, added new
                        salesExecutive: order.sales_executive || "N/A",
                        salesExecutiveEmail: order.se_email || "N/A",

                        companyName: order.company_name || "N/A",
                        contactName: order.contact_name || "N/A",
                        contactEmail: order.email || "N/A",
                        shippingAddress: order.address || "N/A",
                        city: order.city || "N/A",
                        state: order.state || "N/A",
                        zip: order.zip || "N/A",
                        deliveryDate: formatDateToCustomFormat(order.desired_date) || "N/A",

                        deviceUnits: order.dev_opportunity || 0,
                        budgetPerDevice: order.dev_budget || 0,
                        revenue: order.rev_opportunity || 0,

                        ingramAccount: order.ingram_account || "N/A",
                        quoteNumber: order.quote_number || "N/A",
                        competitiveOpportunity: order.is_competitive || "N/A",
                        estimatedCloseDate: order.estimated_close_date || "N/A",
                        wants5gSim: order.wants_5g_sim || "N/A",
                        segment: order.segment || "N/A",
                        currentManufacturer: order.current_manufacturer || "N/A",

                        note: order.notes || "No notes available",
                        daysCount: daysCountText,
                        shippedDate: formatDateToCustomFormat(order.shipped_date)
                    };

                    const template = emailTemplates.returnReminderCronEmail(emailData);

                    await sendEmail({
                        to: order.users.email,
                        subject: template.subject,
                        text: template.text,
                        html: template.html,
                    });

                    await logActivity({
                        type: 'email',
                        level: 'info',
                        action: 'overdue_reminder_sent',
                        message: `Reminder sent for order ${order.order_no}`,
                        userId: profile?.id || null,
                        orderId: order.id,
                        details: { orderNumber: order.order_no, customerEmail: order.users.email, daysOverdue, daysSinceShipped },
                        status: 'sent'
                    });

                    return { success: true, orderId: order.id, orderNumber: order.order_no, email: order.users.email };

                } catch (emailError: any) {
                    await logActivity({
                        type: 'email',
                        level: 'error',
                        action: 'overdue_reminder_failed',
                        message: `Failed to send reminder for order ${order.order_no}`,
                        userId: profile?.id || null,
                        orderId: order.id,
                        details: { orderNumber: order.order_no, error: emailError.message },
                        status: 'failed'
                    });
                    return { success: false, orderId: order.id, orderNumber: order.order_no, reason: emailError.message || 'Email sending failed' };
                }
            });

            const results = await Promise.all(emailPromises);
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            await logActivity({
                type: 'email',
                level: successful > 0 ? 'success' : 'error',
                action: 'send_overdue_reminders_complete',
                message: `Sent reminders for ${successful} order(s), ${failed} failed`,
                userId: profile?.id || null,
                details: {
                    totalAttempted: selectedOrderIds.length,
                    successful,
                    failed,
                    executionTimeMs: Date.now() - startTime,
                },
                status: successful > 0 ? 'completed' : 'failed'
            });

            if (successful > 0) toast.success(`Reminders sent successfully for ${successful} order(s)${failed > 0 ? `, ${failed} failed` : ''}`, { style: { color: "white", backgroundColor: "black" } });
            if (failed > 0) toast.error(`Failed to send ${failed} reminder(s)`, { style: { color: "white", backgroundColor: "red" } });

            setSelectedRows({});

        } catch (err: any) {
            await logActivity({
                type: 'email',
                level: 'error',
                action: 'send_overdue_reminders_error',
                message: `Failed to send overdue reminders: ${err.message}`,
                userId: profile?.id || null,
                details: { error: err.message, executionTimeMs: Date.now() - startTime, userRole: profile?.role },
                status: 'failed'
            });
            toast.error(err.message || "Failed to send reminders", { style: { color: "white", backgroundColor: "red" } });
        } finally {
            setIsSendingReminders(false);
        }
    };

    const columns: ColumnDef<Order>[] = [
        ...(profile?.role !== smRole && profile?.role !== sRole ? [{
            id: "select",
            header: () => (
                <div className="flex justify-center">
                    <button onClick={handleSelectAll} className="cursor-pointer">
                        {Object.keys(selectedRows).length === orders.length && orders.length > 0 && Object.values(selectedRows).every(Boolean)
                            ? <CheckSquare className="h-5 w-5 text-[#E5E7EB]" />
                            : <Square className="h-5 w-5 text-gray-400" />}
                    </button>
                </div>
            ),
            cell: ({ row }: { row: any }) => {
                const order = row.original as Order;
                return (
                    <div className="flex justify-center">
                        <input type="checkbox" checked={!!selectedRows[order.id]} onChange={() => handleSelectRow(order.id)}
                            className="h-4 w-4 rounded border-gray-300 text-[#E5E7EB] focus:ring-[#E5E7EB] cursor-pointer" />
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
        }] : []),
        {
            accessorKey: "order_no",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Order # <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-left ps-2 font-medium">
                    <Link href={`/order-details/${row.getValue("order_no")}`} target="_blank" className="text-teal-600 underline">{row.getValue("order_no")}</Link>
                </div>
            ),
        },
        {
            accessorKey: "company_name",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Company Name <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("company_name") || '-'}</div>,
        },
        {
            accessorKey: "order_status",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Shipping Status <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-left ps-2 capitalize">{row.getValue("order_status") as string}</div>,
        },
        {
            id: "days_shipped",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Days Since Shipped <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const order = row.original;
                const days = calculateDaysShipped(order.shipped_date);
                const daysOverdue = calculateDaysOverdue(order.shipped_date);
                let className = "text-left ps-2 font-medium";
                if (daysOverdue > 0) className += " text-red-600";
                else if (days > 40) className += " text-orange-600";
                else if (days > 35) className += " text-yellow-600";
                return <div className={className}>{days} days</div>;
            },
        },
        {
            id: "days_overdue",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Days Overdue <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const order = row.original;
                const daysOverdue = calculateDaysOverdue(order.shipped_date);
                return (
                    <div className={`text-left ps-2 font-medium${daysOverdue > 0 ? " text-red-600 font-semibold" : ""}`}>
                        {daysOverdue > 0 ? `${daysOverdue} days` : "On time"}
                    </div>
                );
            },
        },
        {
            accessorKey: "order_date",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Order Date <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-left ps-2">{formatDate(row.getValue("order_date") as string)}</div>,
        },
        {
            accessorKey: "shipped_date",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Shipped Date <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-left ps-2">{formatDate(row.getValue("shipped_date") as string)}</div>,
        },
        {
            id: "estimated_return_date",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Estimated Return Date <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const order = row.original;
                const daysOverdue = calculateDaysOverdue(order.shipped_date);
                return (
                    <div className={`text-left ps-2${daysOverdue > 0 ? " text-red-600 font-semibold" : ""}`}>
                        {formatEstimatedReturnDate(order.shipped_date)}
                    </div>
                );
            },
        },
        {
            accessorKey: "return_tracking",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Return Tracking # <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const order = row.original;
                if (!order.return_tracking) return <div className="text-left ps-2 text-gray-500">Not returned yet</div>;
                if (order.return_tracking_link) return (
                    <div className="text-left ps-2">
                        <Link href={order.return_tracking_link} target="_blank" className="text-blue-600 hover:underline cursor-pointer">{order.return_tracking}</Link>
                    </div>
                );
                return <div className="text-left ps-2">{order.return_tracking}</div>;
            },
        },
        {
            accessorKey: "sales_executive",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Sales Executive <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("sales_executive") || '-'}</div>,
        },
        {
            accessorKey: "se_email",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Sales Executive Email <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("se_email") as string}</div>,
        },
        {
            accessorKey: "notes",
            header: ({ column }) => (
                <Button variant="ghost" className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Notes <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("notes") || '-'}</div>,
        }
    ];

    const table = useReactTable({
        data: orders,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "auto",
        state: { sorting, columnFilters, columnVisibility, rowSelection, pagination, globalFilter },
    });

    const handleExportCSV = () => {
        if (orders.length === 0) {
            toast.info("No data to export");
            return;
        }

        const startTime = Date.now();

        logActivity({
            type: 'export',
            level: 'info',
            action: 'csv_export_attempt',
            message: 'Attempting to export overdue orders to CSV',
            userId: profile?.id || null,
            details: { ordersCount: orders.length, userRole: profile?.role }
        });

        try {
            const data = orders.map(order => ({
                'Order #': order.order_no || '',
                'Order Date': formatDateToCustomFormat(order.order_date),
                'Shipping Status': order.order_status || '',
                'Days Since Shipped': calculateDaysShipped(order.shipped_date),
                'Days Overdue': calculateDaysOverdue(order.shipped_date),
                'Estimated Return Date': formatEstimatedReturnDate(order.shipped_date),
                'Pipeline Opportunity': order.rev_opportunity || 0,
                'Budget Per Device': order.dev_budget || 0,
                'Device Opportunity Size': order.dev_opportunity || 0,
                'INGRAM Account #': order.ingram_account || '',
                'Quote #': order.quote_number || '',
                'Is Competitive': order.is_competitive || '',
                'Estimated Close Date': formatDateToCustomFormat(order.estimated_close_date),
                'Wants 5G SIM': order.wants_5g_sim || '',
                'Sales Executive Email': order.se_email || '',
                'Customer Name': order.company_name || '',
                'Shipped Date': formatDateToCustomFormat(order.shipped_date),
                'Returned Date': formatDateToCustomFormat(order.returned_date),
                'Segment': order.segment || '',
                'Current Manufacturer': order.current_manufacturer || '',
                'Order Month': order.order_month || '',
                'Order Quarter': order.order_quarter || '',
                'Order Year': order.order_year || '',
                'Tracking Number': order.tracking || '',
                'Return Tracking': order.return_tracking || '',
                'Tracking Link': order.tracking_link || '',
                'Return Tracking Link': order.return_tracking_link || '',
                'Username': order.username || '',
                'Case Type': order.case_type || '',
                'Return Label': order.return_label || ''
            }));

            const csvString = convertToCSV(data);
            downloadCSV(csvString, `overdue_orders_${new Date().toISOString().split('T')[0]}.csv`);

            logActivity({
                type: 'export',
                level: 'success',
                action: 'csv_export_success',
                message: `Successfully exported ${orders.length} overdue orders to CSV`,
                userId: profile?.id || null,
                details: { ordersCount: orders.length, executionTimeMs: Date.now() - startTime, userRole: profile?.role },
                status: 'completed'
            });
        } catch (error) {
            logActivity({
                type: 'export',
                level: 'error',
                action: 'csv_export_failed',
                message: 'Failed to export overdue orders to CSV',
                userId: profile?.id || null,
                details: { errorDetails: error, executionTimeMs: Date.now() - startTime, userRole: profile?.role },
                status: 'failed'
            });
            setError('Failed to export CSV');
        }
    };

    const convertToCSV = (data: any[]) => {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const escapeCSV = (field: any) => {
            if (field === null || field === undefined) return '';
            const string = String(field);
            if (string.includes(',') || string.includes('"') || string.includes('\n')) return `"${string.replace(/"/g, '""')}"`;
            return string;
        };
        return [headers.map(escapeCSV).join(','), ...data.map(row => headers.map(h => escapeCSV(row[h])).join(','))].join('\n');
    };

    const downloadCSV = (csvContent: string, fileName: string) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const selectedCount = Object.values(selectedRows).filter(Boolean).length;

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-lg">Loading authentication...</div></div>;
    if (!isAuthorized) return <div className="flex items-center justify-center h-screen"><div className="text-lg">Redirecting...</div></div>;

    return (
        <div className="container mx-auto py-10 px-5">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="sm:text-3xl text-xl font-bold"></h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchOrders} disabled={isLoading} className="cursor-pointer">
                        {isLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button onClick={handleExportCSV} className="bg-[#E5E7EB] hover:bg-[#9CA3AF] text-black cursor-pointer">
                        <TbFileTypeCsv />
                        Export CSV
                    </Button>
                </div>
            </div>

            {profile?.role !== smRole && selectedCount > 0 && (
                <div className="mb-6 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <span>{selectedCount}</span>
                            <span className="ml-1">{selectedCount === 1 ? 'order selected' : 'orders selected'}</span>
                        </div>
                        <div className="send-reminders-button">
                            <button
                                onClick={handleSendReminders}
                                disabled={isSendingReminders}
                                className="flex items-center gap-2 bg-[#E5E7EB] hover:bg-[#9CA3AF] text-black px-4 py-2 rounded-md disabled:opacity-50"
                            >
                                {isSendingReminders ? "Sending..." : "Send Reminders"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
            )}

            <div className="w-full">
                <div className="flex items-center justify-between py-4 gap-4">
                    <div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto">
                                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table.getAllColumns().filter(col => col.getCanHide() && col.id !== 'select').map(column => (
                                    <DropdownMenuCheckboxItem key={column.id} className="capitalize" checked={column.getIsVisible()} onCheckedChange={(value: boolean) => column.toggleVisibility(!!value)}>
                                        {columnDisplayNames[column.id] || column.id}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div>
                        <Input placeholder="Search..." value={globalFilter ?? ""} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-8" />
                    </div>
                </div>

                <div className="overflow-hidden rounded-md">
                    <Table className="border">
                        <TableHeader>
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id} className="bg-[#E5E7EB] hover:bg-[#9CA3AF]">
                                    {headerGroup.headers.map(header => (
                                        <TableHead key={header.id} className="text-black font-semibold border-r border-[#E5E7EB] last:border-r-0">
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map(row => (
                                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className={`hover:bg-gray-50 ${selectedRows[row.original.id] ? 'bg-blue-50' : ''}`}>
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell key={cell.id} className="border-r border-gray-200 last:border-r-0 align-middle">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center border-r-0">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                                <span className="ml-2">Loading overdue orders...</span>
                                            </div>
                                        ) : "No overdue orders found. All orders are within their 30-day return period."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="hidden sm:block text-sm text-gray-600"></div>
                        <div className="flex items-center justify-center space-x-1 w-full sm:w-auto">
                            {/* Mobile pagination */}
                            <div className="sm:hidden flex items-center justify-center w-full">
                                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="flex-1 max-w-25">‹ Prev</Button>
                                <div className="mx-4 flex items-center">
                                    <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span>
                                    <span className="mx-1 text-gray-500">of</span>
                                    <span className="text-gray-600">{table.getPageCount()}</span>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="flex-1 max-w-25">Next ›</Button>
                            </div>

                            {/* Desktop pagination */}
                            <div className="hidden sm:flex items-center space-x-1">
                                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3">Previous</Button>
                                {(() => {
                                    const pageCount = table.getPageCount();
                                    const currentPage = table.getState().pagination.pageIndex;
                                    if (pageCount <= 7) {
                                        return Array.from({ length: pageCount }, (_, i) => i).map(pageIndex => (
                                            <Button key={pageIndex} variant={currentPage === pageIndex ? "default" : "outline"} size="sm" onClick={() => table.setPageIndex(pageIndex)} className="w-8 h-8 p-0">{pageIndex + 1}</Button>
                                        ));
                                    }
                                    const pages = [];
                                    pages.push(<Button key={0} variant={currentPage === 0 ? "default" : "outline"} size="sm" onClick={() => table.setPageIndex(0)} className="w-8 h-8 p-0">1</Button>);
                                    let start = Math.max(1, currentPage - 1);
                                    let end = Math.min(pageCount - 2, currentPage + 1);
                                    if (currentPage <= 2) { start = 1; end = 3; }
                                    if (currentPage >= pageCount - 3) { start = pageCount - 4; end = pageCount - 2; }
                                    if (start > 1) pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                                    for (let i = start; i <= end; i++) {
                                        pages.push(<Button key={i} variant={currentPage === i ? "default" : "outline"} size="sm" onClick={() => table.setPageIndex(i)} className="w-8 h-8 p-0">{i + 1}</Button>);
                                    }
                                    if (end < pageCount - 2) pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                                    pages.push(<Button key={pageCount - 1} variant={currentPage === pageCount - 1 ? "default" : "outline"} size="sm" onClick={() => table.setPageIndex(pageCount - 1)} className="w-8 h-8 p-0">{pageCount}</Button>);
                                    return pages;
                                })()}
                                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3">Next</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}