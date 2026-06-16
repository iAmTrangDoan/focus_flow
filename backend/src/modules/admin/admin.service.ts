import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) {}

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

        const [tasksToday, totalUsers, avgProcrastination] = await Promise.all([
            // Số task tạo hôm nay
            this.prisma.task.count({
                where: { createdAt: { gte: today } },
            }),
            // Tổng số users
            this.prisma.user.count(),
            // Procrastination Score trung bình (placeholder — cần Analytics module)
            Promise.resolve(null),
        ]);

        return {
            tasksCreatedToday: tasksToday,
            totalUsers,
            avgProcrastinationScore: avgProcrastination,
        };
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
