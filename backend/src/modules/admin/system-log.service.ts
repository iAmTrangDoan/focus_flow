import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemLogCategory, SystemLogStatus } from '@prisma/client';

export interface CreateSystemLogDto {
    category: SystemLogCategory;
    eventType: string;
    status: SystemLogStatus;
    userId?: string;
    adminId?: string;
    source?: string;
    message?: string;
    metadata?: Record<string, any>;
    durationMs?: number;
    errorMessage?: string;
}

@Injectable()
export class SystemLogService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Fire-and-forget: ghi log không chặn luồng chính.
     * Dùng trong service methods để không tăng latency.
     */
    log(data: CreateSystemLogDto): void {
        this.prisma.systemLog
            .create({ data })
            .catch((err) => {
                console.error('[SystemLog] Failed to write log:', err?.message);
            });
    }

    /**
     * Async version: dùng trong @Cron() handlers khi latency không quan trọng.
     */
    async logAsync(data: CreateSystemLogDto): Promise<void> {
        try {
            await this.prisma.systemLog.create({ data });
        } catch (err) {
            console.error('[SystemLog] Failed to write async log:', (err as any)?.message);
        }
    }
}
