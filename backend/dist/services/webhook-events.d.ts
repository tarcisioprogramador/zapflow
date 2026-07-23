export declare function createEventLog(params: {
    source: string;
    eventId?: string;
    eventType: string;
    dataId?: string;
    status: 'received' | 'processing' | 'processed' | 'failed';
    requestBody?: any;
    responseBody?: any;
    errorMessage?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    source: string;
    eventId: string | null;
    eventType: string;
    dataId: string | null;
    status: string;
    requestBody: string | null;
    responseBody: string | null;
    errorMessage: string | null;
    processedAt: Date | null;
} | undefined>;
export declare function updateEventLog(id: string, data: Partial<{
    status: string;
    responseBody: any;
    errorMessage: string;
}>): Promise<{
    id: string;
    createdAt: Date;
    source: string;
    eventId: string | null;
    eventType: string;
    dataId: string | null;
    status: string;
    requestBody: string | null;
    responseBody: string | null;
    errorMessage: string | null;
    processedAt: Date | null;
} | undefined>;
export declare function findEventByIdempotencyKey(source: string, eventId: string): Promise<{
    id: string;
    createdAt: Date;
    source: string;
    eventId: string | null;
    eventType: string;
    dataId: string | null;
    status: string;
    requestBody: string | null;
    responseBody: string | null;
    errorMessage: string | null;
    processedAt: Date | null;
} | null>;
export declare function findRecentEventByDataId(source: string, dataId: string, withinMs?: number): Promise<{
    id: string;
    createdAt: Date;
    source: string;
    eventId: string | null;
    eventType: string;
    dataId: string | null;
    status: string;
    requestBody: string | null;
    responseBody: string | null;
    errorMessage: string | null;
    processedAt: Date | null;
} | null>;
//# sourceMappingURL=webhook-events.d.ts.map