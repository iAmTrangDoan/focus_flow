import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── USER MANAGEMENT ──────────────────────────────────────

    async listUsers() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                displayName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getUserDetail(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                role: true,
                timezone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { tasks: true, pomodoroSessions: true } },
            },
        });
        if (!user) throw new NotFoundException('User không tồn tại');
        return user;
    }

    async toggleUserActive(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User không tồn tại');

        return this.prisma.user.update({
            where: { id: userId },
            data: { isActive: !user.isActive },
            select: { id: true, email: true, isActive: true },
        });
    }

    // ─── DASHBOARD ────────────────────────────────────────────

    async getDashboard() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Lấy ngày hôm qua để tính avg procrastination score gần nhất
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const [tasksToday, totalUsers, procrastinationAgg] = await Promise.all([
            // Số task tạo hôm nay
            this.prisma.task.count({
                where: { createdAt: { gte: today } },
            }),
            // Tổng số users
            this.prisma.user.count(),
            // Procrastination Score trung bình từ bản ghi 7 ngày gần nhất
            this.prisma.procrastinationScore.aggregate({
                _avg: { score: true },
                where: {
                    calculatedDate: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);

        const avgScore = procrastinationAgg._avg.score;

        return {
            tasksCreatedToday: tasksToday,
            totalUsers,
            avgProcrastinationScore: avgScore !== null ? Math.round(avgScore) : null,
        };
    }

    // ─── RECENT ACTIVITIES ────────────────────────────────────

    async getRecentActivities(limit = 20) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h qua

        // 1. User đăng ký mới (createdAt trong 24h)
        const newUsers = await this.prisma.user.findMany({
            where: { createdAt: { gte: since } },
            select: { id: true, email: true, createdAt: true, isActive: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // 2. User bị vô hiệu hóa (isActive = false, updatedAt trong 24h)
        const blockedUsers = await this.prisma.user.findMany({
            where: {
                isActive: false,
                updatedAt: { gte: since },
            },
            select: { id: true, email: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: limit,
        });

        // 3. SystemConfig thay đổi gần đây (updatedAt trong 24h)
        const configChanges = await this.prisma.systemConfig.findMany({
            where: { updatedAt: { gte: since } },
            select: { key: true, updatedAt: true, updatedBy: true },
            orderBy: { updatedAt: 'desc' },
            take: limit,
        });

        // Gộp tất cả thành activity list, sort theo thời gian
        const activities: Array<{
            id: string;
            type: string;
            message: string;
            timestamp: Date;
        }> = [];

        for (const u of newUsers) {
            // Nếu user vừa tạo và bị inactive ngay → bỏ qua, sẽ xuất hiện ở blocked
            if (u.isActive) {
                activities.push({
                    id: `signup-${u.id}`,
                    type: 'signup',
                    message: `Người dùng mới đăng ký: ${u.email}`,
                    timestamp: u.createdAt,
                });
            }
        }

        for (const u of blockedUsers) {
            activities.push({
                id: `block-${u.id}`,
                type: 'block',
                message: `Tài khoản ${u.email} đã bị khóa`,
                timestamp: u.updatedAt,
            });
        }

        for (const cfg of configChanges) {
            const keyLabel = cfg.key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());
            activities.push({
                id: `config-${cfg.key}`,
                type: 'config',
                message: `Quản trị viên cập nhật cấu hình: ${keyLabel}`,
                timestamp: cfg.updatedAt,
            });
        }

        // Sort desc và giới hạn
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const limited = activities.slice(0, limit);

        // Chuyển timestamp thành chuỗi "X phút trước"
        const now = Date.now();
        return limited.map((act) => ({
            id: act.id,
            type: act.type,
            message: act.message,
            timestamp: this.formatRelativeTime(act.timestamp, now),
            rawTimestamp: act.timestamp.toISOString(),
        }));
    }

    private formatRelativeTime(date: Date, now: number): string {
        const diffMs = now - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);

        if (diffMin < 1) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHour < 24) return `${diffHour} giờ trước`;
        return `${Math.floor(diffHour / 24)} ngày trước`;
    }

    // ─── SYSTEM CONFIGS ───────────────────────────────────────

    async getConfigs() {
        return this.prisma.systemConfig.findMany({
            orderBy: { key: 'asc' },
        });
    }

    async updateConfigs(configs: { key: string; value: string }[], adminId: string) {
        // Validate: nếu đang cập nhật trọng số priority, kiểm tra tổng ≈ 1
        this.validateWeightSums(configs);

        const results: any[] = [];
        for (const config of configs) {
            const result = await this.prisma.systemConfig.upsert({
                where: { key: config.key },
                update: { value: config.value, updatedBy: adminId },
                create: { key: config.key, value: config.value, updatedBy: adminId },
            });
            results.push(result);
        }

        return results;
    }

    /**
     * Validate tổng trọng số priority (w1-w5) và procrastination (u1-u5) ≈ 1
     */
    private validateWeightSums(configs: { key: string; value: string }[]) {
        const priorityKeys = [
            'priority_weight_urgency',
            'priority_weight_importance',
            'priority_weight_deadline_pressure',
            'priority_weight_energy_fit',
            'priority_weight_procrastination_risk',
        ];

        const procrastKeys = [
            'procrastination_weight_delay_rate',
            'procrastination_weight_deadline_miss',
            'procrastination_weight_idle_days',
            'procrastination_weight_reschedule',
            'procrastination_weight_duration_accuracy',
        ];

        this.checkWeightGroup(configs, priorityKeys, 'Priority Score');
        this.checkWeightGroup(configs, procrastKeys, 'Procrastination Score');
    }

    private checkWeightGroup(
        configs: { key: string; value: string }[],
        keys: string[],
        groupName: string,
    ) {
        const updatedKeys = configs.filter((c) => keys.includes(c.key));
        if (updatedKeys.length === 0) return; // Không đang update nhóm này

        if (updatedKeys.length !== keys.length) {
            throw new BadRequestException(
                `Khi cập nhật trọng số ${groupName}, cần cung cấp đủ ${keys.length} trọng số`,
            );
        }

        const sum = updatedKeys.reduce((s, c) => s + parseFloat(c.value), 0);
        if (Math.abs(sum - 1) > 0.01) {
            throw new BadRequestException(
                `Tổng trọng số ${groupName} phải bằng 1 (hiện tại: ${sum.toFixed(4)})`,
            );
        }
    }
}
