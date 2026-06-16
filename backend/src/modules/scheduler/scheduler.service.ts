import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FocusMode } from '@prisma/client';

@Injectable()
export class SchedulerService {
    // Giờ làm việc mặc định (8h-22h)
    private readonly WORK_START_HOUR = 8;
    private readonly WORK_END_HOUR = 22;

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Greedy Scheduling: tạo lịch tuần cho user.
     * 1. Lấy tasks chưa xong, sort theo priorityScore giảm dần
     * 2. Xác định khung giờ trống trong tuần
     * 3. Chia mỗi task/subtask thành pomodoro slots
     * 4. Lắp greedy vào slots trống
     */
    async generateWeekly(userId: string) {
        // Xóa slots cũ do hệ thống tạo (giữ lại slots manual)
        const weekStart = this.getWeekStart();
        const weekEnd = this.getWeekEnd(weekStart);

        await this.prisma.scheduleSlot.deleteMany({
            where: {
                userId,
                isManual: false,
                startAt: { gte: weekStart, lt: weekEnd },
            },
        });

        // Lấy tasks chưa hoàn thành, sort theo priority score
        const tasks = await this.prisma.task.findMany({
            where: {
                userId,
                status: { in: ['TODO', 'IN_PROGRESS'] },
            },
            include: { subtasks: { where: { isCompleted: false }, orderBy: { sortOrder: 'asc' } } },
            orderBy: { priorityScore: 'desc' },
        });

        if (tasks.length === 0) {
            return { message: 'Không có task cần lập lịch', slots: [] };
        }

        // Lấy existing manual slots để tránh conflict
        const existingSlots = await this.prisma.scheduleSlot.findMany({
            where: {
                userId,
                startAt: { gte: weekStart, lt: weekEnd },
            },
            orderBy: { startAt: 'asc' },
        });

        // Tạo danh sách khung giờ trống
        const freeSlots = this.buildFreeSlots(weekStart, weekEnd, existingSlots);

        // Lắp tasks vào slots
        const newSlots: { userId: string; taskId: string; startAt: Date; endAt: Date }[] = [];
        let slotIndex = 0;

        for (const task of tasks) {
            const { workMinutes, breakMinutes } = this.getFocusDuration(task.focusMode);

            // Xác định tổng thời gian cần: subtasks nếu có, không thì estimatedMinutes
            const workUnits = this.getWorkUnits(task, workMinutes);

            for (const unitMinutes of workUnits) {
                // Chia unit thành pomodoro sessions
                let remainingMinutes = unitMinutes;

                while (remainingMinutes > 0 && slotIndex < freeSlots.length) {
                    const slot = freeSlots[slotIndex];
                    const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);

                    if (slotDuration < workMinutes) {
                        // Slot quá ngắn, bỏ qua
                        slotIndex++;
                        continue;
                    }

                    const sessionMinutes = Math.min(remainingMinutes, workMinutes);
                    const endAt = new Date(slot.start.getTime() + sessionMinutes * 60 * 1000);

                    newSlots.push({
                        userId,
                        taskId: task.id,
                        startAt: new Date(slot.start),
                        endAt,
                    });

                    remainingMinutes -= sessionMinutes;

                    // Cập nhật slot start (thêm break time sau work)
                    const totalUsed = sessionMinutes + breakMinutes;
                    slot.start = new Date(slot.start.getTime() + totalUsed * 60 * 1000);

                    if ((slot.end.getTime() - slot.start.getTime()) / (1000 * 60) < workMinutes) {
                        slotIndex++;
                    }
                }
            }
        }

        // Bulk insert
        if (newSlots.length > 0) {
            await this.prisma.scheduleSlot.createMany({ data: newSlots });
        }

        // Return created slots
        const createdSlots = await this.prisma.scheduleSlot.findMany({
            where: { userId, startAt: { gte: weekStart, lt: weekEnd } },
            include: { task: { select: { id: true, title: true, focusMode: true } } },
            orderBy: { startAt: 'asc' },
        });

