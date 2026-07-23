interface CouponValidationResult {
    valid: boolean;
    reason?: string;
    coupon?: {
        id: string;
        code: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
    };
    discountAmount?: number;
    finalAmount?: number;
}
export declare function validateCoupon(code: string, plan: string, amountInCents: number, userId?: string): Promise<CouponValidationResult>;
export declare function incrementCouponUsage(code: string): Promise<void>;
export declare function createCoupon(data: {
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minValue?: number;
    maxUses?: number;
    maxUsesPerUser?: number;
    appliesToPlans?: string[];
    startsAt?: string;
    expiresAt?: string;
}): Promise<{
    description: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
    code: string;
    discountType: string;
    discountValue: number;
    minValue: number | null;
    maxUses: number | null;
    currentUses: number;
    maxUsesPerUser: number | null;
    appliesToPlans: string | null;
    startsAt: Date | null;
    isActive: boolean;
}>;
export declare function listCoupons(): Promise<{
    description: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
    code: string;
    discountType: string;
    discountValue: number;
    minValue: number | null;
    maxUses: number | null;
    currentUses: number;
    maxUsesPerUser: number | null;
    appliesToPlans: string | null;
    startsAt: Date | null;
    isActive: boolean;
}[]>;
export declare function updateCoupon(id: string, data: Partial<{
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minValue: number;
    maxUses: number;
    isActive: boolean;
    appliesToPlans: string[];
    startsAt: string;
    expiresAt: string;
}>): Promise<{
    description: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
    code: string;
    discountType: string;
    discountValue: number;
    minValue: number | null;
    maxUses: number | null;
    currentUses: number;
    maxUsesPerUser: number | null;
    appliesToPlans: string | null;
    startsAt: Date | null;
    isActive: boolean;
}>;
export declare function deleteCoupon(id: string): Promise<{
    description: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
    code: string;
    discountType: string;
    discountValue: number;
    minValue: number | null;
    maxUses: number | null;
    currentUses: number;
    maxUsesPerUser: number | null;
    appliesToPlans: string | null;
    startsAt: Date | null;
    isActive: boolean;
}>;
export {};
//# sourceMappingURL=coupon.d.ts.map