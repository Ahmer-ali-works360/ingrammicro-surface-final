import axios, { AxiosError } from 'axios';

// Email sending utility
export interface EmailData {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
    from?: string;
}

export async function sendEmail(data: EmailData): Promise<{
    success: boolean;
    message?: string;
    error?: string;
}> {
    try {
        const response = await axios.post('/api/send-email', data, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 seconds timeout
            validateStatus: (status) => status >= 200 && status < 500,
        });

        const result = response.data;

        if (response.status >= 400 || !result.success) {
            return {
                success: false,
                error: result.error || `HTTP ${response.status}: Failed to send email`
            };
        }

        return {
            success: true,
            message: result.message
        };

    } catch (error: unknown) {
        console.error('Email sending error:', error);

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Request timeout. Please try again.'
                };
            }

            if (axiosError.response) {
                // Server responded with error status
                return {
                    success: false,
                    error: `Server error (${axiosError.response.status}): ${'Unknown error'}`
                };
            }

            if (axiosError.request) {
                // Request made but no response
                return {
                    success: false,
                    error: 'No response from server. Please check your connection.'
                };
            }
        }

        // Generic error
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

export async function sendCronEmail(data: EmailData): Promise<{
    success: boolean;
    message?: string;
    error?: string;
}> {
    try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, data, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 seconds timeout
            validateStatus: (status) => status >= 200 && status < 500,
        });

        const result = response.data;

        if (response.status >= 400 || !result.success) {
            return {
                success: false,
                error: result.error || `HTTP ${response.status}: Failed to send email`
            };
        }

        return {
            success: true,
            message: result.message
        };

    } catch (error: unknown) {
        console.error('Email sending error:', error);

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Request timeout. Please try again.'
                };
            }

            if (axiosError.response) {
                // Server responded with error status
                return {
                    success: false,
                    error: `Server error (${axiosError.response.status}): ${'Unknown error'}`
                };
            }

            if (axiosError.request) {
                // Request made but no response
                return {
                    success: false,
                    error: 'No response from server. Please check your connection.'
                };
            }
        }

        // Generic error
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

export const formatEmailDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        // Format: DD-MMM-YYYY (e.g., 17-Feb-2026)
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' }); // Feb, Mar, etc.
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
};

