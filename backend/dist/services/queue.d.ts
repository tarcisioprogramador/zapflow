import { Worker } from 'bullmq';
import { WhatsAppJob, CampaignJob, RemarketingJob } from '../types';
export declare function getWhatsappWorker(): Worker<WhatsAppJob> | null;
export declare function getCampaignWorker(): Worker<CampaignJob> | null;
export declare function getRemarketingWorker(): Worker<RemarketingJob> | null;
//# sourceMappingURL=queue.d.ts.map