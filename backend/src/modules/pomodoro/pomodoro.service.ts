import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PomodoroStatus, PomodoroSessionType, FocusMode } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PomodoroService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ) {}

    /**
     * Bắt đầu phiên Pomodoro mới.
     * - Chỉ cho phép 1 phiên IN_PROGRESS tại 1 thời điểm.
     * - plannedDuration dựa theo focusMode của task.
     */
    async startSession(userId: string, taskId: string, sessionType?: PomodoroSessionType) {
        // Kiểm tra không có phiên đang chạy
        const activeSession = await this.prisma.pomodoroSession.findFirst({
            where: { userId, status: PomodoroStatus.IN_PROGRESS },
        });
        if (activeSession) {
            throw new BadRequestException('Đang có phiên Pomodoro đang chạy. Hãy hoàn thành hoặc hủy trước.');
        }

        // Kiểm tra task tồn tại và thuộc user
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task không tồn tại');
        if (task.userId !== userId) throw new ForbiddenException('Không có quyền');
        if (task.status === 'DONE') {
            throw new BadRequestException('Task đã hoàn thành, không thể bắt đầu phiên mới');
        }

        // Xác định planned duration từ focusMode
        const type = sessionType ?? PomodoroSessionType.WORK;
        const plannedDuration = this.getPlannedDuration(task.focusMode, type);

        // Cập nhật task status sang IN_PROGRESS nếu đang TODO
        if (task.status === 'TODO') {
            await this.prisma.task.update({
                where: { id: taskId },
                data: { status: 'IN_PROGRESS' },
            });
        }

        return this.prisma.pomodoroSession.create({
            data: {
                userId,
                taskId,
                sessionType: type,
                plannedDuration,
                status: PomodoroStatus.IN_PROGRESS,
            },
            include: { task: { select: { id: true, title: true, focusMode: true } } },
        });
    }

    async getCurrentSession(userId: string) {
        const session = await this.prisma.pomodoroSession.findFirst({
            where: { userId, status: PomodoroStatus.IN_PROGRESS },
            include: { task: { select: { id: true, title: true, focusMode: true } } },
        });
        return session ?? null;
    }

    async getHistory(userId: string, status?: PomodoroStatus) {
        return this.prisma.pomodoroSession.findMany({
            where: {
                userId,
                ...(status && { status }),
            },
            include: { task: { select: { id: true, title: true } } },
            orderBy: { startedAt: 'desc' },
            take: 50,
        });
    }

    async pauseSession(userId: string, sessionId: string) {
        const session = await this.ensureSessionOwnership(userId, sessionId);
        if (session.status !== PomodoroStatus.IN_PROGRESS) {
            throw new BadRequestException('Phiên không ở trạng thái đang chạy');
        }

        return this.prisma.pomodoroSession.update({
            where: { id: sessionId },
            data: {
                status: PomodoroStatus.PAUSED,
                pauseCount: { increment: 1 },
            },
        });
    }

    async resumeSession(userId: string, sessionId: string) {
        const session = await this.ensureSessionOwnership(userId, sessionId);
        if (session.status !== PomodoroStatus.PAUSED) {
            throw new BadRequestException('Phiên không ở trạng thái tạm dừng');
        }

        return this.prisma.pomodoroSession.update({
            where: { id: sessionId },
            data: { status: PomodoroStatus.IN_PROGRESS },
        });
    }

    async completeSession(userId: string, sessionId: string) {
        const session = await this.ensureSessionOwnership(userId, sessionId);
        if (session.status !== PomodoroStatus.IN_PROGRESS && session.status !== PomodoroStatus.PAUSED) {
            throw new BadRequestException('Phiên không thể hoàn thành từ trạng thái hiện tại');
        }

        const now = new Date();
        const actualDuration = Math.round(
            (now.getTime() - session.startedAt.getTime()) / (1000 * 60),
        );

        const updated = await this.prisma.pomodoroSession.update({
            where: { id: sessionId },
            data: {
                status: PomodoroStatus.COMPLETED,
                endedAt: now,
                actualDuration,
            },
            include: { task: { select: { id: true, title: true } } },
        });

        // Tạo thông báo hoàn thành Pomodoro
        const taskTitle = updated.task?.title ?? 'Công việc';
        await this.notificationService.createNotification(
            userId,
            'pomodoro',
            'Hoàn thành Pomodoro!',
            `Bạn đã hoàn thành phiên tập trung ${actualDuration} phút cho task "${taskTitle}".`
        );

        return updated;
    }

    async cancelSession(userId: string, sessionId: string) {
        const session = await this.ensureSessionOwnership(userId, sessionId);
        if (session.status === PomodoroStatus.COMPLETED || session.status === PomodoroStatus.CANCELLED) {
            throw new BadRequestException('Phiên đã kết thúc');
        }

        const now = new Date();
        const actualDuration = Math.round(
            (now.getTime() - session.startedAt.getTime()) / (1000 * 60),
        );

        const updated = await this.prisma.pomodoroSession.update({
            where: { id: sessionId },
            data: {
                status: PomodoroStatus.CANCELLED,
                endedAt: now,
                actualDuration,
            },
            include: { task: { select: { id: true, title: true } } },
        });

        // Tạo thông báo hủy Pomodoro
        const taskTitle = updated.task?.title ?? 'Công việc';
        await this.notificationService.createNotification(
            userId,
            'pomodoro',
            'Đã hủy phiên Pomodoro',
            `Phiên tập trung cho task "${taskTitle}" đã bị dừng giữa chừng.`
        );

        return updated;
    }

    async quickFeedback(userId: string, sessionId: string, reason: string) {
        const session = await this.ensureSessionOwnership(userId, sessionId);
        if (session.status !== PomodoroStatus.CANCELLED) {
            throw new BadRequestException('Quick feedback chỉ áp dụng cho phiên đã hủy');
        }

        return this.prisma.pomodoroSession.update({
            where: { id: sessionId },
            data: { dropReason: reason },
        });
    }

    // ─── HELPERS ───────────────────────────────────────────────

    private getPlannedDuration(focusMode: FocusMode, sessionType: PomodoroSessionType): number {
        if (sessionType === PomodoroSessionType.BREAK) {
            return focusMode === FocusMode.DEEP_FOCUS ? 10 : 5;
        }
        return focusMode === FocusMode.DEEP_FOCUS ? 50 : 25;
    }

    private async ensureSessionOwnership(userId: string, sessionId: string) {
        const session = await this.prisma.pomodoroSession.findUnique({
            where: { id: sessionId },
        });
        if (!session) throw new NotFoundException('Phiên Pomodoro không tồn tại');
        if (session.userId !== userId) throw new ForbiddenException('Không có quyền');
        return session;
    }
}
