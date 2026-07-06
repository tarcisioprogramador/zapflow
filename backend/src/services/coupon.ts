import prisma from '../config/database';

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

export async function validateCoupon(
  code: string,
  plan: string,
  amountInCents: number,
  userId?: string
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

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
    const allowedPlans: string[] = JSON.parse(coupon.appliesToPlans);
    if (!allowedPlans.includes(plan)) {
      return { valid: false, reason: 'Cupom não válido para este plano' };
    }
  }
  if (coupon.maxUsesPerUser && userId) {
    const userUsageCount = await prisma.payment.count({
      where: { couponCode: code.toUpperCase(), organization: { users: { some: { id: userId } } } },
    });
    if (userUsageCount >= coupon.maxUsesPerUser) {
      return { valid: false, reason: 'Você já atingiu o limite de usos deste cupom' };
    }
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round(amountInCents * (coupon.discountValue / 100));
  } else {
    discountAmount = Math.min(coupon.discountValue, amountInCents);
  }

  const finalAmount = amountInCents - discountAmount;

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType as 'percentage' | 'fixed',
      discountValue: coupon.discountValue,
    },
    discountAmount,
    finalAmount,
  };
}

export async function incrementCouponUsage(code: string): Promise<void> {
  await prisma.coupon.update({
    where: { code: code.toUpperCase() },
    data: { currentUses: { increment: 1 } },
  });
}

export async function createCoupon(data: {
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
}) {
  const existing = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
  if (existing) {
    throw new Error('Já existe um cupom com este código');
  }

  return prisma.coupon.create({
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

export async function listCoupons() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateCoupon(id: string, data: Partial<{
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minValue: number;
  maxUses: number;
  isActive: boolean;
  appliesToPlans: string[];
  startsAt: string;
  expiresAt: string;
}>) {
  const updateData: any = { ...data };
  if (data.appliesToPlans) {
    updateData.appliesToPlans = JSON.stringify(data.appliesToPlans);
  }
  if (data.startsAt) {
    updateData.startsAt = new Date(data.startsAt);
  }
  if (data.expiresAt) {
    updateData.expiresAt = new Date(data.expiresAt);
  }
  return prisma.coupon.update({ where: { id }, data: updateData });
}

export async function deleteCoupon(id: string) {
  return prisma.coupon.delete({ where: { id } });
}
