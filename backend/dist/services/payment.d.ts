declare const PLANS: Record<string, {
    name: string;
    amount: number;
    monthlyId?: string;
    yearlyId?: string;
}>;
declare const DISCOUNT_CODES: {
    WELCOME10: {
        type: "percentage";
        value: number;
        description: string;
    };
    BLACKFRIDAY30: {
        type: "percentage";
        value: number;
        description: string;
    };
};
export declare function getMpStatus(): {
    configured: boolean;
    canCheckout: boolean;
    keys: {
        accessToken: boolean;
        publicKey: boolean;
        webhookSecret: boolean;
    };
    missingKeys: (string | false)[];
    signatureValidation: string;
    nextStep: string;
};
export declare function validateWebhookSignature(req: {
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string | undefined>;
    body: any;
}): {
    valid: boolean;
    reason?: string;
};
export declare function createCheckoutPreference(params: {
    plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
    customerEmail?: string;
    userId?: string;
    organizationId?: string;
    successUrl: string;
    cancelUrl: string;
    isOneTime?: boolean;
    couponCode?: string;
}): Promise<{
    url: string | undefined;
    sandboxUrl: string | undefined;
    preferenceId: string | undefined;
    originalAmount: number | undefined;
    discountAmount: number | undefined;
    finalAmount: number | undefined;
}>;
export declare function createSubscription(params: {
    plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
    payerEmail: string;
    userId: string;
    organizationId: string;
    backUrl: string;
    couponCode?: string;
}): Promise<{
    url: string | undefined;
    preapprovalId: string | undefined;
    originalAmount: number | undefined;
    discountAmount: number | undefined;
    finalAmount: number | undefined;
}>;
export declare function getPaymentInfo(paymentId: string): Promise<import("mercadopago/dist/clients/payment/commonTypes").PaymentResponse>;
export declare function getPreapprovalInfo(preapprovalId: string): Promise<import("mercadopago/dist/clients/preApproval/commonTypes").PreApprovalResponse>;
export declare function getCustomerPanelUrl(customerEmail: string): string;
export declare function recordPayment(params: {
    organizationId: string;
    mpPaymentId?: string | null;
    mpPreapprovalId?: string | null;
    amount: number;
    originalAmount?: number;
    discountAmount?: number;
    couponCode?: string;
    currency?: string;
    status: 'pending' | 'succeeded' | 'failed' | 'refunded';
    plan: string;
    description?: string | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
}): Promise<void>;
export declare function handleWebhookNotification(body: any): Promise<void>;
export declare function linkPaymentToUser(params: {
    paymentId: string;
    organizationId: string;
    userId: string;
    userEmail: string;
}): Promise<{
    plan: string;
    planName: string;
    linked: boolean;
} | null>;
export declare function cancelSubscription(organizationId: string): Promise<{
    canceled: boolean;
}>;
export { PLANS, DISCOUNT_CODES };
//# sourceMappingURL=payment.d.ts.map