//src/app/api/cron/send-overdue-reminders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { emailTemplates, sendCronEmail } from "@/lib/email";
import { logActivity, logEmail } from "@/lib/logger";
import { OverDueReminderEmail } from "@/lib/emailconst";

export async function GET(request: NextRequest) {
    try {
        console.log("🚀 Starting automatic overdue orders reminder cron...");

        const shippedStatus = process.env.NEXT_PUBLIC_STATUS_SHIPPED;
        if (!shippedStatus) {
            throw new Error("Shipping status environment variable not set");
        }

        const today = new Date();
        const todayString = today.toISOString().split('T')[0];

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                users:order_by (
                    id,
                    email
                ),
                product:product_id (
                    id,
                    product_name,
                    slug
                )
            `)
            .eq('order_status', shippedStatus)
            .not('shipped_date', 'is', null);

        if (ordersError) throw ordersError;

        if (!orders || orders.length === 0) {
            console.log("ℹ️ No shipped orders found");
            return NextResponse.json({
                success: true,
                remindersSent: 0,
                message: "No shipped orders found"
            });
        }

        console.log(`👥 Found ${orders.length} shipped orders`);

        let sent = 0;
        let skipped = 0;
        let errors = 0;

        // Helper: days difference
        const calculateDaysDifference = (date1: Date, date2: Date): number => {
            const diffTime = Math.abs(date2.getTime() - date1.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        for (const order of orders) {
            try {
                if (!order.shipped_date) {
                    skipped++;
                    continue;
                }

                const shippedDate = new Date(order.shipped_date);
                const daysSinceShipped = calculateDaysDifference(shippedDate, today);

                if (daysSinceShipped < 35) {
                    console.log(`⏳ Skipping order #${order.order_no}: ${daysSinceShipped} days (less than 35)`);
                    skipped++;
                    continue;
                }

                if (!order.users?.email) {
                    console.log(`⚠️ No email for order #${order.order_no}`);
                    continue;
                }

                // ✅ Naye columns use karo
                const lastReminderDate = order.last_reminder_sent_at
                    ? new Date(order.last_reminder_sent_at)
                    : null;
                const reminderCount = order.reminder_count || 0;

                let shouldSendReminder = false;
                let newReminderCount = reminderCount;

                if (!lastReminderDate) {
                    // Pehli baar
                    shouldSendReminder = true;
                    newReminderCount = 1;
                } else {
                    // 10 din guzre hain?
                    const daysSinceLastReminder = calculateDaysDifference(lastReminderDate, today);
                    if (daysSinceLastReminder >= 10) {
                        shouldSendReminder = true;
                        newReminderCount = reminderCount + 1;
                    }
                }

                if (!shouldSendReminder) {
                    console.log(`⏳ Not time for reminder yet for order #${order.order_no}`);
                    skipped++;
                    continue;
                }

                const productName = order.product?.product_name || "Product";
                const productSlug = order.product?.slug || "#";
                const productQuantity = order.quantity || 0;

                const productsList = {
                    text: `${productName} (Qty: ${productQuantity})`,
                    html: `
                        <tr>
                            <td style="padding:10px; border:1px solid #ddd;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL}/product/${productSlug}">
                                    ${productName}
                                </a>
                            </td>
                            <td style="padding:10px; border:1px solid #ddd; text-align:center;">
                                ${productQuantity}
                            </td>
                        </tr>
                    `,
                    totalQuantity: productQuantity,
                    productNames: [productName]
                };

                const emailData = {
                    orderNumber: order.order_no,
                    orderDate: new Date(order.order_date).toLocaleDateString(),
                    productName: productsList.productNames.join(', '),
                    productListText: productsList.text,
                    productListHtml: productsList.html,
                    totalQuantity: productsList.totalQuantity,
                    returnTracking: order.return_tracking || "Not provided yet",
                    fileLink: order.return_label || `${process.env.NEXT_PUBLIC_APP_URL || "https://ingrammicro-surface.com"}`,
                    salesExecutive: order.sales_executive || "N/A",
                    salesExecutiveEmail: order.se_email || "N/A",
                    companyName: order.company_name || "N/A",
                    contactEmail: order.email || "N/A",
                    shippedDate: new Date(order.shipped_date).toLocaleDateString(),
                    customerName: order.company_name || "Customer",
                    customerEmail: order.users.email
                };

                const template = emailTemplates.returnReminderEmail({
                    orderNumber: emailData.orderNumber,
                    orderDate: emailData.orderDate,
                    customerName: emailData.customerName,
                    customerEmail: emailData.customerEmail,
                    productName: emailData.productName,
                    productListText: emailData.productListText,
                    productListHtml: emailData.productListHtml,
                    totalQuantity: emailData.totalQuantity,
                    returnTracking: emailData.returnTracking,
                    fileLink: emailData.fileLink,
                    salesExecutive: emailData.salesExecutive,
                    salesExecutiveEmail: emailData.salesExecutiveEmail,
                    companyName: emailData.companyName,
                    contactEmail: emailData.contactEmail,
                    shippedDate: emailData.shippedDate
                });

                const mergedEmails = [order.users.email, ...OverDueReminderEmail];

                const emailResult = await sendCronEmail({
                    to: mergedEmails,
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                });

                if (emailResult.success) {
                    // ✅ Notes ki jagah naye columns update karo
                    await supabase
                        .from('orders')
                        .update({
                            last_reminder_sent_at: today.toISOString(),
                            reminder_count: newReminderCount
                        })
                        .eq('id', order.id);

                    await logEmail(
                        'overdue_reminder_sent',
                        `Return reminder #${newReminderCount} sent for order #${order.order_no}`,
                        order.users?.id || null,
                        {
                            orderId: order.id,
                            orderNumber: order.order_no,
                            customerEmail: order.users.email,
                            daysSinceShipped,
                            reminderNumber: newReminderCount,
                            lastReminderDate,
                            totalQuantity: productsList.totalQuantity,
                            productNames: productsList.productNames,
                            emailSubject: template.subject,
                            shippedDate: order.shipped_date
                        },
                        'sent',
                        '/api/cron/send-overdue-reminders'
                    );

                    sent++;
                    console.log(`📧 Reminder #${newReminderCount} sent to ${order.users.email} for order #${order.order_no} (${daysSinceShipped} days)`);
                } else {
                    await logEmail(
                        'overdue_reminder_failed',
                        `Failed to send reminder for order #${order.order_no}`,
                        order.users?.id || null,
                        {
                            orderId: order.id,
                            orderNumber: order.order_no,
                            customerEmail: order.users.email,
                            error: emailResult.error,
                            daysSinceShipped,
                            reminderNumber: newReminderCount
                        },
                        'failed',
                        '/api/cron/send-overdue-reminders'
                    );

                    errors++;
                    console.error(`❌ Email failed for order #${order.order_no}:`, emailResult.error);
                }

            } catch (err: any) {
                await logActivity({
                    type: 'email',
                    level: 'error',
                    action: 'overdue_reminder_processing_error',
                    message: `Failed to process reminder for order #${order.order_no}`,
                    userId: order.users?.id || null,
                    details: {
                        orderId: order.id,
                        orderNumber: order.order_no,
                        error: err.message || err,
                        shippedDate: order.shipped_date
                    },
                    status: 'failed',
                    source: '/api/cron/send-overdue-reminders'
                });
                console.error(`❌ Failed for order #${order.order_no}:`, err.message || err);
                errors++;
            }
        }

        await logActivity({
            type: 'cron',
            level: 'info',
            action: 'overdue_reminders_cron_completed',
            message: `Automatic overdue reminders cron completed successfully`,
            userId: null,
            details: {
                totalOrdersProcessed: orders.length,
                emailsSent: sent,
                ordersSkipped: skipped,
                errors,
                executionDate: todayString
            },
            status: 'completed',
            source: '/api/cron/send-overdue-reminders'
        });

        return NextResponse.json({
            success: true,
            remindersSent: sent,
            skipped,
            errors,
            timestamp: todayString,
        });

    } catch (error: any) {
        await logActivity({
            type: 'cron',
            level: 'error',
            action: 'overdue_reminders_cron_failed',
            message: 'Automatic overdue reminders cron job failed',
            userId: null,
            details: {
                error: error.message || error,
                stack: error.stack
            },
            status: 'failed',
            source: '/api/cron/send-overdue-reminders'
        });
        console.error("❌ Cron job failed:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}