        return { slots: createdSlots };
    }

    async getWeeklySchedule(userId: string) {
        const weekStart = this.getWeekStart();
        const weekEnd = this.getWeekEnd(weekStart);

        return this.prisma.scheduleSlot.findMany({
            where: {
                userId,
                startAt: { gte: weekStart, lt: weekEnd },
            },
            include: { task: { select: { id: true, title: true, status: true, focusMode: true } } },
            orderBy: { startAt: 'asc' },
        });
    }

    async getSlots(userId: string, from?: string, to?: string) {
        const where: any = { userId };
        if (from || to) {
            where.startAt = {};
            if (from) where.startAt.gte = new Date(from);
            if (to) where.startAt.lte = new Date(to);
        }

        return this.prisma.scheduleSlot.findMany({
            where,
            include: { task: { select: { id: true, title: true, status: true } } },
            orderBy: { startAt: 'asc' },
        });
    }

    async updateSlot(userId: string, slotId: string, startAt: string, endAt: string) {
        const slot = await this.ensureSlotOwnership(userId, slotId);

        const newStart = new Date(startAt);
        const newEnd = new Date(endAt);

        if (newEnd <= newStart) {
            throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
        }

        // Kiểm tra xung đột
        const conflict = await this.prisma.scheduleSlot.findFirst({
            where: {
                userId,
                id: { not: slotId },
                startAt: { lt: newEnd },
                endAt: { gt: newStart },
            },
        });

        if (conflict) {
            throw new BadRequestException('Xung đột thời gian với slot khác');
        }

        return this.prisma.scheduleSlot.update({
            where: { id: slotId },
            data: { startAt: newStart, endAt: newEnd, isManual: true },
            include: { task: { select: { id: true, title: true } } },
        });
    }

    async removeSlot(userId: string, slotId: string) {
        await this.ensureSlotOwnership(userId, slotId);
        await this.prisma.scheduleSlot.delete({ where: { id: slotId } });
        return { message: 'Xóa slot thành công' };
    }

    /**
     * Tái cấu trúc lịch: tính lại từ thời điểm hiện tại.
     * +1 rescheduleCount cho tất cả tasks bị dời.
     */
    async restructure(userId: string) {
        // Ghi +1 reschedule cho các task có slot từ now trở đi
        const now = new Date();

        const affectedSlots = await this.prisma.scheduleSlot.findMany({
            where: { userId, startAt: { gte: now }, isManual: false },
            select: { taskId: true },
        });

        const taskIds = [...new Set(affectedSlots.map((s) => s.taskId))];
        if (taskIds.length > 0) {
            await this.prisma.task.updateMany({
                where: { id: { in: taskIds } },
                data: { rescheduleCount: { increment: 1 } },
            });
        }

        // Xóa slots tự động từ now và generate lại
        await this.prisma.scheduleSlot.deleteMany({
            where: { userId, startAt: { gte: now }, isManual: false },
        });

        return this.generateWeekly(userId);
    }

    // ─── HELPERS ───────────────────────────────────────────────

    private getFocusDuration(focusMode: FocusMode) {
        if (focusMode === FocusMode.DEEP_FOCUS) {
            return { workMinutes: 50, breakMinutes: 10 };
        }
        return { workMinutes: 25, breakMinutes: 5 };
    }

    /**
     * Trả danh sách work units (phút) cho 1 task.
     * Nếu có subtasks → mỗi subtask là 1 unit.
     * Nếu không → estimatedMinutes là 1 unit.
     */
    private getWorkUnits(
        task: { estimatedMinutes: number | null; subtasks: { estimatedMinutes: number | null }[] },
        defaultMinutes: number,
    ): number[] {
        if (task.subtasks.length > 0) {
            return task.subtasks.map((st) => st.estimatedMinutes ?? defaultMinutes);
        }
        return [task.estimatedMinutes ?? defaultMinutes];
    }

    /**
     * Xây dựng danh sách khung giờ trống trong tuần.
     */
    private buildFreeSlots(
        weekStart: Date,
        weekEnd: Date,
        existingSlots: { startAt: Date; endAt: Date }[],
    ): { start: Date; end: Date }[] {
        const freeSlots: { start: Date; end: Date }[] = [];

        // Tạo khung giờ cho từng ngày trong tuần
        const current = new Date(weekStart);
        while (current < weekEnd) {
            const dayStart = new Date(current);
            dayStart.setHours(this.WORK_START_HOUR, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(this.WORK_END_HOUR, 0, 0, 0);

            // Bỏ qua khung giờ đã qua
            const now = new Date();
            const effectiveStart = dayStart < now ? now : dayStart;

            if (effectiveStart < dayEnd) {
                freeSlots.push({ start: new Date(effectiveStart), end: new Date(dayEnd) });
            }

            current.setDate(current.getDate() + 1);
        }

        // Trừ đi existing slots
        const result: { start: Date; end: Date }[] = [];
        for (const free of freeSlots) {
            let segments = [{ start: new Date(free.start), end: new Date(free.end) }];

            for (const existing of existingSlots) {
                const newSegments: { start: Date; end: Date }[] = [];
                for (const seg of segments) {
                    if (existing.endAt <= seg.start || existing.startAt >= seg.end) {
                        newSegments.push(seg);
                    } else {
                        if (existing.startAt > seg.start) {
                            newSegments.push({ start: seg.start, end: new Date(existing.startAt) });
                        }
                        if (existing.endAt < seg.end) {
                            newSegments.push({ start: new Date(existing.endAt), end: seg.end });
                        }
                    }
                }
                segments = newSegments;
            }
            result.push(...segments);
        }

        return result;
    }

    private getWeekStart(): Date {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
        const monday = new Date(now);
        monday.setDate(now.getDate() - diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    private getWeekEnd(weekStart: Date): Date {
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 7);
        return end;
    }

    private async ensureSlotOwnership(userId: string, slotId: string) {
        const slot = await this.prisma.scheduleSlot.findUnique({ where: { id: slotId } });
        if (!slot) throw new NotFoundException('Slot không tồn tại');
        if (slot.userId !== userId) throw new ForbiddenException('Không có quyền');
        return slot;
    }
}