export const dateFormatters = {
    // DD-MMM-YYYY (17-Feb-2026)
    short: (date: string | Date | null | undefined) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';
        return `${d.getDate().toString().padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
    },

    // DD Month YYYY (17 February 2026)
    long: (date: string | Date | null | undefined) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';
        return d.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    },

    // MMM DD, YYYY (Feb 17, 2026)
    medium: (date: string | Date | null | undefined) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });
    }
};

// Email Templates
export const emailTemplates = {

    registrationAdminNotification: (userData: {
        firstName: string;
        lastName: string;
        email: string;
        reseller: string;
        registrationDate: string;
        formId?: string;
    }) => ({
        subject: `New User Registration | Ingram Micro Surface (Awaiting Approval)`,
        text: `Dear Program Manager(s),\n\nYou have received a new user registration on Ingram Micro Surface.\nPlease review to approve or reject this user.\n\nReview Pending User(s)\n\nBelow are the details for this user:\n \nEmail (Username): ${userData.email}\nFirst Name: ${userData.firstName}\nLast Name: ${userData.lastName}\nReseller: ${userData.reseller}\n\nPlease login to the admin panel to review this user.\n\nBest regards,\nIngram Micro Surface Team`,
        html: `
        <table style="font-family: 'Inter', sans-serif; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #dddddd;"
        border="0" width="600" cellspacing="0" cellpadding="0" align="center">
        <tr>
            <td align="center">

                <table width="720" cellpadding="0" cellspacing="0"
                    style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                    <!-- HEADER -->
                    <tr>
                        <td style="background:#1D76BC; padding:32px 30px; text-align:center;">
                            <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 500;">New User
                                Registration | Ingram Micro Surface</h1>
                        </td>
                    </tr>

                    <!-- LOGO -->
                    <tr>
                        <td style="padding:24px 30px 0px 30px; text-align:center;">
                            <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png" alt="Ingram Micro Surface"
                                style="max-width:400px; width:220px;">
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding:30px; color:#333;">
                            <h2 style="color: #1D76BC; margin: 0 0 24px; font-size: 20px; font-weight: 500;">Dear
                                Program Manager(s),
                            </h2>

                            <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 8px;">
                                A new user has registered on <strong>Ingramicro surface portal</strong>.
                            </p>
                            <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 32px;">
                                Please review and approve or reject this request.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding:0px 30px;">
                            <table border="0" cellspacing="0" cellpadding="0" align="center">
                                <tr>
                                    <td align="center"
                                        style="background-color:#1D76BC; padding:12px 22px; border-radius:6px;">
                                        <a href="https://ingrammicro-surface-final.vercel.app/pending-users${userData.formId ? `?formId=${userData.formId}` : ''}"
                                            style="color:#ffffff; text-decoration:none; font-size:20px; font-family:Arial, sans-serif; display:inline-block;">
                                            Review Pending User(s)
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:30px; color:#333;">

                            <!-- User Details - Simple Table Style -->
                            <div
                                style="background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 8px; margin: 32px 0; padding: 24px;">
                                <h3
                                    style="color: #1D76BC; margin: 0 0 20px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                                    USER DETAILS</h3>

                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px;">
                                            Registered:</td>
                                        <td style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px;">
                                            ${userData.registrationDate}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
                                            Email:</td>
                                        <td
                                            style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
                                            ${userData.email}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
                                            First Name:</td>
                                        <td
                                            style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
                                            ${userData.firstName}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
                                            Last Name:</td>
                                        <td
                                            style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
                                            ${userData.lastName}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
                                            Reseller:</td>
                                        <td
                                            style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
                                            ${userData.reseller}</td>
                                    </tr>
                                </table>
                            </div>

                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
        `,
    }),


    // Registration Email to User (Waiting for Approval)
    registrationUserWaiting: (userData: {
            firstName: string;
            lastName: string;
            email: string;
            reseller: string;
            registrationDate: string;
    }) => ({
            subject: `Your Registration is Under Review | Ingram Micro Surface`,
            text: `Dear ${userData.firstName} ${userData.lastName},\n\nThank you for registering with Ingram Micro Surface. Your registration has been received and is currently under review by our Program Management team.\n\nWe will review your application and notify you once your account has been approved. This process typically takes 1-2 business days.\n\nRegistration Details:\n- Name: ${userData.firstName} ${userData.lastName}\n- Email: ${userData.email}\n- Reseller: ${userData.reseller}\n- Registration Date: ${userData.registrationDate}\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nIngram Micro Surface Team`,
            html: `
            <table style="font-family: 'Inter', sans-serif; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #dddddd;"
            border="0" width="600" cellspacing="0" cellpadding="0" align="center">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#1D76BC; padding:32px 30px; text-align:center;">
                                <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 500;">Your Registration is Under Review | Ingram Micro Surface</h1>
                            </td>
                        </tr>

                        <!-- LOGO -->
                        <tr>
                            <td style="padding:24px 30px 0px 30px; text-align:center;">
                                <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png" alt="Ingram Micro Surface"
                                    style="max-width:400px; width:220px;">
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <h2 style="color: #1D76BC; margin: 0 0 24px; font-size: 20px; font-weight: 500;">Dear
                                    ${userData.firstName},
                                </h2>

                                <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 8px;">
                                    Thank you for registering with <strong>Ingram Micro Surface</strong>. Your registration has been received and is currently under review by our Program Manager.
                                </p>
                                <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 32px;">
                                    We will notify you once your account has been approved.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:30px; color:#333;">

                                <!-- Registration Details -->
                                <div
                                    style="background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 8px; margin: 32px 0; padding: 24px;">
                                    <h3
                                        style="color: #1D76BC; margin: 0 0 20px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                                        REGISTRATION DETAILS</h3>

                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px;">
                                                Full Name:</td>
                                            <td style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px;">
                                                ${userData.firstName} ${userData.lastName}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td
                                                style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
                                                Email:</td>
                                            <td
                                                style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
                                                ${userData.email}</td>
                                        </tr>
                                        <tr>
                                            <td
                                                style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
                                                Reseller:</td>
                                            <td
                                                style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
                                                ${userData.reseller}</td>
                                        </tr>
                                        <tr>
                                            <td
                                                style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
                                                Registered:</td>
                                            <td
                                                style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
                                                ${userData.registrationDate}</td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- Note -->
                                <div style="background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
                                    <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                                        <span style="font-weight: 600;">Note:</span> You will receive another email once your account has been approved. For questions or updates, please contact our support team.
                                    </p>
                                </div>

                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
            `,
    }),

    checkoutEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,
        products,
        totalQuantity,
        subtotal,
        shipping,
        tax,
        total,
        salesExecutive,
        salesExecutiveEmail,
        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,
        deviceUnits,
        budgetPerDevice,
        revenue,
        ingramAccount,
        segment,
        note,
        quoteNumber,
        competitiveOpportunity,
        estimatedCloseDate,
        wants5gSim,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;
        products: Array<{
            name: string;
            quantity: number;
        }>;
        totalQuantity: number;
        subtotal: number;
        shipping: number;
        tax: number;
        total: number;
        salesExecutive: string;
        salesExecutiveEmail: string;
        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;
        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        ingramAccount: string;
        segment: string;
        note: string;
        quoteNumber: string;
        competitiveOpportunity: string;
        estimatedCloseDate: string;
        wants5gSim: string;
    }) => {

    const productRows = products.map(product => `
    <tr>
    <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
    <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
    </tr>
    `).join('');

    return {
    subject: `New Order #${orderNumber} | Ingram Micro Surface SURFACE`,

    text: `New Ingram Micro Surface Order (#${orderNumber})
    Placed On ${formatEmailDate(orderDate)}

    Hello ${customerName},

    Thank you for your order from ingrammicro-surface.com.
    Once your order is approved, you will receive a confirmation email,
    after which it will be shipped to your customer.

    ORDER ITEMS
    ${products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n')}
    Total Items: ${totalQuantity}

    TEAM DETAILS
    Sales Executive: ${salesExecutive}
    Sales Executive Email: ${salesExecutiveEmail}

    SHIPPING DETAILS
    Company Name: ${companyName}
    Contact Name: ${contactName}
    Email Address: ${contactEmail}
    Shipping Address: ${shippingAddress}
    City: ${city}
    State: ${state}
    Zip: ${zip}
    Desired Demo Delivery Date: ${deliveryDate}

    OPPORTUNITY DETAILS
    Device Opportunity Size (Units): ${deviceUnits}
    Budget Per Device ($): ${budgetPerDevice}
    Revenue Opportunity Size ($): ${revenue}
    INGRAM Account #: ${ingramAccount}

    Quote #: ${quoteNumber}
    Competitive Opportunity: ${competitiveOpportunity}
    Estimated Close Date: ${formatEmailDate(estimatedCloseDate)}
    5G SIM Required: ${wants5gSim || "No"}

    Segment: ${segment}

    NOTE
    ${note}

    If you have any questions, please contact us at support@ingrammicro-surface.com.

    Best regards,
    The Ingram Micro Surface Team`,

    html: `
    <div style="font-family: 'Inter', sans-serif; background-color:#f4f6f8; padding:30px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
    <td align="center">
    <table width="720" cellpadding="0" cellspacing="0"
    style="background:#ffffff; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.04); border: 1px solid black;">

    <tr>
    <td style="background:#1D76BC; padding:32px 30px; text-align:center;">
    <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:500; letter-spacing:-0.2px;">
    <b>New Order #${orderNumber} | Ingram Micro Surface</b>
    </h1>
    </td>
    </tr>

    <tr>
    <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png"
    style="max-width:400px; width:220px;">
    </td>
    </tr>

    <tr>
    <td style="padding:32px 30px; color:#1e293b;">
    <p style="margin:0 0 4px; font-size:16px;"><strong>New Order (#${orderNumber})</strong></p>
    <p style="color:#475569; margin:0 0 24px; font-size:14px;">Placed On
    ${formatEmailDate(orderDate)}</p>

    <p style="font-size:15px; line-height:1.6; color:#334155; margin:0;">
    Hello <strong style="color:#1D76BC;">${customerName}</strong>,<br>
    Thank you for your order from <strong>ingrammicro-surface.com</strong>.
    Once your order is approved, you will receive a confirmation email after which
    it will be shipped to your customer.
    </p>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

    <tr style="background: #1D76BC; color:#ffffff;">
    <td style="padding:10px 16px; border:1px solid #e2e8f0; font-weight:600;">Product</td>
    <td style="padding:10px 16px; border:1px solid #e2e8f0; text-align:center;">Quantity</td>
    </tr>

    ${productRows}

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <td colspan="2"
    style="background:#1D76BC; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
    Team Details
    </td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600;">
    Sales Executive</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${salesExecutive}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Sales Executive Email</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${salesExecutiveEmail}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

    <tr>
    <td colspan="2"
    style="background:#1D76BC; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
    Shipping Details
    </td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Company Name</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${companyName}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Contact Name</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${contactName}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Email Address</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${contactEmail}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Shipping Address</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${shippingAddress}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    City</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${city}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    State</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${state}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Zip</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${zip}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Desired Demo Delivery Date</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${formatEmailDate(deliveryDate)}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

    <tr>
    <td colspan="2"
    style="background:#1D76BC; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
    Opportunity Details
    </td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Device Opportunity Size (Units)</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${deviceUnits}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Budget Per Device ($)</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${budgetPerDevice}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Revenue Opportunity Size ($)</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${revenue}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    INGRAM Account #</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${ingramAccount}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Quote #</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${quoteNumber}
    </td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Competitive Opportunity</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${competitiveOpportunity}
    </td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Estimated Close Date</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${formatEmailDate(estimatedCloseDate)}
    </td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    5G SIM Required</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${wants5gSim || "No"}
    </td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Segment</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${segment}
    </td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <td style="background:#1D76BC; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
    Note
    </td>
    </tr>

    <tr>
    <td style="padding:16px; border:1px solid #e2e8f0; color:#475569; background:#f8fafb;">
    ${note}
    </td>
    </tr>

    </table>
    </td>
    </tr>

    </table>
    </td>
    </tr>
    </table>
    </div>
    `
    }
    },

    newOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,
        products,

        salesExecutive,
        salesExecutiveEmail,

        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,

        deviceUnits,
        budgetPerDevice,
        revenue,
        ingramAccount,
        segment,

        note,

        quoteNumber,
        competitiveOpportunity,
        estimatedCloseDate,
        wants5gSim,

    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        products: Array<{
            name: string;
            quantity: number;
        }>;

        salesExecutive: string;
        salesExecutiveEmail: string;

        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;

        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        ingramAccount: string;
        segment: string;

        note: string;

        quoteNumber: string;
        competitiveOpportunity: string;
        estimatedCloseDate: string;
        wants5gSim: string;

    }) => {

        const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);

        const productRows = products.map(product => `
            <tr>
                <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
                <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
            </tr>
        `).join('');

        const productListText = products.map(p => `Product: ${p.name}, Quantity: ${p.quantity}`).join('\n');

        return {
            subject: `New Order #${orderNumber} | Ingram Micro Surface SURFACE`,

            text: `New Ingram Micro Surface Order (#${orderNumber})
    Placed On ${formatEmailDate(orderDate)}

    Hello Team Ingram Micro Surface,

    You have received a new order from ingrammicro-surface.com. Please click on the link below to Review and Approve/Reject.

    ORDER ITEMS (${totalQuantity} items)
    ${productListText}

    TEAM DETAILS
    Sales Executive: ${salesExecutive}
    Sales Executive Email: ${salesExecutiveEmail}

    SHIPPING DETAILS
    Company Name: ${companyName}
    Contact Name: ${contactName}
    Email Address: ${contactEmail}
    Shipping Address: ${shippingAddress}
    City: ${city}
    State: ${state}
    Zip: ${zip}
    Desired Demo Delivery Date: ${deliveryDate}

    OPPORTUNITY DETAILS
    Device Opportunity Size (Units): ${deviceUnits}
    Budget Per Device ($): ${budgetPerDevice}
    Revenue Opportunity Size ($): ${revenue}
    INGRAM Account #: ${ingramAccount}

    Quote #: ${quoteNumber}
    Competitive Opportunity: ${competitiveOpportunity}
    Estimated Close Date: ${formatEmailDate(estimatedCloseDate)}
    5G SIM Required: ${wants5gSim || "No"}

    Segment: ${segment}

    NOTE
    ${note}

    If you have any questions, please contact us at support@ingrammicro-surface.com.

    Best regards,
    The Ingram Micro Surface Team`,

                html: `
    <div style="font-family: 'Inter', sans-serif;  background-color:#ffffff; padding:30px 0; ">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
    <td align="center">

    <table width="720" cellpadding="0" cellspacing="0"
    style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

    <tr>
    <td style="background:#1D76BC; padding:30px; text-align:center;">
    <h1 style="color:#ffffff; margin:0; font-size:26px;">
    New Order #${orderNumber} | Ingram Micro Surface SURFACE
    </h1>
    </td>
    </tr>

    <tr>
    <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png"
    style="max-width:400px; width:220px;" />
    </td>
    </tr>

    <tr>
    <td style="padding:30px; color:#333;">
    <p style="margin:0 0 8px;"><strong>New Ingram Micro Surface Order (#${orderNumber})</strong></p>
    <p style="color:#666; margin:0 0 20px;">Placed On ${formatEmailDate(orderDate)}</p>

    <p style="line-height:1.6;">
    <strong>Hello Ingram Micro Surface Team,</strong><br />
    You have received a new order from <strong>ingrammicro-surface.com</strong>.
    Please click on the link below to Review and Approve/Reject.
    </p>
    </td>
    </tr>

    <tr>
    <td style="padding: 30px;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/step1.png"
    style="width:100%; max-width:720px;" width="720" />
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <div style="text-align:center; margin:30px 0;">
    <a href="https://ingrammicro-surface-final.vercel.app/order-details/${orderNumber}"
    style="background:#1D76BC;color:#ffffff;padding:14px 34px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
    View Order
    </a>
    </div>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr style="background:#1D76BC; color:#ffffff;">
    <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
    <th style="padding:10px; border:1px solid #ddd; text-align:center; width:100px;">Quantity</th>
    </tr>
    ${productRows}
    </table>
    </td>
    </tr>
    <tr>
    <td style="padding:0 30px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <td colspan="2"
    style="background:#1D76BC; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
    Team Details
    </td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600;">
    Sales Executive</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${salesExecutive}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Sales Executive Email</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${salesExecutiveEmail}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

    <tr>
    <td colspan="2"
    style="background:#1D76BC; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
    Shipping Details
    </td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Company Name</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${companyName}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Contact Name</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${contactName}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Email Address</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${contactEmail}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Shipping Address</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${shippingAddress}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    City</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${city}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    State</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${state}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Zip</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${zip}</td>
    </tr>

    <tr>
    <td style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; font-weight:600;">
    Desired Demo Delivery Date</td>
    <td style="padding:12px 16px; border:1px solid #e2e8f0;">
    ${formatEmailDate(deliveryDate)}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#ffffff;padding:12px;text-align:left;">
    Opportunity Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Device Opportunity Size (Units)</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${deviceUnits}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Budget Per Device ($)</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${budgetPerDevice}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Revenue Opportunity Size ($)</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${revenue}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>INGRAM Account #</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${ingramAccount}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Quote #</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${quoteNumber}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Competitive Opportunity</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${competitiveOpportunity}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Estimated Close Date</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(estimatedCloseDate)}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>5G SIM Required</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${wants5gSim || "No"}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Segment</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${segment}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th style="background:#1D76BC;color:#ffffff;padding:12px;text-align:left;">
    Note
    </th>
    </tr>

    <tr>
    <td style="padding:12px;border:1px solid #ddd;color:#555;">
    ${note}
    </td>
    </tr>

    </table>
    </td>
    </tr>

    </table>
    </td>
    </tr>
    </table>
    </div>
    `
    };
    },

    approvedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        products,
        totalQuantity,

        salesExecutive,
        salesExecutiveEmail,

        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,

        deviceUnits,
        budgetPerDevice,
        revenue,
        ingramAccount,
        segment,

        note,

        quoteNumber,
        competitiveOpportunity,
        estimatedCloseDate,
        wants5gSim,

    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        products: Array<{
            name: string;
            quantity: number;
        }>;
        totalQuantity: number;

        salesExecutive: string;
        salesExecutiveEmail: string;

        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;

        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        ingramAccount: string;
        segment: string;

        note: string;

        quoteNumber: string;
        competitiveOpportunity: string;
        estimatedCloseDate: string;
        wants5gSim: string;

    }) => {

    const productRows = products.map(product => `
    <tr>
    <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
    <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
    </tr>
    `).join('');

    const productListText = products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n');

    return {

    subject: `Order Approved #${orderNumber} | Ingram Micro Surface SURFACE`,

    text: `Approved Ingram Micro Surface Order (#${orderNumber})
    Placed On ${formatEmailDate(orderDate)}

    Hello,

    Your order placed on ingrammicro-surface.com has been approved.

    Once your package ships, you will receive a separate email containing
    shipping details, tracking information, and a prepaid return label.

    ORDER ITEMS (${totalQuantity} items)
    ${productListText}

    TEAM DETAILS
    Sales Executive: ${salesExecutive}
    Sales Executive Email: ${salesExecutiveEmail}

    SHIPPING DETAILS
    Company Name: ${companyName}
    Contact Name: ${contactName}
    Email Address: ${contactEmail}
    Shipping Address: ${shippingAddress}
    City: ${city}
    State: ${state}
    Zip: ${zip}
    Desired Demo Delivery Date: ${deliveryDate}

    OPPORTUNITY DETAILS
    Device Opportunity Size (Units): ${deviceUnits}
    Budget Per Device ($): ${budgetPerDevice}
    Revenue Opportunity Size ($): ${revenue}
    INGRAM Account #: ${ingramAccount}

    Quote #: ${quoteNumber}
    Competitive Opportunity: ${competitiveOpportunity}
    Estimated Close Date: ${formatEmailDate(estimatedCloseDate)}
    5G SIM Required: ${wants5gSim || "No"}

    Segment: ${segment}

    NOTE
    ${note}

    If you have any questions, please contact us at support@ingrammicro-surface.com.

    Best regards,
    The Ingram Micro Surface Team`,

    html: `
    <div style="font-family: 'Inter', sans-serif; background-color:#ffffff; padding:30px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
    <td align="center">

    <table width="720" cellpadding="0" cellspacing="0"
    style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

    <tr>
    <td style="background:#1D76BC; padding:32px 30px; text-align:center;">
    <h1 style="color:#ffffff; margin:0; font-size:26px;">
    Order Approved #${orderNumber} | Ingram Micro Surface
    </h1>
    </td>
    </tr>

    <tr>
    <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png"
    style="max-width:400px; width:220px;" />
    </td>
    </tr>

    <tr>
    <td style="padding:30px; color:#333;">
    <p style="margin:0 0 8px; font-size: 15px;"><strong>Approved Order (#${orderNumber})</strong></p>
    <p style="color:#666; margin:0 0 20px; font-size:15px;">Placed On ${formatEmailDate(orderDate)}</p>

    <p style="font-size:15px; line-height:1.6;">
    Your order on ingrammicro-surface.com has been approved. Once your package ships, you
    will receive a shipping email with tracking information and a prepaid Return Label
    for your order.
    </p>

    <p>
    If you have any questions please contact us at support@ingrammicro-surface.com.
    </p>
    </td>
    </tr>

    <tr>
    <td style="padding: 30px;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/step2.png"
    style="width:100%; max-width:720px;" width="720" />
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr style="background:#1D76BC; color:#ffffff;">
    <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
    <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity</th>
    </tr>
    ${productRows}
    </table>
    </td>
    </tr>

    <!-- TEAM DETAILS -->

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th colspan="2"
    style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
    Team Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
    <strong>Sales Executive</strong>
    </td>
    <td style="padding:10px; border:1px solid #ddd;">
    ${salesExecutive}
    </td>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
    <strong>Sales Executive Email</strong>
    </td>
    <td style="padding:10px; border:1px solid #ddd;">
    ${salesExecutiveEmail}
    </td>
    </tr>

    </table>
    </td>
    </tr>

    <!-- SHIPPING DETAILS -->

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th colspan="2"
    style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
    Shipping Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Company Name</strong></td>
    <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Contact Name</strong></td>
    <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Email Address</strong></td>
    <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Shipping Address</strong></td>
    <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>City</strong></td>
    <td style="padding:10px; border:1px solid #ddd;">${city}</td>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>State</strong></td>
    <td style="padding:10px; border:1px solid #ddd;">${state}</td>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Zip</strong></td>
    <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
    </tr>

    <tr>
    <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Desired Demo Delivery Date</strong></td>
    <td style="padding:10px; border:1px solid #ddd;">${formatEmailDate(deliveryDate)}</td>
    </tr>

    </table>
    </td>
    </tr>

    <!-- OPPORTUNITY DETAILS -->

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th colspan="2"
    style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
    Opportunity Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Device Opportunity Size (Units)</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${deviceUnits}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Budget Per Device ($)</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${budgetPerDevice}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Revenue Opportunity Size ($)</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${revenue}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>INGRAM Account #</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${ingramAccount}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Quote #</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${quoteNumber}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Competitive Opportunity</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${competitiveOpportunity}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Estimated Close Date</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(estimatedCloseDate)}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>5G SIM Required</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${wants5gSim || "No"}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Segment</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${segment}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
    Note
    </th>
    </tr>

    <tr>
    <td style="padding:12px; border:1px solid #ddd; color:#555;">
    ${note}
    </td>
    </tr>
    </table>
    </td>
    </tr>

    </table>
    </td>
    </tr>
    </table>
    </div>
    `
    };
    },

    rejectedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        products,
        totalQuantity,

        salesExecutive,
        salesExecutiveEmail,

        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,

        deviceUnits,
        budgetPerDevice,
        revenue,
        ingramAccount,
        segment,

        note,

        quoteNumber,
        competitiveOpportunity,
        estimatedCloseDate,
        wants5gSim,

    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        products: Array<{
            name: string;
            quantity: number;
        }>;
        totalQuantity: number;

        salesExecutive: string;
        salesExecutiveEmail: string;

        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;

        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        ingramAccount: string;
        segment: string;

        note: string;

        quoteNumber: string;
        competitiveOpportunity: string;
        estimatedCloseDate: string;
        wants5gSim: string;

    }) => {

    const productRows = products.map(product => `
    <tr>
    <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
    <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
    </tr>
    `).join('');

    const productListText = products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n');

    return {

    subject: `Rejected Order #${orderNumber} | Ingram Micro Surface`,

    text: `Rejected Ingram Micro Surface Order (#${orderNumber})
    Placed On ${formatEmailDate(orderDate)}

    Hello,

    Your order placed on ingrammicro-surface.com has been rejected.

    ORDER ITEMS (${totalQuantity} items)
    ${productListText}

    TEAM DETAILS
    Sales Executive: ${salesExecutive}
    Sales Executive Email: ${salesExecutiveEmail}

    SHIPPING DETAILS
    Company Name: ${companyName}
    Contact Name: ${contactName}
    Email Address: ${contactEmail}
    Shipping Address: ${shippingAddress}
    City: ${city}
    State: ${state}
    Zip: ${zip}
    Desired Demo Delivery Date: ${deliveryDate}

    OPPORTUNITY DETAILS
    Device Opportunity Size (Units): ${deviceUnits}
    Budget Per Device ($): ${budgetPerDevice}
    Revenue Opportunity Size ($): ${revenue}
    INGRAM Account #: ${ingramAccount}

    Quote #: ${quoteNumber}
    Competitive Opportunity: ${competitiveOpportunity}
    Estimated Close Date: ${formatEmailDate(estimatedCloseDate)}
    5G SIM Required: ${wants5gSim || "No"}

    Segment: ${segment}

    NOTE
    ${note}

    If you have any questions, please contact us at support@ingrammicro-surface.com.

    Best regards,
    The Ingram Micro Surface Team`,

    html: `
    <div style="font-family: 'Inter', sans-serif; background-color:#ffffff; padding:30px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
    <td align="center">

    <table width="720" cellpadding="0" cellspacing="0"
    style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

    <tr>
    <td style="background:#1D76BC; padding:30px; text-align:center;">
    <h1 style="color:#ffffff; margin:0; font-size:26px;">
    Order Rejected #${orderNumber} | Ingram Micro Surface
    </h1>
    </td>
    </tr>

    <tr>
    <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png"
    style="max-width:400px; width:220px;" />
    </td>
    </tr>

    <tr>
    <td style="padding:30px; color:#333;">
    <p style="margin:0 0 8px; font-size:15px;"><strong>Rejected Order (#${orderNumber})</strong></p>
    <p style="color:#666; margin:0 0 20px; font-size:15px;">Placed On ${formatEmailDate(orderDate)}</p>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr style="background:#1D76BC; color:#ffffff;">
    <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
    <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity</th>
    </tr>
    ${productRows}
    </table>
    </td>
    </tr>

    <!-- TEAM DETAILS -->

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
    Team Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>Sales Executive</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${salesExecutive}
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>Sales Executive Email</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${salesExecutiveEmail}
    </td>
    </tr>

    </table>
    </td>
    </tr>

    <!-- SHIPPING DETAILS -->

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
    Shipping Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>Company Name</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${companyName}
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>Contact Name</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${contactName}
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>Email Address</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${contactEmail}
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>Shipping Address</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${shippingAddress}
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>City</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${city}
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>State</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${state}
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>Zip</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${zip}
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;">
    <strong>Desired Demo Delivery Date</strong>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${formatEmailDate(deliveryDate)}
    </td>
    </tr>

    </table>
    </td>
    </tr>

    <!-- OPPORTUNITY DETAILS -->

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
    Opportunity Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Device Opportunity Size (Units)</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${deviceUnits}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Budget Per Device ($)</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${budgetPerDevice}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Revenue Opportunity Size ($)</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${revenue}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>INGRAM Account #</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${ingramAccount}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Quote #</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${quoteNumber}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Competitive Opportunity</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${competitiveOpportunity}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Estimated Close Date</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(estimatedCloseDate)}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>5G SIM Required</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${wants5gSim || "No"}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;width:220px;background:#f8fafb;"><strong>Segment</strong></td>
    <td style="padding:10px;border:1px solid #ddd;">${segment}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
    <th style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
    Note
    </th>
    </tr>

    <tr>
    <td style="padding:12px; border:1px solid #ddd; color:#555;">
    ${note}
    </td>
    </tr>

    </table>
    </td>
    </tr>

    </table>

    </td>
    </tr>
    </table>
    </div>
    `

    };

    },

    returnedOrderEmail: ({
    orderNumber,
    orderDate,
    customerName,
    customerEmail,

    products,
    totalQuantity,
    totalReturned,
    totalLeft,

    salesExecutive,
    salesExecutiveEmail,

    companyName,
    contactName,
    contactEmail,
    shippingAddress,
    city,
    state,
    zip,
    deliveryDate,

    deviceUnits,
    budgetPerDevice,
    revenue,
    ingramAccount,
    segment,

    note,

    quoteNumber,
    competitiveOpportunity,
    estimatedCloseDate,
    wants5gSim,

    }: {
    orderNumber: string | number;
    orderDate: string;
    customerName: string;
    customerEmail: string;

    products: Array<{
    name: string;
    shippedQuantity: number;
    returnedQuantity: number;
    leftWithCustomer: number;
    }>;

    totalQuantity: number;
    totalReturned: number;
    totalLeft: number;

    salesExecutive: string;
    salesExecutiveEmail: string;

    companyName: string;
    contactName: string;
    contactEmail: string;
    shippingAddress: string;
    city: string;
    state: string;
    zip: string;
    deliveryDate: string;

    deviceUnits: number | string;
    budgetPerDevice: number | string;
    revenue: number | string;
    ingramAccount: string;
    segment: string;

    note: string;

    quoteNumber: string;
    competitiveOpportunity: string;
    estimatedCloseDate: string;
    wants5gSim: string;

    }) => {

    const productRows = products.map(product => {

    const returnedText = product.returnedQuantity > 0
    ? `<span>${product.returnedQuantity}</span>`
    : `<span>0</span>`;

    const leftText = product.leftWithCustomer > 0
    ? `<span>${product.leftWithCustomer}</span>`
    : `<span>0</span>`;

    return `
    <tr>
    <td style="padding:12px;border:1px solid #ddd;font-size:14px;">
    ${product.name}
    </td>

    <td style="padding:12px;border:1px solid #ddd;">
    <table width="100%">
    <tr>
    <td style="font-size:13px;text-align:center;">
    ${returnedText} <del style="color:red;">${leftText}</del>
    </td>
    </tr>
    </table>
    </td>
    </tr>
    `;
    }).join('');

    const productListText = products.map(p => {
    const returnedText = p.returnedQuantity > 0
    ? ` (${p.returnedQuantity} returned, ${p.leftWithCustomer} left)`
    : '';
    return `- ${p.name}: Shipped ${p.shippedQuantity}${returnedText}`;
    }).join('\n');

    return {

    subject:`Order Returned #${orderNumber} | Ingram Micro Surface`,

    text:`Returned Ingram Micro Surface Order (#${orderNumber})
    Placed On ${orderDate}

    Hello ${customerName},

    Your order placed on ingrammicro-surface.com has been returned.

    ORDER ITEMS (${totalQuantity} items shipped, ${totalReturned} returned)
    ${productListText}

    SUMMARY
    Total Shipped: ${totalQuantity}
    Total Returned: ${totalReturned}
    Still With Customer: ${totalLeft}

    TEAM DETAILS
    Sales Executive: ${salesExecutive}
    Sales Executive Email: ${salesExecutiveEmail}

    SHIPPING DETAILS
    Company Name: ${companyName}
    Contact Name: ${contactName}
    Email Address: ${contactEmail}
    Shipping Address: ${shippingAddress}
    City: ${city}
    State: ${state}
    Zip: ${zip}
    Desired Demo Delivery Date: ${deliveryDate}

    OPPORTUNITY DETAILS
    Device Opportunity Size (Units): ${deviceUnits}
    Budget Per Device ($): ${budgetPerDevice}
    Revenue Opportunity Size ($): ${revenue}
    INGRAM Account #: ${ingramAccount}

    Quote #: ${quoteNumber}
    Competitive Opportunity: ${competitiveOpportunity}
    Estimated Close Date: ${estimatedCloseDate}
    5G SIM Required: ${wants5gSim || "No"}

    Segment: ${segment}

    NOTE
    ${note}

    Best regards,
    The Ingram Micro Surface Team`,

    html:`
    <div style="font-family:'Inter',sans-serif;background:#fff;padding:30px 0;">
    <table width="100%">
    <tr>
    <td align="center">

    <table width="720" style="background:#fff;border-radius:10px;border:1px solid black;">

    <tr>
    <td style="background:#1D76BC;padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;">Order Returned #${orderNumber}</h1>
    </td>
    </tr>

    <tr>
    <td style="padding:24px 30px;text-align:center;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png"
    style="width:220px;">
    </td>
    </tr>

    <tr>
    <td style="padding:30px;">
    <p><strong>Returned Order (#${orderNumber})</strong></p>
    <p>Placed On ${formatEmailDate(orderDate)}</p>
    <p>Hello ${customerName}</p>
    <p>Your order has been partially returned.</p>
    </td>
    </tr>

    <tr>
    <td style="padding:20px 30px;">
    <table width="100%" style="border-collapse:collapse;border:1px solid #ddd;">
    <tr style="background:#1D76BC;color:#fff;">
    <th style="padding:12px;border:1px solid #ddd;text-align:left;">Product</th>
    <th style="padding:12px;border:1px solid #ddd;text-align:center;">Quantity</th>
    </tr>
    ${productRows}
    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:20px 30px;">
    <table width="100%" style="border-collapse:collapse;border:1px solid #ddd;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#fff;padding:12px;text-align:left;">
    Team Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Sales Executive</td>
    <td style="padding:10px;border:1px solid #ddd;">${salesExecutive}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Sales Executive Email</td>
    <td style="padding:10px;border:1px solid #ddd;">${salesExecutiveEmail}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:20px 30px;">
    <table width="100%" style="border-collapse:collapse;border:1px solid #ddd;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#fff;padding:12px;text-align:left;">
    Shipping Details
    </th>
    </tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Company Name</td><td style="padding:10px;border:1px solid #ddd;">${companyName}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Contact Name</td><td style="padding:10px;border:1px solid #ddd;">${contactName}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Email Address</td><td style="padding:10px;border:1px solid #ddd;">${contactEmail}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Shipping Address</td><td style="padding:10px;border:1px solid #ddd;">${shippingAddress}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">City</td><td style="padding:10px;border:1px solid #ddd;">${city}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">State</td><td style="padding:10px;border:1px solid #ddd;">${state}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Zip</td><td style="padding:10px;border:1px solid #ddd;">${zip}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Desired Demo Delivery Date</td><td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(deliveryDate)}</td></tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#fff;padding:12px;text-align:left;">
    Opportunity Details
    </th>
    </tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Device Opportunity Size</td><td style="padding:10px;border:1px solid #ddd;">${deviceUnits}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Budget Per Device</td><td style="padding:10px;border:1px solid #ddd;">${budgetPerDevice}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Revenue Opportunity Size</td><td style="padding:10px;border:1px solid #ddd;">${revenue}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">INGRAM Account #</td><td style="padding:10px;border:1px solid #ddd;">${ingramAccount}</td></tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Quote #</td><td style="padding:10px;border:1px solid #ddd;">${quoteNumber}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Competitive Opportunity</td><td style="padding:10px;border:1px solid #ddd;">${competitiveOpportunity}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Estimated Close Date</td><td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(estimatedCloseDate)}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">5G SIM Required</td><td style="padding:10px;border:1px solid #ddd;">${wants5gSim || "No"}</td></tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Segment</td><td style="padding:10px;border:1px solid #ddd;">${segment}</td></tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%">
    <tr>
    <th style="background:#1D76BC;color:#fff;padding:12px;text-align:left;">Note</th>
    </tr>
    <tr>
    <td style="padding:12px;border:1px solid #ddd;">${note}</td>
    </tr>
    </table>
    </td>
    </tr>

    </table>

    </td>
    </tr>
    </table>
    </div>
    `

    };
    },

    shippedOrderEmail: ({
    orderNumber,
    orderDate,
    customerName,
    customerEmail,

    products,
    totalQuantity,

    returnTracking,
    orderTracking,
    fileLink,
    caseType,
    returnTrackingLink,
    orderTrackingLink,

    salesExecutive,
    salesExecutiveEmail,

    companyName,
    contactName,
    contactEmail,
    shippingAddress,
    city,
    state,
    zip,
    deliveryDate,

    deviceUnits,
    budgetPerDevice,
    revenue,
    ingramAccount,
    segment,

    note,

    quoteNumber,
    competitiveOpportunity,
    estimatedCloseDate,
    wants5gSim,

    }: {
    orderNumber: string | number;
    orderDate: string;
    customerName: string;
    customerEmail: string;

    products: Array<{
    name: string;
    quantity: number;
    }>;

    totalQuantity: number;

    returnTracking: string;
    orderTracking: string;
    fileLink: string;
    caseType: string;
    orderTrackingLink: string;
    returnTrackingLink: string;

    salesExecutive: string;
    salesExecutiveEmail: string;

    companyName: string;
    contactName: string;
    contactEmail: string;
    shippingAddress: string;
    city: string;
    state: string;
    zip: string;
    deliveryDate: string;

    deviceUnits: number | string;
    budgetPerDevice: number | string;
    revenue: number | string;
    ingramAccount: string;
    segment: string;

    note: string;

    quoteNumber: string;
    competitiveOpportunity: string;
    estimatedCloseDate: string;
    wants5gSim: string;

    }) => {

    const productRows = products.map(product => `
    <tr>
    <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
    <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
    </tr>
    `).join('');

    const productListText = products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n');

    return {

    subject: `Order Shipped #${orderNumber} | Ingram Micro Surface`,

    text:`Shipped Ingram Micro Surface Order (#${orderNumber})
    Placed On ${formatEmailDate(orderDate)}

    Hello,

    Your order placed on ingrammicro-surface.com has been shipped.

    ORDER ITEMS (${totalQuantity} items)
    ${productListText}

    TEAM DETAILS
    Sales Executive: ${salesExecutive}
    Sales Executive Email: ${salesExecutiveEmail}

    SHIPPING DETAILS
    Company Name: ${companyName}
    Contact Name: ${contactName}
    Email Address: ${contactEmail}
    Shipping Address: ${shippingAddress}
    City: ${city}
    State: ${state}
    Zip: ${zip}
    Desired Demo Delivery Date: ${deliveryDate}

    OPPORTUNITY DETAILS
    Device Opportunity Size (Units): ${deviceUnits}
    Budget Per Device ($): ${budgetPerDevice}
    Revenue Opportunity Size ($): ${revenue}
    INGRAM Account #: ${ingramAccount}

    Quote #: ${quoteNumber}
    Competitive Opportunity: ${competitiveOpportunity}
    Estimated Close Date: ${formatEmailDate(estimatedCloseDate)}
    5G SIM Required: ${wants5gSim || "No"}

    Segment: ${segment}

    NOTE
    ${note}

    If you have any questions, please contact us at support@ingrammicro-surface.com.

    Best regards,
    The Ingram Micro Surface Team`,

    html:`
    <div style="font-family: 'Inter', sans-serif; background-color:#ffffff; padding:30px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
    <td align="center">

    <table width="720" cellpadding="0" cellspacing="0"
    style="background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid black;">

    <tr>
    <td style="background:#1D76BC; padding:30px; text-align:center;">
    <h1 style="color:#ffffff; margin:0; font-size:26px;">
    Order Shipped #${orderNumber} | Ingram Micro Surface
    </h1>
    </td>
    </tr>

    <tr>
    <td style="padding:24px 30px 0px 30px; text-align:center;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png"
    style="max-width:400px; width:220px;" />
    </td>
    </tr>

    <tr>
    <td style="padding:30px 30px 0 30px;">
    <p style="margin:0 0 8px;"><strong>Shipped Order (#${orderNumber})</strong></p>
    <p style="color:#666;">Placed On ${formatEmailDate(orderDate)}</p>
    <p><strong>Hello, ${customerName}</strong></p>
    <p>Your order on Ingram Micro Surface has been shipped.</p>
    </td>
    </tr>

    <tr>
    <td style="padding:30px;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/step3.png"
    style="width:100%; max-width:720px;" />
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#fff;padding:12px;text-align:left;">
    Tracking Information
    </th>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">
    Order Tracking #
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    <a href=${orderTrackingLink}>${orderTracking}</a>
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">
    Return Tracking #
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    <a href=${returnTrackingLink}>${returnTracking}</a>
    </td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">
    Case Type
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
    ${caseType}
    </td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="text-align:center;padding:10px 30px 30px;">
    <a href=${fileLink} style="background:#1D76BC;color:#fff;padding:14px 34px;border-radius:6px;text-decoration:none;font-weight:600;">
    View Return Label
    </a>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr style="background:#1D76BC;color:#fff;">
    <th style="padding:10px;border:1px solid #ddd;text-align:left;">Product</th>
    <th style="padding:10px;border:1px solid #ddd;text-align:center;">Quantity</th>
    </tr>
    ${productRows}
    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#fff;padding:12px;text-align:left;">
    Team Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Sales Executive</td>
    <td style="padding:10px;border:1px solid #ddd;">${salesExecutive}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Sales Executive Email</td>
    <td style="padding:10px;border:1px solid #ddd;">${salesExecutiveEmail}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#fff;padding:12px;text-align:left;">
    Shipping Details
    </th>
    </tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Company Name</td><td style="padding:10px;border:1px solid #ddd;">${companyName}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Contact Name</td><td style="padding:10px;border:1px solid #ddd;">${contactName}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Email Address</td><td style="padding:10px;border:1px solid #ddd;">${contactEmail}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Shipping Address</td><td style="padding:10px;border:1px solid #ddd;">${shippingAddress}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">City</td><td style="padding:10px;border:1px solid #ddd;">${city}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">State</td><td style="padding:10px;border:1px solid #ddd;">${state}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Zip</td><td style="padding:10px;border:1px solid #ddd;">${zip}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Desired Demo Delivery Date</td><td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(deliveryDate)}</td></tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#fff;padding:12px;text-align:left;">
    Opportunity Details
    </th>
    </tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Device Opportunity Size</td><td style="padding:10px;border:1px solid #ddd;">${deviceUnits}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Budget Per Device</td><td style="padding:10px;border:1px solid #ddd;">${budgetPerDevice}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Revenue Opportunity Size</td><td style="padding:10px;border:1px solid #ddd;">${revenue}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">INGRAM Account</td><td style="padding:10px;border:1px solid #ddd;">${ingramAccount}</td></tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Quote #</td><td style="padding:10px;border:1px solid #ddd;">${quoteNumber}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Competitive Opportunity</td><td style="padding:10px;border:1px solid #ddd;">${competitiveOpportunity}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Estimated Close Date</td><td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(estimatedCloseDate)}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">5G SIM Required</td><td style="padding:10px;border:1px solid #ddd;">${wants5gSim || "No"}</td></tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Segment</td><td style="padding:10px;border:1px solid #ddd;">${segment}</td></tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%">
    <tr>
    <th style="background:#1D76BC;color:#fff;padding:12px;text-align:left;">
    Note
    </th>
    </tr>
    <tr>
    <td style="padding:12px;border:1px solid #ddd;">
    ${note}
    </td>
    </tr>
    </table>
    </td>
    </tr>

    </table>

    </td>
    </tr>
    </table>
    </div>
    `

    };

    },

    shippedReminderEmail: ({
    orderNumber,
    orderDate,
    customerName,
    customerEmail,
    shippedDate,

    products,
    totalQuantity,

    returnTracking,
    orderTracking,
    fileLink,
    caseType,
    returnTrackingLink,
    orderTrackingLink,

    salesExecutive,
    salesExecutiveEmail,

    companyName,
    contactName,
    contactEmail,
    shippingAddress,
    city,
    state,
    zip,
    deliveryDate,

    deviceUnits,
    budgetPerDevice,
    revenue,
    ingramAccount,
    segment,

    note,

    quoteNumber,
    competitiveOpportunity,
    estimatedCloseDate,
    wants5gSim,

    }: {
    orderNumber: string | number;
    orderDate: string;
    customerName: string;
    customerEmail: string;
    shippedDate: string;

    products: Array<{
    name: string;
    quantity: number;
    }>;

    totalQuantity: number;

    returnTracking: string;
    orderTracking: string;
    fileLink: string;
    caseType: string;
    orderTrackingLink: string;
    returnTrackingLink: string;

    salesExecutive: string;
    salesExecutiveEmail: string;

    companyName: string;
    contactName: string;
    contactEmail: string;
    shippingAddress: string;
    city: string;
    state: string;
    zip: string;
    deliveryDate: string;

    deviceUnits: number | string;
    budgetPerDevice: number | string;
    revenue: number | string;
    ingramAccount: string;
    segment: string;

    note: string;

    quoteNumber: string;
    competitiveOpportunity: string;
    estimatedCloseDate: string;
    wants5gSim: string;

    }) => {

    const productRows = products.map(product => `
    <tr>
    <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
    <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
    </tr>
    `).join('');

    const productListText = products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n');

    return {

    subject: `Order Shipped #${orderNumber} | Ingram Micro Surface`,

    text: `Shipped Ingram Micro Surface Order (#${orderNumber})
    Placed On ${formatEmailDate(orderDate)}

    Hello,

    Your order placed on ingrammicro-surface.com has been shipped.

    ORDER ITEMS (${totalQuantity} items)
    ${productListText}

    TEAM DETAILS
    Sales Executive: ${salesExecutive}
    Sales Executive Email: ${salesExecutiveEmail}

    SHIPPING DETAILS
    Company Name: ${companyName}
    Contact Name: ${contactName}
    Email Address: ${contactEmail}
    Shipping Address: ${shippingAddress}
    City: ${city}
    State: ${state}
    Zip: ${zip}
    Desired Demo Delivery Date: ${deliveryDate}

    OPPORTUNITY DETAILS
    Device Opportunity Size (Units): ${deviceUnits}
    Budget Per Device ($): ${budgetPerDevice}
    Revenue Opportunity Size ($): ${revenue}
    INGRAM Account #: ${ingramAccount}

    Quote #: ${quoteNumber}
    Competitive Opportunity: ${competitiveOpportunity}
    Estimated Close Date: ${formatEmailDate(estimatedCloseDate)}
    5G SIM Required: ${wants5gSim || "No"}

    Segment: ${segment}

    NOTE
    ${note}

    If you have any questions, please contact us at support@ingrammicro-surface.com.

    Best regards,
    The Ingram Micro Surface Team`,

    html:`
    <div style="font-family:'Inter',sans-serif;background-color:#ffffff;padding:30px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
    <td align="center">

    <table width="720" cellpadding="0" cellspacing="0"
    style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid black;">

    <tr>
    <td style="background:#1D76BC;padding:30px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:26px;">
    25-Day Return Reminder – Order #${orderNumber} (${companyName}) | Ingram Micro Surface
    </h1>
    </td>
    </tr>

    <tr>
    <td style="padding:24px 30px 0px 30px;text-align:center;">
    <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png"
    style="max-width:400px;width:220px;" />
    </td>
    </tr>

    <tr>
    <td style="padding:30px 30px 0 30px;color:#333;">
    <p style="margin:0 0 8px;font-size:15px;">
    <strong>25-Day Shipping Reminder – Order #${orderNumber}</strong>
    </p>

    <p style="margin:0 0 8px;font-size:15px;">
    Placed on ${formatEmailDate(orderDate)}
    </p>

    <p style="font-size:15px;line-height:1.6;">
    This is a friendly reminder from the Ingram Micro Surface team that
    <b>Order #${orderNumber}</b> for <b>${companyName}</b>
    has been shipped for <b>25 days</b>.
    </p>

    <p style="font-size:15px;line-height:1.6;">
    As the 45-day trial period is progressing, we kindly ask you to review the order status and begin preparing the return process.
    </p>

    <p style="font-size:15px;line-height:1.6;">
    You may obtain a soft copy of the return label by clicking the button below or by contacting us at
    <a href="mailto:support@ingrammicro-surface.com">support@ingrammicro-surface.com</a>.
    </p>
    </td>
    </tr>

    <tr>
    <td style="text-align:center;margin:30px 0;padding:0;">
    <a href="${fileLink}" style="
    background:#1D76BC;
    color:#ffffff;
    padding:14px 34px;
    text-decoration:none;
    border-radius:6px;
    font-size:16px;
    font-weight:600;
    display:inline-block;
    ">
    View Return Label
    </a>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr style="background:#1D76BC;color:#ffffff;">
    <th style="padding:10px;border:1px solid #ddd;text-align:left;">Product</th>
    <th style="padding:10px;border:1px solid #ddd;text-align:center;">Quantity</th>
    </tr>
    ${productRows}
    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#ffffff;padding:12px;text-align:left;">
    Order Details
    </th>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Sales Executive</td>
    <td style="padding:10px;border:1px solid #ddd;">${salesExecutive}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Sales Executive Email</td>
    <td style="padding:10px;border:1px solid #ddd;">${salesExecutiveEmail}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Customer Company Name</td>
    <td style="padding:10px;border:1px solid #ddd;">${companyName}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Customer Contact Email</td>
    <td style="padding:10px;border:1px solid #ddd;">${contactEmail}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Shipped Date</td>
    <td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(shippedDate)}</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Days Since Shipped</td>
    <td style="padding:10px;border:1px solid #ddd;">25</td>
    </tr>

    <tr>
    <td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Returned Tracking</td>
    <td style="padding:10px;border:1px solid #ddd;">${returnTracking}</td>
    </tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#ffffff;padding:12px;text-align:left;">
    Shipping Details
    </th>
    </tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Company Name</td><td style="padding:10px;border:1px solid #ddd;">${companyName}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Contact Name</td><td style="padding:10px;border:1px solid #ddd;">${contactName}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Email Address</td><td style="padding:10px;border:1px solid #ddd;">${contactEmail}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Shipping Address</td><td style="padding:10px;border:1px solid #ddd;">${shippingAddress}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">City</td><td style="padding:10px;border:1px solid #ddd;">${city}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">State</td><td style="padding:10px;border:1px solid #ddd;">${state}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Zip</td><td style="padding:10px;border:1px solid #ddd;">${zip}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Desired Demo Delivery Date</td><td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(deliveryDate)}</td></tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%" style="border-collapse:collapse;">
    <tr>
    <th colspan="2" style="background:#1D76BC;color:#ffffff;padding:12px;text-align:left;">
    Opportunity Details
    </th>
    </tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Device Opportunity Size</td><td style="padding:10px;border:1px solid #ddd;">${deviceUnits}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Budget Per Device</td><td style="padding:10px;border:1px solid #ddd;">${budgetPerDevice}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Revenue Opportunity Size</td><td style="padding:10px;border:1px solid #ddd;">${revenue}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">INGRAM Account</td><td style="padding:10px;border:1px solid #ddd;">${ingramAccount}</td></tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Quote #</td><td style="padding:10px;border:1px solid #ddd;">${quoteNumber}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Competitive Opportunity</td><td style="padding:10px;border:1px solid #ddd;">${competitiveOpportunity}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Estimated Close Date</td><td style="padding:10px;border:1px solid #ddd;">${formatEmailDate(estimatedCloseDate)}</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">5G SIM Required</td><td style="padding:10px;border:1px solid #ddd;">${wants5gSim || "No"}</td></tr>

    <tr><td style="padding:10px;border:1px solid #ddd;background:#f8fafb;">Segment</td><td style="padding:10px;border:1px solid #ddd;">${segment}</td></tr>

    </table>
    </td>
    </tr>

    <tr>
    <td style="padding:0 30px 30px;">
    <table width="100%">
    <tr>
    <th style="background:#1D76BC;color:#ffffff;padding:12px;text-align:left;">
    Note
    </th>
    </tr>
    <tr>
    <td style="padding:12px;border:1px solid #ddd;">
    ${note}
    </td>
    </tr>
    </table>
    </td>
    </tr>

    </table>

    </td>
    </tr>
    </table>
    </div>
    `

    };

    },

    returnReminderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,
        productName,
        productListText,
        productListHtml,
        totalQuantity,
        returnTracking,
        fileLink,
        salesExecutive,
        salesExecutiveEmail,

        companyName,
        contactEmail,
        shippedDate,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;
        productName: string;
        productListText: string;
        productListHtml: string;
        totalQuantity: number;
        returnTracking: string;
        fileLink: string;
        salesExecutive: string;
        salesExecutiveEmail: string;
        companyName: string;
        contactEmail: string;
        shippedDate: string;
    }) => ({
        subject: `Return Reminder - Order #${orderNumber} (${companyName}) | Ingram Micro Surface`,
        text: `Return Reminder Notification | Ingram Micro Surface

        Return Reminder - Order #${orderNumber} (${companyName}) 
        Placed On: ${formatEmailDate(orderDate)}

        Hello,

        Thank you for using Ingram Micro Surface SURFACE! We hope your experience was very positive.

        Your order for ${companyName} is now due for return. 
        You can view your return label using the link below or request it via email at support@ingrammicro-surface.com:

        View Return Label: ${fileLink}

        ORDER ITEMS
        ${productListText}
        Total Quantity: ${totalQuantity}

        ORDER DETAILS
        Sales Executive: ${salesExecutive}
        Sales Executive Email: ${salesExecutiveEmail}

        Customer Company Name: ${companyName}
        Customer Contact Email: ${contactEmail}
        Shipped Date: ${shippedDate}
        Returned Tracking: ${returnTracking}

        If you have any questions, please contact us at support@ingrammicro-surface.com.

        Best regards,
        The Ingram Micro Surface Team`,
        html:`
        <div style="font-family: 'Inter', sans-serif; background-color:#ffffff; padding:30px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center">

                            <table width="720" cellpadding="0" cellspacing="0"
                                style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                                <!-- HEADER -->
                                <tr>
                                    <td style="background:#1D76BC; padding:30px; text-align:center;">
                                        <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                            Return Reminder Notification Order #${orderNumber} (${companyName}) | Ingram Micro Surface
                                        </h1>
                                    </td>
                                </tr>

                                <!-- LOGO -->
                                <tr>
                                    <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
                                        <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png" alt="Ingram Micro Surface Logo"
                                            style="max-width:400px; width:220px;" />
                                    </td>
                                </tr>

                                <!-- INTRO -->
                                <tr>
                                    <td style="padding:30px 30px 0 30px; color:#333;">
                                        <p style="margin:0 0 8px; font-size:15px;"><strong>Return Reminder Order
                                                #${orderNumber}</strong></p>
                                        <p style="margin:0 0 8px; font-size:15px;">Placed On ${orderDate}</p>
                                        <p style="font-size:15px; line-height:1.6;">
                                            Thank you for using Ingram Micro Surface! We hope your experience was very positive.
                                        </p>
                                        <p>
                                            Your order for ${companyName} is now due for return. You can also
                                            obtain a soft copy of the return label by clicking on the below or sending a request
                                            at support@ingrammicro-surface.com,
                                        </p>
                                    </td>
                                </tr>

                                <!-- RETURN LABEL BUTTON -->
                                <tr>
                                    <td style="padding:0; color:#333;">
                                        <div style="text-align:center; margin:30px 0;">
                                            <a href=${fileLink} style="
                                                background:#1D76BC;
                                                color:#ffffff;
                                                padding:14px 34px;
                                                text-decoration:none;
                                                border-radius:6px;
                                                font-size:16px;
                                                font-weight:600;
                                                display:inline-block;
                                            ">
                                                View Return Label
                                            </a>
                                        </div>
                                    </td>
                                </tr>

                                <!-- PRODUCTS -->
                                <tr>
                                    <td style="padding:0 30px 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                            <tr style="background:#1D76BC; color:#ffffff;">
                                                <th style="padding:10px; border:1px solid #ddd; text-align:left; color:#ffffff;">Product</th>
                                                <th style="padding:10px; border:1px solid #ddd; text-align:center; color:#ffffff;">Quantity</th>
                                            </tr>
                                            ${productListHtml}
                                        </table>
                                    </td>
                                </tr>

                                <!-- ORDER DETAILS -->
                                <tr>
                                    <td style="padding:0 30px 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                            <tr>
                                                <th colspan="2"
                                                    style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
                                                    Order Details
                                                </th>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Executive</strong></td>
                                                <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Executive Email</strong></td>
                                                <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                            </tr>
                                            
                                            <tr>
                                                <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Customer Company Name</strong></td>
                                                <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Customer Contact Email</strong></td>
                                                <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Shipped Date</strong></td>
                                                <td style="padding:10px; border:1px solid #ddd;">${formatEmailDate(shippedDate)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Returned Tracking</strong></td>
                                                <td style="padding:10px; border:1px solid #ddd;">${returnTracking}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                            </table>

                        </td>
                    </tr>
                </table>
            </div>
            `,
    }),


    returnReminderCronEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,
        products,
        totalQuantity,
        returnTracking,
        fileLink,
        salesExecutive,
        salesExecutiveEmail,
        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,
        deviceUnits,
        budgetPerDevice,
        revenue,
        ingramAccount,
        quoteNumber,
        competitiveOpportunity,
        estimatedCloseDate,
        wants5gSim,
        segment,
        currentManufacturer,
        note,
        daysCount,
        shippedDate,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;
        products: Array<{
            name: string;
            quantity: number;
            slug?: string;
        }>;
        totalQuantity: number;
        returnTracking: string;
        fileLink: string;
        salesExecutive: string;
        salesExecutiveEmail: string;
        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;
        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        ingramAccount: string;
        quoteNumber: string;
        competitiveOpportunity: string;
        estimatedCloseDate: string;
        wants5gSim: string;
        segment: string;
        currentManufacturer: string;
        note: string;
        daysCount: string;
        shippedDate: string;
    }) => {
        const productRows = products.map(product => {
            const productLink = product.slug
                ? `${process.env.NEXT_PUBLIC_APP_URL}/product/${product.slug}`
                : '#';
            return `
            <tr>
                <td style="padding:10px; border:1px solid #ddd;">
                    ${product.slug
                        ? `<a href="${productLink}" style="color:#1D76BC; text-decoration:none;">${product.name}</a>`
                        : product.name
                    }
                </td>
                <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
            </tr>
            `;
        }).join('');

        const productListText = products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n');

        return {
            subject: `Overdue Reminder - Order #${orderNumber} (${companyName}) | Ingram Micro Surface`,
            text: `Overdue Reminder Notification | Ingram Micro Surface

            Return Reminder - Order #${orderNumber} (${companyName}) 
            Placed On: ${formatEmailDate(orderDate)}

            Hello,

            Thank you for using Ingram Micro Surface! We hope your experience was very positive.

            Your order for ${companyName} is now due for return. 
            You can view your return label using the link below or request it via email at support@ingrammicro-surface.com:

            View Return Label: ${fileLink}

            ORDER ITEMS (${totalQuantity} items)
            ${productListText}

            TEAM DETAILS
            Sales Executive: ${salesExecutive}
            Sales Executive Email: ${salesExecutiveEmail}

            SHIPPING DETAILS
            Company Name: ${companyName}
            Contact Name: ${contactName}
            Email Address: ${contactEmail}
            Shipping Address: ${shippingAddress}
            City: ${city}
            State: ${state}
            Zip: ${zip}
            Desired Demo Delivery Date: ${formatEmailDate(deliveryDate)}
            Shipped Date: ${formatEmailDate(shippedDate)}
            Days Since Shipped: ${daysCount}
            Returned Tracking: ${returnTracking}

            OPPORTUNITY DETAILS
            Device Opportunity Size (Units): ${deviceUnits}
            Budget Per Device ($): ${budgetPerDevice}
            Revenue Opportunity Size ($): ${revenue}
            INGRAM Account #: ${ingramAccount}
            Quote #: ${quoteNumber}
            Segment: ${segment}
            Current Manufacturer: ${currentManufacturer}
            Is Competitive: ${competitiveOpportunity}
            Estimated Close Date: ${estimatedCloseDate}
            Wants 5G SIM (AT&T)?: ${wants5gSim}

            NOTE
            ${note}

            If you have any questions, please contact us at support@ingrammicro-surface.com.

            Best regards,
            The Ingram Micro Surface Team`,

            html: `
    <div style="font-family: 'Inter', sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#1D76BC; padding:30px; text-align:center;">
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Overdue Reminder Notification Order #${orderNumber} (${companyName}) | Ingram Micro Surface
                                </h1>
                            </td>
                        </tr>

                        <!-- LOGO -->
                        <tr>
                            <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
                                <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png" alt="Ingram Logo"
                                    style="max-width:400px; width:220px;" />
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:15px;"><strong>Return Reminder Order #${orderNumber}</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;">Placed On ${formatEmailDate(orderDate)}</p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;"><strong>Hello, ${customerName}</strong></p>
                                <p style="font-size:15px; line-height:1.6; color:#666;">
                                    This is a message from the Ingram Micro Surface team that <b>Order #${orderNumber}</b>
                                    for <b>(${companyName})</b> has now been shipped for a period of <b>${daysCount}</b> against the 30-day trial period.
                                </p>
                                <p style="font-size:15px; line-height:1.6; color:#666;">
                                    Your order for ${companyName} is now due for return. You can also
                                    obtain a soft copy of the return label by clicking on the below or sending a request
                                    at support@ingrammicro-surface.com.
                                </p>
                            </td>
                        </tr>

                        <!-- RETURN LABEL BUTTON -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <div style="text-align:center; margin:30px 0;">
                                    <a href="${fileLink}" style="
                                        background:#1D76BC;
                                        color:#ffffff;
                                        padding:14px 34px;
                                        text-decoration:none;
                                        border-radius:6px;
                                        font-size:16px;
                                        font-weight:600;
                                        display:inline-block;
                                    ">
                                        Download Return Label
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <!-- PRODUCTS TABLE -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr style="background:#1D76BC; color:#ffffff;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left; color:#ffffff;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center; color:#ffffff;">Quantity</th>
                                    </tr>
                                    ${productRows}
                                </table>
                            </td>
                        </tr>

                        <!-- SHIPPING DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2" style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
                                            Shipping Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Executive Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Company Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Contact Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Contact Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Shipped Date</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${formatEmailDate(shippedDate)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Days Since Shipped</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${daysCount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Returned Tracking</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${returnTracking}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- OPPORTUNITY DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2" style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
                                            Opportunity Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Device Opportunity Size (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Budget Per Device ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Revenue Opportunity Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>INGRAM Account #</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${ingramAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Quote #</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${quoteNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Current Manufacturer</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentManufacturer}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Is Competitive Opportunity?</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${competitiveOpportunity}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Estimated Close Date</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${estimatedCloseDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Wants 5G SIM (AT&T)?</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${wants5gSim}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- NOTES -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2" style="background:#1D76BC; color:#ffffff; padding:12px; text-align:left;">
                                            Notes
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;">${note}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </div>
            `,
        };
    },

    reportWinEmail: ({
        orderNumber,
        ingramOrderNumber, // NEW: Add this parameter
        orderDate,
        customerName,
        submittedEmail,
        productName,
        productDetails, // NEW: For product details display
        quantity,
        resellerAccount,
        units,
        pType,
        dealRev,
        reseller,
        notes,
    }: {
        orderNumber: string | number;
        ingramOrderNumber?: string; // NEW: Optional parameter
        orderDate: string;
        customerName: string;
        submittedEmail: string;
        productName: string;
        productDetails?: string; // NEW: Optional parameter
        quantity: number;
        reseller: string;
        resellerAccount: string;
        units: string;
        pType: string;
        dealRev: string;
        notes: string;
    }) => {
        // Generate product rows HTML for multiple products
        let productDisplayHTML = '';
        let productText = '';

        if (productDetails && productDetails.length > 0) {
            // If we have product details array (for multiple products)
            productDisplayHTML = productDetails;
            productText = productName; // productName will contain the formatted text
        } else {
            // Single product or no details
            productDisplayHTML = `
        <tr>
            <td style="padding:10px; border:1px solid #ddd;">${productName}</td>
        </tr>`;
            productText = `Product: ${productName}`;
        }

        return {
            subject: `Report a Win | Ingram Micro Surface`,
            text: `Report a Win | Ingram Micro Surface
            Submitted by: ${submittedEmail}
            Win Reported Order#: ${orderNumber}

            ORDER ITEMS
            ${productText}

            RESELLER & ORDER DETAILS
            Reseller Account #: ${resellerAccount}
            Reseller Name: ${reseller}
            Ingram  Order#: ${ingramOrderNumber || orderNumber}
            Customer Name: ${customerName}
            Number of Units: ${units}
            One-time purchase or roll out?: ${pType}
            Total Deal Revenue ($): ${dealRev}
            Date of Purchase: ${orderDate}

            HOW Ingram Micro Surface HELPED CLOSE THE DEAL
            ${notes}


            If you have any questions, please contact us at support@ingrammicro-surface.com.

            Best regards,
            The Ingram Micro Surface Team`
            ,
         html:`
<div style="font-family: 'Inter', sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#1D76BC; padding:30px; text-align:center;">
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Report a Win | Ingram Micro Surface
                                </h1>
                            </td>
                        </tr>

                        <!-- LOGO -->
                        <tr>
                            <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
                                <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png" alt="Ingram Logo"
                                    style="max-width:400px; width:220px;" />
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:14px;"><strong>Submitted by:
                                    </strong>${submittedEmail}</p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:30px;">
                                <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/step5.png"
                                    alt="Thank you for your order"
                                    style="width:100%; max-width:720px; height:auto; display:block;" width="720" />
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:14px;"><strong>Win Reported Order#
                                        ${orderNumber}</strong></p>
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr style="background:#1D76BC; color:#ffffff;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left; color:#ffffff;">Product</th>
                                    </tr>
                                    ${productDisplayHTML}
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Reseller Account #</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${resellerAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Reseller Name</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Ingram Order#</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${ingramOrderNumber || orderNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Customer Name</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${customerName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Number of Units</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${units}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Is this be a one-time purchase or roll out?</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${pType}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Total Deal Revenue ($)</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${dealRev}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Date of Purchase</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${formatEmailDate(orderDate)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;" colspan="2"><strong>How did Ingram Micro Surface help you close this deal?</strong></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;" colspan="2">${notes}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
    `,
        };
    },


    waitListEmail: ({
        product,
        sku,
        email,
    }: {
        product: string;
        sku: string;
        email: string;
    }) => ({
        subject: `Product Subscribed | Ingram Micro Surface`,
        text: `Product Subscribed | Ingram Micro Surface
                Dear ${email},

                You have successfully subscribed to the following product on Ingram Micro Surface.

                PRODUCT DETAILS
                Product: ${product}
                SKU: ${sku}

                You will receive an email notification as soon as this product is back in stock.

                Thank you for using Ingram Micro Surface.

                If you have any questions, please contact us at support@ingrammicro-surface.com.

                Best regards,
                The Ingram Micro Surface Team`
        ,
        html:`
<div style="font-family: 'Inter', sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#1D76BC; padding:30px; text-align:center;">
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Product Subscribed | Ingram Micro Surface
                                </h1>
                            </td>
                        </tr>

                        <!-- LOGO -->
                        <tr>
                            <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
                                <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png" alt="Ingram Logo"
                                    style="max-width:400px; width:220px;" />
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:14px;"><strong>Dear:
                                    </strong>${email}</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6;">
                                    You have subscribed to <b>${product} (${sku})</b> on Ingram Micro Surface. An email
                                    notification will be sent
                                    once the product is back in stock.
                                </p>
                                <p>
                                    Thank you for using Ingram Micro Surface!
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    backInStockEmail: ({
        product,
        sku,
        email,
        productUrl,
    }: {
        product: string;
        sku: string;
        email: string;
        productUrl: string;
    }) => ({
        subject: `Product Back In Stock | Ingram Micro Surface`,
        text: `Product Back In Stock | Ingram Micro Surface
            Hello ${email},

            Your subscribed product is now back in stock.

            PRODUCT DETAILS
            Product: ${product}
            SKU: ${sku}

            You can now add this product directly to your cart using the link below:
            ${productUrl}

            Thank you for using Ingram Micro Surface.

            If you have any questions, please contact us at support@ingrammicro-surface.com.

            Best regards,
            The Ingram Micro Surface Team`,
       html:`
<div style="font-family: 'Inter', sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#1D76BC; padding:30px; text-align:center;">
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Product Back In Stock | Ingram Micro Surface
                                </h1>
                            </td>
                        </tr>

                        <!-- LOGO -->
                        <tr>
                            <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
                                <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png" alt="Ingram Logo"
                                    style="max-width:400px; width:220px;" />
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:14px;"><strong>Hello
                                    </strong>${email},</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6;">
                                    Your Subscribed Product <b>${product} (${sku})</b> is now back in stock!
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6;">
                                    You can now add this product directly to your cart ${productUrl}
                                </p>
                                <p>
                                    Thank you for using Ingram Micro Surface!
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
    `,
    }),


    approvedUserEmail: (email: string) => ({
        subject: `User Approved | Ingram Micro Surface`,
        text: `Hi ${email},

            Thank you for signing up! Your account has been reviewed and approved.

            You can now log in and start using the Ingramicro surface portal.

            Login: ${process.env.NEXT_PUBLIC_APP_URL}/login

            If you have any questions or experience issues accessing your account,
            please contact our support team.

            Best regards,
            The Ingram Micro Surface Team`,
        html:`
<div style="font-family: 'Inter', sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#1D76BC; padding:30px; text-align:center;">
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Account Approved | Ingram Micro Surface
                                </h1>
                            </td>
                        </tr>

                        <!-- LOGO -->
                        <tr>
                            <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
                                <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png" alt="Ingram Logo"
                                    style="max-width:400px; width:220px;" />
                            </td>
                        </tr>

                        <!-- BODY -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6; margin-top:0;">
                                    Hi <strong>${email}</strong>,
                                </p>
                                <p style="font-size:15px; line-height:1.6;">
                                    Thank you for signing up! Your account has been reviewed and approved.
                                </p>
                                <p style="font-size:15px; line-height:1.6;">
                                    You can now log in and start using the Ingramicro surface portal.
                                </p>
                            </td>
                        </tr>

                        <!-- CTA BUTTON -->
                        <tr>
                            <td align="center" style="padding:0px 30px 35px 30px;">
                                <table border="0" cellspacing="0" cellpadding="0" align="center">
                                    <tr>
                                        <td align="center"
                                            style="background-color:#1D76BC; padding:12px 22px; border-radius:6px;">
                                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login"
                                                style="color:#ffffff; text-decoration:none; font-size:18px; font-family:'Inter', sans-serif; display:inline-block;">
                                                Login to Portal
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="font-size:14px; line-height:1.6; color:#555;">
                                    If you have any questions or face issues accessing your account,
                                    feel free to contact our support team.
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </div>
    `,
    }),


    rejectedUserEmail: (email: string) => ({
        subject: `User Rejected | Ingram Micro Surface`,
        text: `Hi ${email},

                Thank you for your interest in the Ingramicro surface portal.

                After careful review, we’re unable to approve your account at this time.
                This decision may be based on internal verification or eligibility requirements.

                If you believe this is a mistake or need further clarification,
                please contact our support team for assistance.

                Best regards,
                The Ingram Micro Surface Team`,
        html:`
<div style="font-family: 'Inter', sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#1D76BC; padding:30px; text-align:center;">
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Account Update | Ingram Micro Surface
                                </h1>
                            </td>
                        </tr>

                        <!-- LOGO -->
                        <tr>
                            <td style="padding:24px 30px 0px 30px; text-align:center; background:#ffffff;">
                                <img src="https://kfidhqvdmjzzqssngsnb.supabase.co/storage/v1/object/public/EMAIL/Ingram_micro_logo.png" alt="Ingram Micro Surface Logo"
                                    style="max-width:400px; width:220px;" />
                            </td>
                        </tr>

                        <!-- BODY -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6; margin-top:0;">
                                    Hi <strong>${email}</strong>,
                                </p>
                                <p style="font-size:15px; line-height:1.6;">
                                    Thank you for signing up for the Ingramicro surface portal.
                                </p>
                                <p style="font-size:15px; line-height:1.6; color:#b02a37;">
                                    After careful review, we're unable to approve your account at this time.
                                </p>
                                <p style="font-size:15px; line-height:1.6; color:#555;">
                                    This decision may be based on internal verification or eligibility requirements.
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </div>
        `,
    }),
};