//src/app/api/cron/shipped-reminder/route.ts

import { emailTemplates, sendCronEmail } from "@/lib/email";
import { ReturnReminderEmail, ShippedEmail } from "@/lib/emailconst";
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

const SHIPPED_STATUS = process.env.NEXT_PUBLIC_STATUS_SHIPPED;

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ Fix 1: product name bhi fetch karo
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, product:product_id(name)")
      .eq("order_status", SHIPPED_STATUS)
      .not("shipped_date", "is", null);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let sentCount = 0;

    for (const order of orders || []) {
      const shippedDate = new Date(order.shipped_date);
      shippedDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (today.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays !== 25) continue;

      // ✅ Fix 2: products_array nahi hai — single product use karo
      const productsForEmail = [{
        name: order.product?.name || "Product",
        quantity: order.quantity || 0,
      }];

      const totalQuantity = order.quantity || 0;

      const template = emailTemplates.shippedReminderEmail({
        orderNumber: order.order_no,
        orderDate: order.order_date,
        customerName: order.contact_name || "Customer",
        customerEmail: order.order_by_user?.email,
        shippedDate: order.shipped_date,

        products: productsForEmail,
        totalQuantity,

        orderTracking: order.tracking || "",
        orderTrackingLink: order.tracking_link || "",
        returnTracking: order.return_tracking || "",
        returnTrackingLink: order.return_tracking_link || "",
        caseType: order.case_type || "",
        fileLink: order.return_label || "",

        salesExecutive: order.sales_executive || "",
        salesExecutiveEmail: order.se_email || "",
        companyName: order.company_name || "",
        contactName: order.contact_name || "",
        contactEmail: order.email || "",
        shippingAddress: order.address || "",
        city: order.city || "",
        state: order.state || "",
        zip: order.zip || "",
        deliveryDate: order.desired_date || "",

        deviceUnits: order.dev_opportunity || 0,
        budgetPerDevice: order.dev_budget || 0,
        revenue: order.rev_opportunity || 0,
        ingramAccount: order.ingram_account || "", // ✅ Fix 3: crm_account → ingram_account

        quoteNumber: order.quote_number || "",
        competitiveOpportunity: order.is_competitive || "",
        estimatedCloseDate: order.estimated_close_date || "",
        wants5gSim: order.wants_5g_sim ? "Yes" : "No",

        segment: order.segment || "",
        note: order.notes || "",
      });

      const mergedEmails = [
        order.order_by_user?.email,
        ...ReturnReminderEmail,
      ].filter(Boolean);

      await sendCronEmail({
        to: `ahmer.ali@works360.com`,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      sentCount++;
    }

    return NextResponse.json({
      success: true,
      message: `25-day reminder emails sent: ${sentCount}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}