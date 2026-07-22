import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

export interface NotificationItem {
    id: string;
    category: 'pomodoro' | 'schedule' | 'ai_insights' | 'productivity';
    title: string;
    description: string;
    time: string;
    timeGroup: 'today' | 'yesterday' | 'week';
    read: boolean;
    actionType?: 'start_pomodoro' | 'view_details';
    createdAt: Date;
}

@Injectable()
export class NotificationService {
    // In-memory notifications store grouped by userId
    private notificationsStore: Map<string, NotificationItem[]> = new Map();

    constructor(
        @Inject(forwardRef(() => NotificationGateway))
        private readonly gateway: NotificationGateway,
    ) {}

    /**
     * Lấy danh sách notifications của user. Khởi tạo bằng mock data nếu trống.
     */
    async getNotifications(userId: string): Promise<NotificationItem[]> {
        if (!this.notificationsStore.has(userId)) {
            // Khởi tạo mock data mặc định cho trải nghiệm mượt mà
            const mockData: NotificationItem[] = [
                {
                    id: 'mock-1',
                    category: 'pomodoro',
                    title: 'Hết thời gian tập trung',
                    description: 'Phiên Pomodoro 25 phút đã kết thúc. Hãy nghỉ ngơi 5 phút trước khi tiếp tục.',
                    time: '5 phút trước',
                    timeGroup: 'today',
                    read: false,
                    createdAt: new Date(),
                },
                {
                    id: 'mock-2',
                    category: 'pomodoro',
                    title: 'Task đã đến giờ nhưng chưa bắt đầu',
                    description: 'Task "Hoàn thành báo cáo Q3" đã đến giờ hẹn nhưng chưa bấm Bắt đầu Pomodoro.',
                    time: '12 phút trước',
                    timeGroup: 'today',
                    read: false,
                    actionType: 'start_pomodoro',
                    createdAt: new Date(Date.now() - 12 * 60 * 1000),
                },
                {
                    id: 'mock-3',
                    category: 'schedule',
                    title: 'Lên lịch tuần tự động hoàn tất',
                    description: 'Đã sắp xếp các task vào lịch tuần mới theo mức độ ưu tiên tối ưu.',
                    time: '1 giờ trước',
                    timeGroup: 'today',
                    read: false,
                    actionType: 'view_details',
                    createdAt: new Date(Date.now() - 60 * 60 * 1000),
                },
            ];
            this.notificationsStore.set(userId, mockData);
        }

        // Cập nhật lại chuỗi hiển thị relative time động trước khi trả về
        const list = this.notificationsStore.get(userId) || [];
        return list.map(item => ({
            ...item,
            time: this.getRelativeTimeString(item.createdAt),
        }));
    }

    /**
     * Tạo và gửi thông báo mới (realtime qua Socket.IO + lưu vào store)
     */
    async createNotification(
        userId: string,
        category: 'pomodoro' | 'schedule' | 'ai_insights' | 'productivity',
        title: string,
        description: string,
        actionType?: 'start_pomodoro' | 'view_details',
    ): Promise<NotificationItem> {
        const list = this.notificationsStore.get(userId) || [];
        
        const newNotification: NotificationItem = {
            id: `notify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category,
            title,
            description,
            time: 'Vừa xong',
            timeGroup: 'today',
            read: false,
            actionType,
            createdAt: new Date(),
        };

        list.unshift(newNotification);
        this.notificationsStore.set(userId, list);

        // Phát realtime event qua Gateway
        this.gateway.emitToUser(userId, 'notification', {
            ...newNotification,
            time: 'Vừa xong',
        });

        return newNotification;
    }

    /**
     * Đánh dấu 1 thông báo là đã đọc
     */
    async markAsRead(userId: string, id: string): Promise<void> {
        const list = this.notificationsStore.get(userId) || [];
        const index = list.findIndex(n => n.id === id);
        if (index !== -1) {
            list[index].read = true;
            this.notificationsStore.set(userId, list);
        }
    }

    /**
     * Đánh dấu toàn bộ thông báo của user là đã đọc
     */
    async markAllAsRead(userId: string): Promise<void> {
        const list = this.notificationsStore.get(userId) || [];
        list.forEach(n => n.read = true);
        this.notificationsStore.set(userId, list);
    }

    // ─── HELPERS ────────────────────────────────────────────────

    private getRelativeTimeString(date: Date): string {
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Hôm qua';
        return `${diffDays} ngày trước`;
    }
}
