"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoupon = validateCoupon;
exports.incrementCouponUsage = incrementCouponUsage;
exports.createCoupon = createCoupon;
exports.listCoupons = listCoupons;
exports.updateCoupon = updateCoupon;
exports.deleteCoupon = deleteCoupon;
const database_1 = __importDefault(require("../config/database"));
async function validateCoupon(code, plan, amountInCents, userId) {
    const coupon = await database_1.default.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) {
        return { valid: false, reason: 'Cupom não encontrado' };
    }
    if (!coupon.isActive) {
        return { valid: false, reason: 'Cupom inativo' };
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return { valid: false, reason: 'Cupom expirado' };
    }
    if (coupon.startsAt && coupon.startsAt > new Date()) {
        return { valid: false, reason: 'Cupom ainda não está válido' };
    }
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
        return { valid: false, reason: 'Cupom esgotado' };
    }
    if (coupon.minValue && amountInCents < coupon.minValue) {
        return {
            valid: false,
            reason: `Valor mínimo de R$ ${(coupon.minValue / 100).toFixed(2).replace('.', ',')} para usar este cupom`,
        };
    }
    if (coupon.appliesToPlans) {
        const allowedPlans = JSON.parse(coupon.appliesToPlans);
        if (!allowedPlans.includes(plan)) {
            return { valid: false, reason: 'Cupom não válido para este plano' };
        }
    }
    if (coupon.maxUsesPerUser && userId) {
        const userUsageCount = await database_1.default.payment.count({
            where: { couponCode: code.toUpperCase(), organization: { users: { some: { id: userId } } } },
        });
        if (userUsageCount >= coupon.maxUsesPerUser) {
            return { valid: false, reason: 'Você já atingiu o limite de usos deste cupom' };
        }
    }
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
        discountAmount = Math.round(amountInCents * (coupon.discountValue / 100));
    }
    else {
        discountAmount = Math.min(coupon.discountValue, amountInCents);
    }
    const finalAmount = amountInCents - discountAmount;
    return {
        valid: true,
        coupon: {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
        },
        discountAmount,
        finalAmount,
    };
}
async function incrementCouponUsage(code) {
    await database_1.default.coupon.update({
        where: { code: code.toUpperCase() },
        data: { currentUses: { increment: 1 } },
    });
}
async function createCoupon(data) {
    const existing = await database_1.default.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) {
        throw new Error('Já existe um cupom com este código');
    }
    return database_1.default.coupon.create({
        data: {
            code: data.code.toUpperCase(),
            description: data.description,
            discountType: data.discountType,
            discountValue: data.discountValue,
            minValue: data.minValue,
            maxUses: data.maxUses,
            maxUsesPerUser: data.maxUsesPerUser,
            appliesToPlans: data.appliesToPlans ? JSON.stringify(data.appliesToPlans) : null,
            startsAt: data.startsAt ? new Date(data.startsAt) : null,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
    });
}
async function listCoupons() {
    return database_1.default.coupon.findMany({
        orderBy: { createdAt: 'desc' },
    });
}
async function updateCoupon(id, data) {
    const updateData = { ...data };
    if (data.appliesToPlans) {
        updateData.appliesToPlans = JSON.stringify(data.appliesToPlans);
    }
    if (data.startsAt) {
        updateData.startsAt = new Date(data.startsAt);
    }
    if (data.expiresAt) {
        updateData.expiresAt = new Date(data.expiresAt);
    }
    return database_1.default.coupon.update({ where: { id }, data: updateData });
}
async function deleteCoupon(id) {
    return database_1.default.coupon.delete({ where: { id } });
}
//# sourceMappingURL=coupon.js.map