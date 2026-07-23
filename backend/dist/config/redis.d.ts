import { Queue } from 'bullmq';
import { WhatsAppJob, CampaignJob, RemarketingJob } from '../types';
export declare const redis: {
    get(key: string): Promise<string | null>;
    setex(key: string, ttl: number, value: string): Promise<void>;
    del(key: string): Promise<void>;
};
export declare function getWhatsappQueue(): Queue<WhatsAppJob> | undefined;
export declare function getCampaignQueue(): Queue<CampaignJob> | undefined;
export declare function getRemarketingQueue(): Queue<RemarketingJob> | undefined;
//# sourceMappingURL=redis.d.ts.map