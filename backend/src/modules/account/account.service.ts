import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { EventType } from '@prisma/client';

@Injectable()
export class AccountService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Lấy thông tin profile (displayName, email)
     */
    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                role: true,
            },
        });

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        return user;
    }

    /**
     * Cập nhật thông tin profile (displayName)
     */
    async updateProfile(userId: string, displayName: string) {
        if (!displayName || displayName.trim() === '') {
            throw new BadRequestException('Tên hiển thị không được để trống');
        }

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { displayName: displayName.trim() },
        });

        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
        };
    }

    /**
     * Đổi mật khẩu
     */
    async changePassword(userId: string, current: string, next: string) {
        if (!current || !next) {
            throw new BadRequestException('Thiếu mật khẩu cũ hoặc mật khẩu mới');
        }
        if (next.length < 6) {
            throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        const isMatch = await bcrypt.compare(current, user.passwordHash);
        if (!isMatch) {
            throw new BadRequestException('Mật khẩu hiện tại không đúng');
        }

        const newHash = await bcrypt.hash(next, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });

        return { message: 'Cập nhật mật khẩu thành công' };
    }

    /**
     * Lấy danh sách activity logs (BehaviorLog)
     */
    async getActivityLogs(userId: string, filterType?: string) {
        // Map filterType từ client ('task', 'pomodoro', 'schedule', 'ai') sang EventTypes tương ứng
        let eventTypes: EventType[] = [];

        if (filterType === 'task') {
            eventTypes = [
                EventType.TASK_CREATED,
                EventType.TASK_COMPLETED,
                EventType.TASK_DELAYED,
                EventType.TASK_DROPPED,
                EventType.TASK_STARTED_LATE,
            ];
        } else if (filterType === 'pomodoro') {
            eventTypes = [
                EventType.POMODORO_COMPLETED,
                EventType.POMODORO_PAUSED,
                EventType.POMODORO_DROPPED,
            ];
        } else if (filterType === 'schedule') {
            eventTypes = [
                EventType.TASK_RESCHEDULED,
                EventType.RESCHEDULE_PENALTY,
            ];
        }

        const logs = await this.prisma.behaviorLog.findMany({
            where: {
                userId,
                ...(eventTypes.length > 0 && { eventType: { in: eventTypes } }),
            },
            include: {
                task: {
                    select: {
                        title: true,
                    },
                },
            },
            orderBy: { occurredAt: 'desc' },
            take: 50,
        });

        // Áp dụng định dạng để client hiển thị đúng
        const items = logs.map((log) => {
            let type = 'task';
            let title = 'Hoạt động';
            let description = '';

            const taskTitle = log.task?.title || 'Công việc không xác định';

            switch (log.eventType) {
                case EventType.TASK_CREATED:
                    type = 'task';
                    title = 'Tạo công việc';
                    description = `Đã tạo công việc mới: "${taskTitle}"`;
                    break;
                case EventType.TASK_COMPLETED:
                    type = 'task';
                    title = 'Hoàn thành công việc';
                    description = `Đã hoàn thành công việc: "${taskTitle}"`;
                    break;
                case EventType.TASK_DELAYED:
                    type = 'task';
                    title = 'Trì hoãn công việc';
                    description = `Công việc "${taskTitle}" bị hoãn lại`;
                    break;
                case EventType.TASK_DROPPED:
                    type = 'task';
                    title = 'Bỏ công việc';
                    description = `Đã huỷ/bỏ công việc: "${taskTitle}"`;
                    break;
                case EventType.TASK_STARTED_LATE:
                    type = 'task';
                    title = 'Bắt đầu muộn';
                    description = `Bắt đầu công việc "${taskTitle}" muộn so với lịch hẹn`;
                    break;
                case EventType.POMODORO_COMPLETED:
                    type = 'pomodoro';
                    title = 'Hoàn thành Pomodoro';
                    description = `Hoàn thành phiên Pomodoro cho công việc "${taskTitle}"`;
                    break;
                case EventType.POMODORO_PAUSED:
                    type = 'pomodoro';
                    title = 'Tạm dừng Pomodoro';
                    description = `Đã tạm dừng phiên Pomodoro của "${taskTitle}"`;
                    break;
                case EventType.POMODORO_DROPPED:
                    type = 'pomodoro';
                    title = 'Bỏ ngang Pomodoro';
                    const reason = (log.metadata as any)?.dropReason || 'không rõ lý do';
                    description = `Bỏ ngang phiên Pomodoro của "${taskTitle}" do ${reason}`;
                    break;
                case EventType.TASK_RESCHEDULED:
                    type = 'schedule';
                    title = 'Dời lịch trình';
                    description = `Thay đổi lịch của công việc "${taskTitle}"`;
                    break;
                case EventType.RESCHEDULE_PENALTY:
                    type = 'schedule';
                    title = 'Tái cấu trúc';
                    description = `Thực hiện tái cấu trúc lịch, cộng điểm phạt tần suất đổi lịch`;
                    break;
            }

            return {
                id: log.id,
                type,
                title,
                description,
                occurredAt: log.occurredAt.toISOString(),
                createdAt: log.createdAt.toISOString(),
            };
        });

        return { items };
    }
}
