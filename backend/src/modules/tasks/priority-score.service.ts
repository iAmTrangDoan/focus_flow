import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Importance, Task } from '@prisma/client';

/**
 * Tính Priority Score cho task theo công thức:
 * PS = w1*Urgency + w2*Importance + w3*DeadlinePressure + w4*EnergyFit + w5*ProcrastinationRisk
 *
 * Mỗi thành phần chuẩn hóa [0, 10], trọng số tổng = 1 → PS ∈ [0, 10]
 */
@Injectable()
export class PriorityScoreService {
    // Trọng số mặc định
    private w1 = 0.25; // Urgency
    private w2 = 0.25; // Importance
    private w3 = 0.20; // DeadlinePressure
    private w4 = 0.15; // EnergyFit
    private w5 = 0.15; // ProcrastinationRisk
    private dMax = 14; // Ngưỡng ngày cho Urgency

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Load trọng số từ system_configs (nếu có), fallback về mặc định.
     */
    async loadWeights(): Promise<void> {
        const configs = await this.prisma.systemConfig.findMany({
            where: {
                key: {
                    in: [
                        'priority_weight_urgency',
                        'priority_weight_importance',
                        'priority_weight_deadline_pressure',
                        'priority_weight_energy_fit',
                        'priority_weight_procrastination_risk',
                        'urgency_d_max',
                    ],
                },
            },
        });

        const configMap = new Map(configs.map((c) => [c.key, c.value]));
        this.w1 = parseFloat(configMap.get('priority_weight_urgency') ?? '0.25');
        this.w2 = parseFloat(configMap.get('priority_weight_importance') ?? '0.25');
        this.w3 = parseFloat(configMap.get('priority_weight_deadline_pressure') ?? '0.20');
        this.w4 = parseFloat(configMap.get('priority_weight_energy_fit') ?? '0.15');
        this.w5 = parseFloat(configMap.get('priority_weight_procrastination_risk') ?? '0.15');
        this.dMax = parseFloat(configMap.get('urgency_d_max') ?? '14');
    }

    /**
     * Tính Priority Score cho 1 task, trả về score + breakdown.
     */
    async calculate(task: Task): Promise<{
        score: number;
        breakdown: {
            urgency: number;
            importance: number;
            deadlinePressure: number;
            energyFit: number;
            procrastinationRisk: number;
        };
    }> {
        await this.loadWeights();

        const urgency = this.calcUrgency(task.deadline);
        const importance = this.calcImportance(task.importance, task.deadline);
        const deadlinePressure = await this.calcDeadlinePressure(task);
        const energyFit = await this.calcEnergyFit(task.userId);
        const procrastinationRisk = 5; // Mặc định trung lập — cần Analytics module

        const score =
            this.w1 * urgency +
            this.w2 * importance +
            this.w3 * deadlinePressure +
            this.w4 * energyFit +
            this.w5 * procrastinationRisk;

        return {
            score: Math.round(score * 100) / 100,
            breakdown: { urgency, importance, deadlinePressure, energyFit, procrastinationRisk },
        };
    }

    /**
     * (1) Urgency — deadline còn bao lâu?
     */
    private calcUrgency(deadline: Date | null): number {
        if (!deadline) return 0;
        const now = new Date();
        const daysLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        if (daysLeft <= 0) return 10;
        if (daysLeft > this.dMax) return 0;
        return Math.round((10 - (daysLeft / this.dMax) * 10) * 100) / 100;
    }

    /**
     * (2) Importance — dựa theo ma trận Eisenhower suy từ importance + deadline
     */
    private calcImportance(importance: Importance, deadline: Date | null): number {
        const isUrgent = deadline
            ? (deadline.getTime() - Date.now()) / (1000 * 60 * 60) <= 48
            : false;

        if (importance === 'HIGH' && isUrgent) return 10;  // Q1
        if (importance === 'HIGH' && !isUrgent) return 7;  // Q2
        if (importance === 'LOW' && isUrgent) return 4;    // Q3
        return 1; // Q4
    }

    /**
     * (3) DeadlinePressure — remaining work vs time left
     */
    private async calcDeadlinePressure(task: Task): Promise<number> {
        if (!task.deadline) return 0;

        const estimatedMinutes = task.estimatedMinutes ?? 0;
        if (estimatedMinutes <= 0) return 0;

        // Tổng thời lượng đã thực hiện qua pomodoro sessions
        const sessions = await this.prisma.pomodoroSession.aggregate({
            _sum: { actualDuration: true },
            where: {
                taskId: task.id,
                status: 'COMPLETED',
            },
        });

        const workedMinutes = sessions._sum.actualDuration ?? 0;
        const remainingWork = Math.max(0, estimatedMinutes - workedMinutes);
        if (remainingWork <= 0) return 0;

        const timeLeftMinutes = (task.deadline.getTime() - Date.now()) / (1000 * 60);
        if (timeLeftMinutes <= 0) return 10;

        const ratio = remainingWork / timeLeftMinutes;
        return Math.min(10, Math.round(ratio * 10 * 100) / 100);
    }

    /**
     * (4) EnergyFit
     * - User có đủ data (is_cold_start=false) → dùng dữ liệu từ behavior_profiles.peak_hours
     * - User mới (cold start) → dùng mặc định
     * - Nhân windowFactor: 1.0 nếu trong giờ làm, 0.5 nếu ngoài
     *
     * Điều kiện thoát cold start: total_pomodoros >= 10 AND active_days >= 3
     * (cập nhật bởi Cron Job cuối ngày trong behavior module)
     */
    private async calcEnergyFit(userId: string): Promise<number> {
        const currentHour = new Date().getHours();

        // Load user preferences
        const prefs = await this.prisma.userPreference.findUnique({ where: { userId } });
        const [startH] = (prefs?.workStartTime ?? '09:00').split(':').map(Number);
        const [endH] = (prefs?.workEndTime ?? '18:00').split(':').map(Number);

        // Check behavior profile cho personal heatmap
        const profile = await this.prisma.behaviorProfile.findUnique({ where: { userId } });

        let score: number;

        if (profile && !profile.isColdStart && profile.peakHours) {
            // User có đủ data (≥10 phiên, ≥3 ngày)
            const heatmap = profile.peakHours as Record<string, number>;
            const hourKey = currentHour.toString();
            score = (heatmap[hourKey] ?? 0.5) * 10;
        } else {
            // User mới
            score = this.genericEnergyCurve(currentHour);
        }

        // Window factor: trong giờ làm = 1.0, ngoài = 0.5
        const inWorkWindow = currentHour >= startH && currentHour < endH;
        const windowFactor = inWorkWindow ? 1.0 : 0.5;

        return Math.min(10, Math.round(score * windowFactor * 100) / 100);
    }

    /**
     * Generic energy curve dựa trên circadian rhythm.
     * Dùng cho user mới chưa có đủ data (≥10 phiên Pomodoro, ≥3 ngày).
     */
    private genericEnergyCurve(hour: number): number {
        if (hour >= 9 && hour <= 11) return 9;    // Peak morning
        if (hour >= 14 && hour <= 16) return 7;   // Afternoon recovery
        if (hour >= 7 && hour <= 8) return 7;     // Early morning warmup
        if (hour >= 12 && hour <= 13) return 5;   // Post-lunch dip
        if (hour >= 17 && hour <= 19) return 6;   // Late afternoon
        if (hour >= 20 && hour <= 22) return 4;   // Evening wind-down
        return 3;                                  // Night / early dawn
    }
}
