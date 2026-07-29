import { Injectable } from '@nestjs/common';
import { Prisma, Notification as NotificationModel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';

export type NotificationCategory =
    | 'pomodoro'
    | 'schedule'
    | 'ai_insights'
    | 'productivity';

export type NotificationActionType =
    | 'start_pomodoro'
    | 'view_details';

export interface CreateNotificationOptions {
    metadata?: Prisma.InputJsonValue;
    dedupeKey?: string;
}

export interface NotificationItem {
    id: string;
    category: NotificationCategory;
    title: string;
    description: string;
    time: string;
    timeGroup: 'today' | 'yesterday' | 'week';
    read: boolean;
    actionType?: NotificationActionType;
    metadata?: Prisma.JsonValue | null;
    createdAt: Date;
}

@Injectable()
export class NotificationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly gateway: NotificationGateway,
    ) {}

    /**
     * Lấy tối đa 50 thông báo mới nhất. Không còn dùng mock/in-memory store,
     * vì cron và nhiều instance backend cần dữ liệu bền vững trong PostgreSQL.
     */
    async getNotifications(userId: string): Promise<NotificationItem[]> {
        const notifications = await this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return notifications.map((item) => this.formatNotification(item));
    }

    /**
     * Tạo thông báo bền vững và emit realtime. dedupeKey dùng để chống gửi
     * trùng khi cron retry hoặc backend chạy nhiều instance.
     */
    async createNotification(
        userId: string,
        category: NotificationCategory,
        title: string,
        description: string,
        actionType?: NotificationActionType,
        options: CreateNotificationOptions = {},
    ): Promise<NotificationItem> {
        if (options.dedupeKey) {
            const existing = await this.prisma.notification.findUnique({
                where: { dedupeKey: options.dedupeKey },
            });
            if (existing) {
                return this.formatNotification(existing);
            }
        }

        let created: NotificationModel;
        try {
            created = await this.prisma.notification.create({
                data: {
                    userId,
                    category,
                    title,
                    description,
                    actionType,
                    metadata: options.metadata,
                    dedupeKey: options.dedupeKey,
                },
            });
        } catch (error) {
            // Hai worker có thể cùng chạm unique dedupeKey. Worker thua đọc lại
            // bản ghi đã được worker còn lại tạo thay vì gửi trùng.
            if (options.dedupeKey && this.isUniqueConstraintError(error)) {
                const existing = await this.prisma.notification.findUnique({
                    where: { dedupeKey: options.dedupeKey },
                });
                if (existing) return this.formatNotification(existing);
            }
            throw error;
        }

        const result = this.formatNotification(created);
        this.gateway.emitToUser(userId, 'notification', result);
        return result;
    }

    async markAsRead(userId: string, id: string): Promise<void> {
        await this.prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true },
        });
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }

    private formatNotification(item: NotificationModel): NotificationItem {
        return {
            id: item.id,
            category: item.category as NotificationCategory,
            title: item.title,
            description: item.description,
            time: this.getRelativeTimeString(item.createdAt),
            timeGroup: this.getTimeGroup(item.createdAt),
            read: item.read,
            actionType:
                (item.actionType as NotificationActionType | null) ?? undefined,
            metadata: item.metadata,
            createdAt: item.createdAt,
        };
    }

    private isUniqueConstraintError(error: unknown): boolean {
        return (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        );
    }

    private getTimeGroup(date: Date): 'today' | 'yesterday' | 'week' {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date >= today) return 'today';
        if (date >= yesterday) return 'yesterday';
        return 'week';
    }

    private getRelativeTimeString(date: Date): string {
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60_000);
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Hôm qua';
        return `${diffDays} ngày trước`;
    }
}
