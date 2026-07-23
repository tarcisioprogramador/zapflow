import { Response, NextFunction } from 'express';
import { AuthRequest, PLAN_LIMITS, PlanResourceKey } from '../types';
type NumericResource = {
    [K in PlanResourceKey]: typeof PLAN_LIMITS['FREE'][K] extends number ? K : never;
}[PlanResourceKey];
export declare function checkPlanLimit(resource: NumericResource): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=plan.d.ts.map