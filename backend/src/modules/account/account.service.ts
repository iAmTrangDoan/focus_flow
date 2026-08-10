import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { EventType, SlotStatus, RestructureStrategy, InsightStatus, ProcrastinationClassification, FocusMode } from '@prisma/client';

@Injectable()
export class AccountService {
    constructor(private readonly prisma: PrismaService) {}

    //Lấy thông tin profile (displayName, email)
     
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

    /**
     * Khởi tạo mockup data đầy đủ cho user hiện tại để hỗ trợ đánh giá hiển thị.
     */
    async seedMockData(userId: string) {
        // 1. Xóa toàn bộ dữ liệu giao dịch cũ của user để khởi tạo sạch sẽ
        await this.prisma.$transaction([
            this.prisma.scheduleSlot.deleteMany({ where: { userId } }),
            this.prisma.pomodoroSession.deleteMany({ where: { userId } }),
            this.prisma.behaviorLog.deleteMany({ where: { userId } }),
            this.prisma.procrastinationScore.deleteMany({ where: { userId } }),
            this.prisma.aiInsight.deleteMany({ where: { userId } }),
            this.prisma.behaviorProfile.deleteMany({ where: { userId } }),
            this.prisma.subtask.deleteMany({ where: { task: { userId } } }),
            this.prisma.task.deleteMany({ where: { userId } }),
        ]);

        // Xác định Thứ 2 tuần này trong giờ địa phương
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = CN, 1 = T2, ...
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(monday.getDate() - daysToMonday);
        monday.setHours(0, 0, 0, 0);

        const getDayAtTime = (dayOffset: number, hours: number, minutes = 0) => {
            const date = new Date(monday);
            date.setDate(date.getDate() + dayOffset);
            date.setHours(hours, minutes, 0, 0);
            return date;
        };

        // Seed UserPreference (upsert)
        await this.prisma.userPreference.upsert({
            where: { userId },
            update: {
                workStartTime: '08:00',
                workEndTime: '22:00',
                workDays: [1, 2, 3, 4, 5, 6, 7],
                mainGoal: 'personal_growth',
            },
            create: {
                userId,
                workStartTime: '08:00',
                workEndTime: '22:00',
                workDays: [1, 2, 3, 4, 5, 6, 7],
                mainGoal: 'personal_growth',
            },
        });

        // 2. Seed Tasks và Subtasks
        // Task 1: High priority Backend task
        const task1 = await this.prisma.task.create({
            data: {
                userId,
                title: 'Xây dựng Backend API FocusFlow',
                description: 'Lập trình các endpoint backend và viết unit test',
                deadline: getDayAtTime(6, 17, 0), // Chủ Nhật tuần này 17:00
                importance: 'HIGH',
                focusMode: 'DEEP_FOCUS',
                estimatedMinutes: 120,
                status: 'IN_PROGRESS',
            }
        });

        await this.prisma.subtask.createMany({
            data: [
                { taskId: task1.id, title: 'Thiết kế database schema', estimatedMinutes: 25, isCompleted: true, sortOrder: 0 },
                { taskId: task1.id, title: 'Cài đặt JWT Auth & Middleware', estimatedMinutes: 25, isCompleted: true, sortOrder: 1 },
                { taskId: task1.id, title: 'Lập trình scheduler algorithm', estimatedMinutes: 50, isCompleted: false, sortOrder: 2 },
            ]
        });

        // Task 2: High priority UI task
        const task2 = await this.prisma.task.create({
            data: {
                userId,
                title: 'Thiết kế UI/UX Frontend',
                description: 'Nghiên cứu Next.js và thiết kế giao diện lịch tuần kéo thả',
                deadline: getDayAtTime(6, 18, 0), // Chủ Nhật tuần này 18:00
                importance: 'HIGH',
                focusMode: FocusMode.STANDARD,
                estimatedMinutes: 90,
                status: 'TODO',
            }
        });

        await this.prisma.subtask.createMany({
            data: [
                { taskId: task2.id, title: 'Vẽ mockup Dashboard & Calendar', estimatedMinutes: 30, isCompleted: true, sortOrder: 0 },
                { taskId: task2.id, title: 'Code component Lịch tuần kéo thả', estimatedMinutes: 60, isCompleted: false, sortOrder: 1 },
            ]
        });

        // Task 3: Low priority standard task
        const task3 = await this.prisma.task.create({
            data: {
                userId,
                title: 'Nghiên cứu Next.js Server Components',
                description: 'Nghiên cứu cơ chế App Router và Server Component',
                deadline: getDayAtTime(13, 17, 0), // Chủ Nhật tuần tới 17:00
                importance: 'LOW',
                focusMode: 'STANDARD',
                estimatedMinutes: 45,
                status: 'TODO',
            }
        });

        // Task 4: Completed task (deadline yesterday)
        const task4 = await this.prisma.task.create({
            data: {
                userId,
                title: 'Viết báo cáo kỹ thuật dự án',
                description: 'Tài liệu kiến trúc hệ thống và đặc tả API',
                deadline: getDayAtTime(-1, 17, 0), // Hôm qua 17:00
                completedAt: getDayAtTime(-1, 16, 0),
                importance: 'LOW',
                focusMode: 'STANDARD',
                estimatedMinutes: 60,
                status: 'DONE',
            }
        });

        // Task 5: Completed daily task (no deadline)
        const task5 = await this.prisma.task.create({
            data: {
                userId,
                title: 'Luyện tập thể thao hàng ngày',
                description: 'Chạy bộ 3km hoặc tập gym',
                completedAt: getDayAtTime(0, 18, 0), // Thứ 2 tuần này 18:00
                importance: 'LOW',
                focusMode: 'STANDARD',
                estimatedMinutes: 30,
                status: 'DONE',
            }
        });

        // Truy vấn lại danh sách subtasks để lấy ID phục vụ lập lịch
        const subtasks1 = await this.prisma.subtask.findMany({ where: { taskId: task1.id } });
        const subtasks2 = await this.prisma.subtask.findMany({ where: { taskId: task2.id } });


        const slotData = [
            // Các slot đã hoàn thành
            {
                userId,
                taskId: task4.id,
                subtaskId: null,
                startAt: getDayAtTime(-1, 15, 0),
                endAt: getDayAtTime(-1, 16, 0),
                isManual: false,
                status: SlotStatus.COMPLETED,
                restructureStrategy: RestructureStrategy.NONE,
            },
            {
                userId,
                taskId: task5.id,
                subtaskId: null,
                startAt: getDayAtTime(0, 17, 30),
                endAt: getDayAtTime(0, 18, 0),
                isManual: false,
                status: SlotStatus.COMPLETED,
                restructureStrategy: RestructureStrategy.NONE,
            },
            {
                userId,
                taskId: task1.id,
                subtaskId: subtasks1.find(s => s.title === 'Thiết kế database schema')?.id || null,
                startAt: getDayAtTime(1, 10, 0),
                endAt: getDayAtTime(1, 10, 30),
                isManual: false,
                status: SlotStatus.COMPLETED,
                restructureStrategy: RestructureStrategy.NONE,
            },
            {
                userId,
                taskId: task1.id,
                subtaskId: subtasks1.find(s => s.title === 'Cài đặt JWT Auth & Middleware')?.id || null,
                startAt: getDayAtTime(1, 10, 30),
                endAt: getDayAtTime(1, 11, 0),
                isManual: false,
                status: SlotStatus.COMPLETED,
                restructureStrategy: RestructureStrategy.NONE,
            },
            {
                userId,
                taskId: task2.id,
                subtaskId: subtasks2.find(s => s.title === 'Vẽ mockup Dashboard & Calendar')?.id || null,
                startAt: getDayAtTime(2, 14, 0),
                endAt: getDayAtTime(2, 14, 30),
                isManual: false,
                status: SlotStatus.COMPLETED,
                restructureStrategy: RestructureStrategy.NONE,
            },
            // Các slot trong tương lai / Hiện tại chưa hoàn thành
            {
                userId,
                taskId: task1.id,
                subtaskId: subtasks1.find(s => s.title === 'Lập trình scheduler algorithm')?.id || null,
                startAt: getDayAtTime(3, 9, 0),
                endAt: getDayAtTime(3, 10, 0),
                isManual: false,
                status: SlotStatus.SCHEDULED,
                restructureStrategy: RestructureStrategy.NONE,
            },
            {
                userId,
                taskId: task2.id,
                subtaskId: subtasks2.find(s => s.title === 'Code component Lịch tuần kéo thả')?.id || null,
                startAt: getDayAtTime(4, 11, 0),
                endAt: getDayAtTime(4, 12, 0),
                isManual: true, // Manual slot
                status: SlotStatus.SCHEDULED,
                restructureStrategy: RestructureStrategy.NONE,
            },
            {
                userId,
                taskId: task3.id,
                subtaskId: null,
                startAt: getDayAtTime(5, 15, 0),
                endAt: getDayAtTime(5, 15, 45),
                isManual: false,
                status: SlotStatus.SCHEDULED,
                restructureStrategy: RestructureStrategy.NONE,
            },
        ];

        const slotDataWithLogicalDate = slotData.map(slot => ({
            ...slot,
            logicalDate: new Date(new Date(slot.startAt).setUTCHours(0, 0, 0, 0)),
        }));

        await this.prisma.scheduleSlot.createMany({ data: slotDataWithLogicalDate });

        // 4. Seed Pomodoro Sessions
        const pomodoroData = [
            {
                userId,
                taskId: task1.id,
                subtaskId: subtasks1.find(s => s.title === 'Thiết kế database schema')?.id || null,
                sessionType: 'WORK' as const,
                status: 'COMPLETED' as const,
                plannedDuration: 25,
                actualDuration: 25,
                startedAt: getDayAtTime(1, 10, 0),
                endedAt: getDayAtTime(1, 10, 25),
            },
            {
                userId,
                taskId: task1.id,
                subtaskId: subtasks1.find(s => s.title === 'Cài đặt JWT Auth & Middleware')?.id || null,
                sessionType: 'WORK' as const,
                status: 'COMPLETED' as const,
                plannedDuration: 25,
                actualDuration: 23,
                startedAt: getDayAtTime(1, 10, 30),
                endedAt: getDayAtTime(1, 10, 53),
            },
            {
                userId,
                taskId: task2.id,
                subtaskId: subtasks2.find(s => s.title === 'Vẽ mockup Dashboard & Calendar')?.id || null,
                sessionType: 'WORK' as const,
                status: 'COMPLETED' as const,
                plannedDuration: 30,
                actualDuration: 30,
                startedAt: getDayAtTime(2, 14, 0),
                endedAt: getDayAtTime(2, 14, 30),
            },
            {
                userId,
                taskId: task2.id,
                subtaskId: null,
                sessionType: 'WORK' as const,
                status: 'CANCELLED' as const,
                plannedDuration: 25,
                actualDuration: 10,
                startedAt: getDayAtTime(2, 16, 0),
                endedAt: getDayAtTime(2, 16, 10),
                dropReason: 'Bị cắt ngang bởi cuộc họp đột xuất',
            },
            {
                userId,
                taskId: task1.id,
                subtaskId: null,
                sessionType: 'WORK' as const,
                status: 'CANCELLED' as const,
                plannedDuration: 50,
                actualDuration: 15,
                startedAt: getDayAtTime(3, 14, 0),
                endedAt: getDayAtTime(3, 14, 15),
                dropReason: 'Mất tập trung',
            }
        ];

        await this.prisma.pomodoroSession.createMany({ data: pomodoroData });

        // 5. Seed Behavior Logs
        const logData = [
            { userId, taskId: task1.id, eventType: EventType.TASK_CREATED, occurredAt: getDayAtTime(-3, 9, 0) },
            { userId, taskId: task2.id, eventType: EventType.TASK_CREATED, occurredAt: getDayAtTime(-3, 9, 15) },
            { userId, taskId: task3.id, eventType: EventType.TASK_CREATED, occurredAt: getDayAtTime(-2, 10, 0) },
            { userId, taskId: task4.id, eventType: EventType.TASK_CREATED, occurredAt: getDayAtTime(-2, 10, 30) },
            { userId, taskId: task5.id, eventType: EventType.TASK_CREATED, occurredAt: getDayAtTime(-1, 8, 0) },
            { userId, taskId: task4.id, eventType: EventType.TASK_COMPLETED, occurredAt: getDayAtTime(-1, 16, 0) },
            { userId, taskId: task5.id, eventType: EventType.TASK_COMPLETED, occurredAt: getDayAtTime(0, 18, 0) },
            { userId, taskId: task1.id, eventType: EventType.POMODORO_COMPLETED, occurredAt: getDayAtTime(1, 10, 25) },
            { userId, taskId: task1.id, eventType: EventType.POMODORO_COMPLETED, occurredAt: getDayAtTime(1, 10, 53) },
            { userId, taskId: task2.id, eventType: EventType.POMODORO_COMPLETED, occurredAt: getDayAtTime(2, 14, 30) },
            { userId, taskId: task2.id, eventType: EventType.POMODORO_DROPPED, occurredAt: getDayAtTime(2, 16, 10), metadata: { dropReason: 'Bị cắt ngang bởi cuộc họp đột xuất' } },
            { userId, taskId: task1.id, eventType: EventType.POMODORO_DROPPED, occurredAt: getDayAtTime(3, 14, 15), metadata: { dropReason: 'Mất tập trung' } },
        ];

        await this.prisma.behaviorLog.createMany({ data: logData });

        // 6. Seed Procrastination Scores (Observation periods)
        const procScores = [
            {
                userId,
                score: 42.5,
                classification: ProcrastinationClassification.GOOD,
                delayRate: 0.15,
                deadlineMissRate: 0.10,
                taskIdleDays: 1.2,
                rescheduleFrequency: 0.5,
                timeDurationAccuracy: 0.85,
                calculatedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            },
            {
                userId,
                score: 58.0,
                classification: ProcrastinationClassification.MEDIUM,
                delayRate: 0.35,
                deadlineMissRate: 0.25,
                taskIdleDays: 2.8,
                rescheduleFrequency: 1.2,
                timeDurationAccuracy: 0.72,
                calculatedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            {
                userId,
                score: 31.2,
                classification: ProcrastinationClassification.GOOD,
                delayRate: 0.10,
                deadlineMissRate: 0.0,
                taskIdleDays: 0.5,
                rescheduleFrequency: 0.2,
                timeDurationAccuracy: 0.94,
                calculatedDate: new Date(),
            }
        ];

        for (const ps of procScores) {
            await this.prisma.procrastinationScore.upsert({
                where: {
                    userId_calculatedDate: {
                        userId,
                        calculatedDate: ps.calculatedDate,
                    }
                },
                update: ps,
                create: ps,
            });
        }

        // 7. Seed Behavior Profile
        await this.prisma.behaviorProfile.upsert({
            where: { userId },
            update: {
                peakHours: [9, 10, 11],
                riskyHours: [14, 15, 16],
                avgFocusDuration: 35.5,
                dropRate: 0.25,
                totalSessions: 15,
                lastCalculatedAt: new Date(),
            },
            create: {
                userId,
                peakHours: [9, 10, 11],
                riskyHours: [14, 15, 16],
                avgFocusDuration: 35.5,
                dropRate: 0.25,
                totalSessions: 15,
                lastCalculatedAt: new Date(),
            }
        });

        // 8. Seed AI Insights (Khớp chính xác với cấu trúc mong đợi của Frontend!)
        const insightContent1 = {
            summary: "Năng suất tổng thể rất tốt. Bạn duy trì nhịp độ làm việc tập trung cao độ vào buổi sáng, nhưng gặp hiện tượng giảm năng lượng nhẹ vào khung giờ chiều từ 14h - 16h.",
            strengths: [
                "Hoàn thành các nhiệm vụ cốt lõi về Thiết kế Database Schema và Cài đặt Auth đúng tiến độ.",
                "Duy trì khả năng tập trung tốt trong các phiên làm việc buổi sáng (Độ chính xác thời lượng đạt 94%)."
            ],
            concerns: [
                "Phát hiện dấu hiệu trì hoãn từ 14h - 16h do mệt mỏi sau giờ nghỉ trưa.",
                "Dễ bị cắt ngang bởi các yếu tố tác động bên ngoài (các phiên Pomodoro bị hủy chủ yếu do cuộc họp/nhắn tin)."
            ],
            actionableSuggestions: [
                {
                    content: "Bảo vệ khung giờ vàng sáng Thứ Ba và Thứ Tư để làm việc nặng. Chuyển các việc nhẹ nhàng (check email, đọc tài liệu) vào lúc 14h - 16h.",
                    actionType: "reprioritize_morning"
                },
                {
                    content: "Bật chế độ Do Not Disturb trên thiết bị di động trong suốt các phiên Pomodoro để giảm thiểu tỷ lệ hủy phiên do ngoại cảnh.",
                    actionType: "adjust_reminder"
                }
            ]
        };

        const insightContent2 = {
            summary: "Tuần trước hiệu suất trung bình. Bạn hoàn thành tốt báo cáo kỹ thuật nhưng tỷ lệ trì hoãn của task thiết kế giao diện vẫn còn khá cao.",
            strengths: [
                "Viết báo cáo kỹ thuật đúng thời hạn chót mặc dù độ ưu tiên thấp.",
                "Hoàn thành trọn vẹn 30 phút luyện tập thể thao hàng ngày để duy trì năng lượng."
            ],
            concerns: [
                "Tần suất dời lịch của công việc 'Thiết kế UI/UX' khá thường xuyên.",
                "Chưa phân rã các công việc phức tạp thành subtask nhỏ hơn, dẫn đến cảm giác ngại bắt đầu."
            ],
            actionableSuggestions: [
                {
                    content: "Chia nhỏ task 'Thiết kế UI/UX Frontend' thành các subtask không quá 30 phút và xử lý ngay trong phiên tiếp theo.",
                    actionType: "shorten_tasks"
                }
            ]
        };

        const insightContent3 = {
            summary: "Hiệu suất tuần này đạt mức báo động trung bình do sự trì hoãn kéo dài ở các task quan trọng thiết kế hệ thống.",
            strengths: [
                "Duy trì thói quen ghi chú công việc hàng ngày đầy đủ trên hệ thống."
            ],
            concerns: [
                "Tỷ lệ trì hoãn (Procrastination Score) tăng vọt lên 58/100.",
                "Có xu hướng làm các task dễ trước và liên tục dời lịch các task khó, dẫn đến quá tải vào cuối tuần."
            ],
            actionableSuggestions: [
                {
                    content: "Áp dụng quy tắc 5 phút: Đối với các task khó như Code, cam kết làm tập trung trong 5 phút đầu tiên để vượt qua rào cản tâm lý ngại bắt đầu.",
                    actionType: "reprioritize_morning"
                }
            ]
        };

        const insightContent4 = {
            summary: "Hiệu suất khởi đầu ấn tượng. Bạn đã thiết lập được kỷ luật tốt ngay từ những tuần đầu sử dụng hệ thống FocusFlow.",
            strengths: [
                "Không bỏ dở phiên Pomodoro nào (Tỷ lệ hoàn thành phiên đạt 100%).",
                "Tận dụng tốt thời gian làm việc buổi sáng để hoàn tất 80% công việc trong ngày."
            ],
            concerns: [
                "Chưa phân bổ thời gian nghỉ ngơi hợp lý sau chuỗi phiên tập trung liên tục, dẫn đến giảm năng lượng vào cuối ngày."
            ],
            actionableSuggestions: [
                {
                    content: "Thiết lập cấu hình nhắc nhở nghỉ ngơi tự động và tuân thủ tuyệt đối phiên giải lao 5 phút.",
                    actionType: "adjust_reminder"
                }
            ]
        };

        const weekStart1 = new Date(monday);
        const weekStart2 = new Date(monday);
        weekStart2.setDate(weekStart2.getDate() - 7); // Thứ 2 tuần trước
        
        const weekStart3 = new Date(monday);
        weekStart3.setDate(weekStart3.getDate() - 14); // Thứ 2 cách đây 2 tuần

        const weekStart4 = new Date(monday);
        weekStart4.setDate(weekStart4.getDate() - 21); // Thứ 2 cách đây 3 tuần

        await this.prisma.aiInsight.upsert({
            where: { userId_weekStartDate: { userId, weekStartDate: weekStart1 } },
            update: {
                content: insightContent1,
                isActionable: true,
                status: InsightStatus.GENERATED,
            },
            create: {
                userId,
                weekStartDate: weekStart1,
                content: insightContent1,
                isActionable: true,
                status: InsightStatus.GENERATED,
            }
        });

        await this.prisma.aiInsight.upsert({
            where: { userId_weekStartDate: { userId, weekStartDate: weekStart2 } },
            update: {
                content: insightContent2,
                isActionable: true,
                status: InsightStatus.GENERATED,
            },
            create: {
                userId,
                weekStartDate: weekStart2,
                content: insightContent2,
                isActionable: true,
                status: InsightStatus.GENERATED,
            }
        });

        await this.prisma.aiInsight.upsert({
            where: { userId_weekStartDate: { userId, weekStartDate: weekStart3 } },
            update: {
                content: insightContent3,
                isActionable: true,
                status: InsightStatus.GENERATED,
            },
            create: {
                userId,
                weekStartDate: weekStart3,
                content: insightContent3,
                isActionable: true,
                status: InsightStatus.GENERATED,
            }
        });

        await this.prisma.aiInsight.upsert({
            where: { userId_weekStartDate: { userId, weekStartDate: weekStart4 } },
            update: {
                content: insightContent4,
                isActionable: true,
                status: InsightStatus.GENERATED,
            },
            create: {
                userId,
                weekStartDate: weekStart4,
                content: insightContent4,
                isActionable: true,
                status: InsightStatus.GENERATED,
            }
        });

        return { message: 'Đã seed mockup data thành công cho tài khoản của bạn!' };
    }
}
