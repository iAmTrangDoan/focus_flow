import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import {
    EventType,
    FocusMode,
    PomodoroSessionType,
    PomodoroStatus,
    Prisma,
    SlotStatus,
    TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateSessionDto } from './dto/create-session.dto';

const ACTIVE_SESSION_STATUSES: PomodoroStatus[] = [
    PomodoroStatus.IN_PROGRESS,
    PomodoroStatus.PAUSED,
];

const DROP_REASON_OPTIONS = [
    'Mệt',
    'Task quá khó',
    'Bị cắt ngang',
    'Bị phân tâm',
    'Không còn phù hợp',
    'Khác',
];

@Injectable()
export class PomodoroService {
    private readonly logger = new Logger(PomodoroService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ) { }

    /**
     * Bắt đầu một phiên Pomodoro.
     * - Mỗi user chỉ có tối đa một phiên IN_PROGRESS/PAUSED.
     * - Nếu task có subtasks thì WORK session phải chỉ rõ subtaskId.
     * - Phiên WORK cuối chỉ chạy đúng số phút còn lại của unit (nếu chưa đạt ước lượng).
     * - Nếu đã đạt ước lượng nhưng chưa hoàn thành (isCompleted=false), cho phép chạy phiên chuẩn.
     * - BREAK session không làm tăng tiến độ công việc.
     */
    async startSession(userId: string, dto: CreateSessionDto) {
        const session = await this.prisma.$transaction(async (tx) => {
            await this.ensureNoActiveSession(tx, userId);

            const context = await this.getUnitContext(
                tx,
                userId,
                dto.taskId,
                dto.subtaskId,
                dto.sessionType ?? PomodoroSessionType.WORK,
            );

            const slot = dto.scheduleSlotId
                ? await this.ensureScheduleSlotCanStart(
                    tx,
                    userId,
                    dto.scheduleSlotId,
                    dto.taskId,
                    dto.subtaskId,
                )
                : null;

            const type = dto.sessionType ?? PomodoroSessionType.WORK;
            let plannedDuration: number;

            if (type === PomodoroSessionType.BREAK) {
                plannedDuration = this.getBreakDuration(context.task.focusMode);
            } else {
                this.ensureTaskCanRun(context.task);

                const progress = await this.calculateProgress(
                    tx,
                    userId,
                    dto.taskId,
                    dto.subtaskId,
                );

                if (!progress.unit || progress.unit.isCompleted || progress.unit.remainingMinutes <= 0) {
                    throw new BadRequestException('Công việc đã đủ thời lượng hoặc đã hoàn thành');
                }
                
                //phiên cuối cùng của task sẽ được chạy đúng số phút còn lại của unit thay vì 25p
                const standardDuration = this.getWorkDuration(context.task.focusMode);
                plannedDuration = Math.min(standardDuration, progress.unit.remainingMinutes);

                if (context.task.status === TaskStatus.TODO) {
                    await tx.task.update({
                        where: { id: context.task.id },
                        data: { status: TaskStatus.IN_PROGRESS },
                    });
                }
            }

            const now = new Date();

            const created = await tx.pomodoroSession.create({
                data: {
                    userId,
                    taskId: dto.taskId,
                    subtaskId: dto.subtaskId ?? null,
                    scheduleSlotId: dto.scheduleSlotId ?? null,
                    sessionType: type,
                    plannedDuration,
                    status: PomodoroStatus.IN_PROGRESS,
                    startedAt: now,
                    lastResumedAt: now,
                    accumulatedActiveSeconds: 0,
                },
                include: this.sessionInclude,
            });

            if (slot && now > slot.startAt && type === PomodoroSessionType.WORK) {
                await tx.behaviorLog.createMany({
                    data: [{
                        userId,
                        taskId: slot.taskId,
                        sessionId: created.id,
                        eventType: EventType.TASK_STARTED_LATE,
                        scheduledTime: slot.startAt,
                        delayMinutes: Math.floor(
                            (now.getTime() - slot.startAt.getTime()) / 60_000,
                        ),
                        dedupeKey: `slot-started-late:${slot.id}`,
                        occurredAt: now,
                        metadata: {
                            scheduleSlotId: slot.id,
                            source: 'POMODORO_START',
                        },
                    }],
                    skipDuplicates: true,
                });
            }

            return created;
        });

        return this.buildSessionResponse(userId, session);
    }

    /**
     * Tạo một phiên mới để làm lại phiên WORK đã drop.
     * Không đổi phiên CANCELLED cũ trở lại IN_PROGRESS để không làm mất dữ liệu hành vi.
     */
    async retryCancelledSession(userId: string, cancelledSessionId: string) {
        const session = await this.prisma.$transaction(async (tx) => {
            await this.ensureNoActiveSession(tx, userId);

            const cancelled = await tx.pomodoroSession.findUnique({
                where: { id: cancelledSessionId },
                include: this.sessionInclude,
            });

            if (!cancelled) {
                throw new NotFoundException('Phiên Pomodoro không tồn tại');
            }
            if (cancelled.userId !== userId) {
                throw new ForbiddenException('Không có quyền');
            }
            if (cancelled.status !== PomodoroStatus.CANCELLED) {
                throw new BadRequestException('Chỉ có thể chạy lại phiên đã bị drop');
            }
            if (cancelled.sessionType !== PomodoroSessionType.WORK) {
                throw new BadRequestException('Không cần chạy lại phiên nghỉ');
            }
            if (!cancelled.taskId || !cancelled.task) {
                throw new BadRequestException('Task của phiên không còn tồn tại');
            }

            this.ensureTaskCanRun(cancelled.task);

            const progress = await this.calculateProgress(
                tx,
                userId,
                cancelled.taskId,
                cancelled.subtaskId,
            );

            if (!progress.unit || progress.unit.isCompleted) {
                throw new BadRequestException('Công việc đã hoàn thành, không cần chạy lại phiên');
            }

            const standardDuration = this.getWorkDuration(cancelled.task.focusMode);
            const plannedDuration = progress.unit.estimateMet
                ? standardDuration
                : Math.min(standardDuration, progress.unit.remainingMinutes);

            if (cancelled.task.status === TaskStatus.TODO) {
                await tx.task.update({
                    where: { id: cancelled.task.id },
                    data: { status: TaskStatus.IN_PROGRESS },
                });
            }

            const now = new Date();
            return tx.pomodoroSession.create({
                data: {
                    userId,
                    taskId: cancelled.taskId,
                    subtaskId: cancelled.subtaskId,
                    scheduleSlotId: cancelled.scheduleSlotId,
                    retryOfSessionId: cancelled.id,
                    sessionType: PomodoroSessionType.WORK,
                    plannedDuration,
                    status: PomodoroStatus.IN_PROGRESS,
                    startedAt: now,
                    lastResumedAt: now,
                    accumulatedActiveSeconds: 0,
                },
                include: this.sessionInclude,
            });
        });

        return this.buildSessionResponse(userId, session);
    }

    /**
     * Lấy danh sách đơn vị có thể chạy Pomodoro.
     * - Task không có subtask được xem là một unit TASK.
     * - Task có subtask chỉ trả về các subtask chưa hoàn thành.
     * - Progress chỉ tính từ WORK session có trạng thái COMPLETED.
     * - Trả về schedule slot gần nhất nếu có.
     */
    async getUnits(userId: string) {
        const tasks = await this.prisma.task.findMany({
            where: {
                userId,
                isFixedTask: false,
                status: {
                    in: [
                        TaskStatus.TODO,
                        TaskStatus.IN_PROGRESS,
                    ],
                },
            },
            include: {
                subtasks: {
                    orderBy: {
                        sortOrder: 'asc',
                    },
                },
            },
            orderBy: [
                {
                    priorityScore: 'desc',
                },
                {
                    createdAt: 'asc',
                },
            ],
        });

        if (tasks.length === 0) {
            return [];
        }

        const taskIds = tasks.map((task) => task.id);

        const [completedSessions, upcomingSlots] =
            await Promise.all([
                this.prisma.pomodoroSession.findMany({
                    where: {
                        userId,
                        taskId: {
                            in: taskIds,
                        },
                        sessionType: PomodoroSessionType.WORK,
                        status: PomodoroStatus.COMPLETED,
                    },
                    select: {
                        taskId: true,
                        subtaskId: true,
                        plannedDuration: true,
                    },
                }),

                this.prisma.scheduleSlot.findMany({
                    where: {
                        userId,
                        taskId: {
                            in: taskIds,
                        },
                        status: SlotStatus.SCHEDULED,
                        isCompleted: false,
                        endAt: {
                            gt: new Date(),
                        },
                    },
                    select: {
                        id: true,
                        taskId: true,
                        subtaskId: true,
                        startAt: true,
                        endAt: true,
                    },
                    orderBy: {
                        startAt: 'asc',
                    },
                }),
            ]);

        const buildUnitKey = (
            taskId: string,
            subtaskId?: string | null,
        ) => `${taskId}:${subtaskId ?? 'TASK'}`;

        const completedMinutesByUnit = new Map<string, number>();
        const completedSessionCountByUnit = new Map<string, number>();

        for (const session of completedSessions) {
            if (!session.taskId) {
                continue;
            }

            const key = buildUnitKey(
                session.taskId,
                session.subtaskId,
            );

            completedMinutesByUnit.set(
                key,
                (completedMinutesByUnit.get(key) ?? 0) +
                    session.plannedDuration,
            );

            completedSessionCountByUnit.set(
                key,
                (completedSessionCountByUnit.get(key) ?? 0) + 1,
            );
        }

        const nextSlotByUnit = new Map<
            string,
            {
                id: string;
                startAt: Date;
                endAt: Date;
            }
        >();

        for (const slot of upcomingSlots) {
            const key = buildUnitKey(
                slot.taskId,
                slot.subtaskId,
            );

            // Danh sách đã được sort startAt tăng dần,
            // vì vậy chỉ giữ slot đầu tiên.
            if (!nextSlotByUnit.has(key)) {
                nextSlotByUnit.set(key, {
                    id: slot.id,
                    startAt: slot.startAt,
                    endAt: slot.endAt,
                });
            }
        }

        const units: Array<{
            id: string;
            type: 'TASK' | 'SUBTASK';
            taskId: string;
            subtaskId: string | null;
            taskTitle: string;
            title: string;
            importance: string;
            priorityScore: number;
            focusMode: FocusMode;
            estimatedMinutes: number;
            completedMinutes: number;
            remainingMinutes: number;
            progressPercent: number;
            workDurationMinutes: number;
            totalSessions: number;
            completedSessions: number;
            remainingSessions: number;
            scheduleSlotId: string | null;
            scheduledStartAt: Date | null;
            scheduledEndAt: Date | null;
        }> = [];

        for (const task of tasks) {
            const workDurationMinutes =
                this.getWorkDuration(task.focusMode);

            if (task.subtasks.length > 0) {
                for (const subtask of task.subtasks) {
                    if (subtask.isCompleted) {
                        continue;
                    }

                    const key = buildUnitKey(
                        task.id,
                        subtask.id,
                    );

                    const estimatedMinutes = Math.max(
                        1,
                        subtask.estimatedMinutes ??
                            workDurationMinutes,
                    );

                    const completedMinutes =
                        completedMinutesByUnit.get(key) ?? 0;

                    const remainingMinutes = Math.max(
                        estimatedMinutes - completedMinutes,
                        0,
                    );

                    // Tránh hiển thị unit đã đủ phút nhưng dữ liệu
                    // isCompleted chưa được đồng bộ từ dữ liệu cũ.
                    if (remainingMinutes <= 0) {
                        continue;
                    }

                    const nextSlot = nextSlotByUnit.get(key);

                    units.push({
                        id: subtask.id,
                        type: 'SUBTASK',
                        taskId: task.id,
                        subtaskId: subtask.id,
                        taskTitle: task.title,
                        title: subtask.title,
                        importance: task.importance,
                        priorityScore: task.priorityScore,
                        focusMode: task.focusMode,
                        estimatedMinutes,
                        completedMinutes,
                        remainingMinutes,
                        progressPercent: this.toPercent(
                            Math.min(
                                completedMinutes,
                                estimatedMinutes,
                            ),
                            estimatedMinutes,
                        ),
                        workDurationMinutes,
                        totalSessions: Math.ceil(
                            estimatedMinutes /
                                workDurationMinutes,
                        ),
                        completedSessions:
                            completedSessionCountByUnit.get(key) ??
                            0,
                        remainingSessions: Math.ceil(
                            remainingMinutes /
                                workDurationMinutes,
                        ),
                        scheduleSlotId: nextSlot?.id ?? null,
                        scheduledStartAt:
                            nextSlot?.startAt ?? null,
                        scheduledEndAt:
                            nextSlot?.endAt ?? null,
                    });
                }

                continue;
            }

            const key = buildUnitKey(task.id, null);

            const estimatedMinutes = Math.max(
                1,
                task.estimatedMinutes ?? workDurationMinutes,
            );

            const completedMinutes =
                completedMinutesByUnit.get(key) ?? 0;

            const remainingMinutes = Math.max(
                estimatedMinutes - completedMinutes,
                0,
            );

            if (remainingMinutes <= 0) {
                continue;
            }

            const nextSlot = nextSlotByUnit.get(key);

            units.push({
                id: task.id,
                type: 'TASK',
                taskId: task.id,
                subtaskId: null,
                taskTitle: task.title,
                title: task.title,
                importance: task.importance,
                priorityScore: task.priorityScore,
                focusMode: task.focusMode,
                estimatedMinutes,
                completedMinutes,
                remainingMinutes,
                progressPercent: this.toPercent(
                    Math.min(
                        completedMinutes,
                        estimatedMinutes,
                    ),
                    estimatedMinutes,
                ),
                workDurationMinutes,
                totalSessions: Math.ceil(
                    estimatedMinutes /
                        workDurationMinutes,
                ),
                completedSessions:
                    completedSessionCountByUnit.get(key) ?? 0,
                remainingSessions: Math.ceil(
                    remainingMinutes /
                        workDurationMinutes,
                ),
                scheduleSlotId: nextSlot?.id ?? null,
                scheduledStartAt:
                    nextSlot?.startAt ?? null,
                scheduledEndAt:
                    nextSlot?.endAt ?? null,
            });
        }

        return units;
    }

    async getCurrentSession(userId: string) {
        const session = await this.prisma.pomodoroSession.findFirst({
            where: {
                userId,
                status: { in: ACTIVE_SESSION_STATUSES },
            },
            include: this.sessionInclude,
            orderBy: { startedAt: 'desc' },
        });

        if (!session) return null;
        return this.buildSessionResponse(userId, session);
    }

    async getHistory(userId: string, status?: PomodoroStatus) {
        const sessions = await this.prisma.pomodoroSession.findMany({
            where: {
                userId,
                ...(status ? { status } : {}),
            },
            include: this.sessionInclude,
            orderBy: { startedAt: 'desc' },
            take: 50,
        });

        return Promise.all(
            sessions.map((session) => this.buildSessionResponse(userId, session)),
        );
    }

    async getTaskProgress(userId: string, taskId: string, subtaskId?: string) {
        return this.prisma.$transaction((tx) =>
            this.calculateProgress(tx, userId, taskId, subtaskId),
        );
    }

    async pauseSession(userId: string, sessionId: string) {
        const updated = await this.prisma.$transaction(async (tx) => {
            const session = await this.ensureSessionOwnership(tx, userId, sessionId);

            if (session.status !== PomodoroStatus.IN_PROGRESS) {
                throw new BadRequestException('Phiên không ở trạng thái đang chạy');
            }

            const now = new Date();
            const accumulatedActiveSeconds = this.getActiveElapsedSeconds(session, now);

            const paused = await tx.pomodoroSession.update({
                where: { id: sessionId },
                data: {
                    status: PomodoroStatus.PAUSED,
                    pauseCount: { increment: 1 },
                    pausedAt: now,
                    lastResumedAt: null,
                    accumulatedActiveSeconds,
                },
                include: this.sessionInclude,
            });

            await tx.behaviorLog.create({
                data: {
                    userId,
                    taskId: session.taskId,
                    sessionId,
                    eventType: EventType.POMODORO_PAUSED,
                    metadata: {
                        activeElapsedSeconds: accumulatedActiveSeconds,
                        pauseCount: paused.pauseCount,
                    },
                },
            });

            return paused;
        });

        return this.buildSessionResponse(userId, updated);
    }

    async resumeSession(userId: string, sessionId: string) {
        const updated = await this.prisma.$transaction(async (tx) => {
            const session = await this.ensureSessionOwnership(tx, userId, sessionId);

            if (session.status !== PomodoroStatus.PAUSED) {
                throw new BadRequestException('Phiên không ở trạng thái tạm dừng');
            }

            const anotherRunning = await tx.pomodoroSession.findFirst({
                where: {
                    userId,
                    id: { not: sessionId },
                    status: PomodoroStatus.IN_PROGRESS,
                },
            });

            if (anotherRunning) {
                throw new BadRequestException('Đang có một phiên Pomodoro khác chạy');
            }

            return tx.pomodoroSession.update({
                where: { id: sessionId },
                data: {
                    status: PomodoroStatus.IN_PROGRESS,
                    lastResumedAt: new Date(),
                    pausedAt: null,
                },
                include: this.sessionInclude,
            });
        });

        return this.buildSessionResponse(userId, updated);
    }

    async completeSession(userId: string, sessionId: string) {
        const result = await this.prisma.$transaction(async (tx) => {
            const session = await this.ensureSessionOwnership(tx, userId, sessionId);

            if (session.status === PomodoroStatus.COMPLETED) {
                const progress = session.taskId ? session.sessionType === PomodoroSessionType.WORK
                    ? await this.calculateAndSyncProgress(
                        tx,
                        userId,
                        session.taskId,
                        session.subtaskId,
                    )
                    : await this.calculateProgress(
                        tx,
                        userId,
                        session.taskId,
                        session.subtaskId,
                    )
                    : null;
                return {
                    session: await tx.pomodoroSession.findUniqueOrThrow({
                        where: { id: session.id },
                        include: this.sessionInclude,
                    }),
                    progress,
                    wasAlreadyCompleted: true,
                };
            }

            if (!ACTIVE_SESSION_STATUSES.includes(session.status)) {
                throw new BadRequestException('Phiên không thể hoàn thành từ trạng thái hiện tại');
            }

            const now = new Date();
            const activeElapsedSeconds = this.getActiveElapsedSeconds(session, now);
            const plannedSeconds =session.plannedDuration * 60;

            // Cho phép sai số nhỏ do request và timer frontend
            // có thể lệch khoảng 1–2 giây.
            const completionToleranceSeconds = 2;

            if (session.sessionType === PomodoroSessionType.WORK && activeElapsedSeconds + completionToleranceSeconds < plannedSeconds) {
                throw new BadRequestException('Phiên tập trung chưa kết thúc');
            }
            const creditedSeconds = Math.min(activeElapsedSeconds, plannedSeconds);
            const actualDuration = this.secondsToRoundedMinutes(creditedSeconds);

            const completed = await tx.pomodoroSession.update({
                where: { id: sessionId },
                data: {
                    status: PomodoroStatus.COMPLETED,
                    endedAt: now,
                    actualDuration,
                    accumulatedActiveSeconds: activeElapsedSeconds,
                    lastResumedAt: null,
                    pausedAt: null,
                },
                include: this.sessionInclude,
            });

            await tx.behaviorLog.create({
                data: {
                    userId,
                    taskId: session.taskId,
                    sessionId,
                    eventType: EventType.POMODORO_COMPLETED,
                    metadata: {
                        sessionType: session.sessionType,
                        plannedDuration: session.plannedDuration,
                        actualDuration,
                        subtaskId: session.subtaskId,
                        retryOfSessionId: session.retryOfSessionId,
                    },
                },
            });

            if (
                session.scheduleSlotId &&
                session.sessionType === PomodoroSessionType.WORK
            ) {
                await tx.scheduleSlot.updateMany({
                    where: {
                        id: session.scheduleSlotId,
                        userId,
                    },
                    data: {
                        isCompleted: true,
                        status: SlotStatus.COMPLETED,
                    },
                });
            }

            const progress = session.taskId
                ? await this.calculateProgress(
                    tx,
                    userId,
                    session.taskId,
                    session.subtaskId,
                )
                : null;

            return {
                session: completed,
                progress,
                wasAlreadyCompleted: false,
            };
        });

        if (!result.wasAlreadyCompleted) {
            const title = result.session.subtask?.title ?? result.session.task?.title ?? 'Công việc';
            const isWork = result.session.sessionType === PomodoroSessionType.WORK;
            try{
                 await this.notificationService.createNotification(
                userId,
                'pomodoro',
                isWork ? 'Hoàn thành phiên tập trung' : 'Hoàn thành phiên nghỉ',
                isWork
                    ? `Bạn đã hoàn thành ${result.session.plannedDuration} phút cho "${title}".`
                    : `Bạn đã hoàn thành ${result.session.plannedDuration} phút nghỉ.`,
            );
            }catch(error){
                 this.logger.warn(`Không thể tạo notification cho session ${result.session.id}`);
            }
        }

        return {
            session: this.formatSession(result.session),
            progress: result.progress,
            nextAction: this.resolveNextAction(result.session, result.progress),
        };
    }

    /**
     * Drop một phiên giữa chừng.
     * Phần thời gian đã chạy được lưu để phân tích hành vi nhưng không cộng vào tiến độ unit.
     */
    async cancelSession(
        userId: string,
        sessionId: string,
        reason: string,
        details?: string,)
    {
        const updated = await this.prisma.$transaction(async (tx) => {
            const session = await this.ensureSessionOwnership(tx, userId, sessionId);

            if (session.status === PomodoroStatus.CANCELLED) {
                return tx.pomodoroSession.findUniqueOrThrow({
                    where: { id: sessionId },
                    include: this.sessionInclude,
                });
            }
            if (session.status === PomodoroStatus.COMPLETED) {
                throw new BadRequestException('Phiên đã hoàn thành, không thể drop');
            }

            const now = new Date();
            const activeElapsedSeconds = this.getActiveElapsedSeconds(session, now);
            const actualDuration = this.secondsToRoundedMinutes(activeElapsedSeconds);

            const cancelled = await tx.pomodoroSession.update({
                where: { id: sessionId },
                data: {
                    status: PomodoroStatus.CANCELLED,
                    endedAt: now,
                    actualDuration,
                    accumulatedActiveSeconds: activeElapsedSeconds,
                    lastResumedAt: null,
                    pausedAt: null,
                    dropReason: reason,
                    dropDetails: details?.trim() || null,
                },
                include: this.sessionInclude,
            });

            await tx.behaviorLog.create({
                data: {
                    userId,
                    taskId: session.taskId,
                    sessionId,
                    eventType: EventType.POMODORO_DROPPED,
                    metadata: {
                        sessionType: session.sessionType,
                        plannedDuration: session.plannedDuration,
                        actualDuration,
                        activeElapsedSeconds,
                        subtaskId: session.subtaskId,
                    },
                },
            });

            return cancelled;
        });

        const canRetry = this.canRetrySession(updated);
        const progress = updated.taskId
            ? await this.getTaskProgress(userId, updated.taskId, updated.subtaskId ?? undefined)
            : null;

        await this.notificationService.createNotification(
            userId,
            'pomodoro',
            'Phiên Pomodoro đã bị drop',
            `Phiên của "${updated.subtask?.title ?? updated.task?.title ?? 'Công việc'}" đã dừng giữa chừng.`,
        );

        return {
            session: this.formatSession(updated),
            progress,
            feedbackRequired: !updated.dropReason,
            feedbackOptions: DROP_REASON_OPTIONS,
            canRetry,
            retryEndpoint: canRetry
                ? `/pomodoro/sessions/${updated.id}/retry`
                : null,
        };
    }

    async quickFeedback(
        userId: string,
        sessionId: string,
        reason: string,
        details?: string,
    ) {
        const session = await this.ensureSessionOwnership(
            this.prisma,
            userId,
            sessionId,
        );

        if (session.status !== PomodoroStatus.CANCELLED) {
            throw new BadRequestException('Khảo sát chỉ áp dụng cho phiên đã drop');
        }

        if (!DROP_REASON_OPTIONS.includes(reason)) {
            throw new BadRequestException('Lý do drop không hợp lệ');
        }

        const updated = await this.prisma.pomodoroSession.update({
            where: { id: sessionId },
            data: {
                dropReason: reason,
                dropDetails: details?.trim() || null,
            },
            include: this.sessionInclude,
        });

        return {
            session: this.formatSession(updated),
            feedbackSaved: true,
            canRetry: this.canRetrySession(updated),
        };
    }

    // ─── PROGRESS ───────────────────────────────────────────────
    /**
     * Chỉ tính toán progress của task/subtask dựa trên các PomodoroSession WORK COMPLETED.
     * Không tự động update trạng thái hoàn thành của task/subtask trong database.
     */
    private async calculateProgress(
        tx: Prisma.TransactionClient,
        userId: string,
        taskId: string,
        selectedSubtaskId?: string | null,
    ) {
        const task = await tx.task.findUnique({
            where: { id: taskId },
            include: {
                subtasks: { orderBy: { sortOrder: 'asc' } },
            },
        });

        if (!task) throw new NotFoundException('Task không tồn tại');
        if (task.userId !== userId) throw new ForbiddenException('Không có quyền');

        const completedWorkSessions = await tx.pomodoroSession.findMany({
            where: {
                userId,
                taskId,
                sessionType: PomodoroSessionType.WORK,
                status: PomodoroStatus.COMPLETED,
            },
            select: {
                plannedDuration: true,
                subtaskId: true,
            },
        });

        const completedBySubtask = new Map<string, number>();
        let completedDirectTaskMinutes = 0;

        for (const session of completedWorkSessions) {
            if (session.subtaskId) {
                completedBySubtask.set(
                    session.subtaskId,
                    (completedBySubtask.get(session.subtaskId) ?? 0) +
                    session.plannedDuration,
                );
            } else {
                completedDirectTaskMinutes += session.plannedDuration;
            }
        }

        const defaultUnitMinutes = this.getWorkDuration(task.focusMode);
        let taskEstimatedMinutes: number;
        let taskCompletedMinutes: number;
        let unit: {
            type: 'TASK' | 'SUBTASK';
            id: string;
            title: string;
            estimatedMinutes: number;
            completedMinutes: number;
            remainingMinutes: number;
            progressPercent: number;
            isCompleted: boolean;
            estimateMet: boolean;
        } | null = null;

        if (task.subtasks.length > 0) {
            taskEstimatedMinutes = task.subtasks.reduce(
                (sum, subtask) =>
                    sum + (subtask.estimatedMinutes ?? defaultUnitMinutes),
                0,
            );
            taskCompletedMinutes = 0;

            for (const subtask of task.subtasks) {
                const estimatedMinutes =
                    subtask.estimatedMinutes ?? defaultUnitMinutes;
                const completedBySessions = completedBySubtask.get(subtask.id) ?? 0;

                const effectiveCompletedMinutes = subtask.isCompleted
                    ? estimatedMinutes
                    : Math.min(completedBySessions, estimatedMinutes);

                taskCompletedMinutes += effectiveCompletedMinutes;

                if (selectedSubtaskId === subtask.id) {
                    unit = {
                        type: 'SUBTASK',
                        id: subtask.id,
                        title: subtask.title,
                        estimatedMinutes,
                        completedMinutes: completedBySessions,
                        remainingMinutes: Math.max(estimatedMinutes - completedBySessions, 0),
                        progressPercent: this.toPercent(effectiveCompletedMinutes, estimatedMinutes),
                        isCompleted: subtask.isCompleted,
                        estimateMet: completedBySessions >= estimatedMinutes,
                    };
                }
            }

            if (selectedSubtaskId && !unit) {
                throw new NotFoundException('Subtask không thuộc task này');
            }
        } else {
            taskEstimatedMinutes = task.estimatedMinutes ?? defaultUnitMinutes;
            taskCompletedMinutes = completedDirectTaskMinutes;

            unit = {
                type: 'TASK',
                id: task.id,
                title: task.title,
                estimatedMinutes: taskEstimatedMinutes,
                completedMinutes: taskCompletedMinutes,
                remainingMinutes: Math.max(taskEstimatedMinutes - taskCompletedMinutes, 0),
                progressPercent: this.toPercent(
                    Math.min(taskCompletedMinutes, taskEstimatedMinutes),
                    taskEstimatedMinutes,
                ),
                isCompleted: task.status === TaskStatus.DONE,
                estimateMet: taskCompletedMinutes >= taskEstimatedMinutes,
            };
        }

        return {
            task: {
                id: task.id,
                title: task.title,
                estimatedMinutes: taskEstimatedMinutes,
                completedMinutes: taskCompletedMinutes,
                remainingMinutes: Math.max(taskEstimatedMinutes - taskCompletedMinutes, 0),
                progressPercent: this.toPercent(
                    Math.min(taskCompletedMinutes, taskEstimatedMinutes),
                    taskEstimatedMinutes,
                ),
                status: task.status,
                isCompleted: task.status === TaskStatus.DONE,
                estimateMet: taskCompletedMinutes >= taskEstimatedMinutes,
            },
            unit,
        };
    }

    private async calculateAndSyncProgress(
        tx: Prisma.TransactionClient,
        userId: string,
        taskId: string,
        selectedSubtaskId?: string | null,
    ) {
        let progress = await this.calculateProgress(
            tx,
            userId,
            taskId,
            selectedSubtaskId,
        );

        const now = new Date();

        if (
            progress.unit?.type === 'SUBTASK' &&
            progress.unit.estimateMet &&
            !progress.unit.isCompleted
        ) {
            await tx.subtask.updateMany({
                where: {
                    id: progress.unit.id,
                    taskId,
                    isCompleted: false,
                },
                data: {
                    isCompleted: true,
                    completedAt: now,
                },
            });
        }

        if (
            progress.unit?.type === 'TASK' &&
            progress.unit.estimateMet &&
            !progress.task.isCompleted
        ) {
            await tx.task.updateMany({
                where: {
                    id: taskId,
                    userId,
                    status: {
                        not: TaskStatus.DONE,
                    },
                },
                data: {
                    status: TaskStatus.DONE,
                    completedAt: now,
                },
            });
        }

        if (progress.unit?.type === 'SUBTASK') {
            const incompleteSubtaskCount =
                await tx.subtask.count({
                    where: {
                        taskId,
                        isCompleted: false,
                    },
                });

            if (incompleteSubtaskCount === 0) {
                await tx.task.updateMany({
                    where: {
                        id: taskId,
                        userId,
                        status: {
                            not: TaskStatus.DONE,
                        },
                    },
                    data: {
                        status: TaskStatus.DONE,
                        completedAt: now,
                    },
                });
            }
        }

        // Đọc lại dữ liệu sau khi đã cập nhật trạng thái.
        progress = await this.calculateProgress(
            tx,
            userId,
            taskId,
            selectedSubtaskId,
        );

        return progress;
    }

    // ─── HELPERS ────────────────────────────────────────────────

    private readonly sessionInclude = {
        task: {
            select: {
                id: true,
                title: true,
                deadline: true,
                focusMode: true,
                status: true,
            },
        },
        subtask: {
            select: {
                id: true,
                title: true,
                estimatedMinutes: true,
                isCompleted: true,
            },
        },
        scheduleSlot: {
            select: {
                id: true,
                startAt: true,
                endAt: true,
                status: true,
                isCompleted: true,
            },
        },
    } satisfies Prisma.PomodoroSessionInclude;

    private async getUnitContext(
        tx: Prisma.TransactionClient,
        userId: string,
        taskId: string,
        subtaskId: string | undefined,
        sessionType: PomodoroSessionType,
    ) {
        const task = await tx.task.findUnique({
            where: { id: taskId },
            include: { subtasks: true },
        });

        if (!task) throw new NotFoundException('Task không tồn tại');
        if (task.userId !== userId) throw new ForbiddenException('Không có quyền');
        if (task.status === TaskStatus.DONE) {
            throw new BadRequestException('Task đã hoàn thành');
        }

        const subtask = subtaskId
            ? task.subtasks.find((item) => item.id === subtaskId)
            : undefined;

        if (subtaskId && !subtask) {
            throw new NotFoundException('Subtask không thuộc task này');
        }

        if (
            sessionType === PomodoroSessionType.WORK &&
            task.subtasks.length > 0 &&
            !subtaskId
        ) {
            throw new BadRequestException(
                'Task có subtasks. Hãy chọn một subtask cụ thể để chạy Pomodoro',
            );
        }

        if (subtask?.isCompleted) {
            throw new BadRequestException('Subtask đã hoàn thành');
        }

        return { task, subtask };
    }

    private ensureTaskCanRun(task: {
        status: TaskStatus;
        deadline: Date | null;
    }) {
        if (task.status === TaskStatus.DONE) {
            throw new BadRequestException('Task đã hoàn thành');
        }
    }

    private async ensureScheduleSlotCanStart(
        tx: Prisma.TransactionClient,
        userId: string,
        scheduleSlotId: string,
        taskId: string,
        subtaskId?: string,
    ) {
        const slot = await tx.scheduleSlot.findUnique({
            where: { id: scheduleSlotId },
        });

        if (!slot) throw new NotFoundException('Schedule slot không tồn tại');
        if (slot.userId !== userId) throw new ForbiddenException('Không có quyền');
        if (slot.taskId !== taskId || (slot.subtaskId ?? undefined) !== subtaskId) {
            throw new BadRequestException('Schedule slot không khớp với task/subtask đã chọn');
        }
        if (slot.isCompleted || slot.status === SlotStatus.COMPLETED) {
            throw new BadRequestException('Schedule slot đã hoàn thành');
        }
        return slot;
    }

    private async ensureNoActiveSession(
        tx: Prisma.TransactionClient,
        userId: string,
    ) {
        const active = await tx.pomodoroSession.findFirst({
            where: {
                userId,
                status: { in: ACTIVE_SESSION_STATUSES },
            },
        });

        if (active) {
            throw new BadRequestException(
                'Đang có phiên Pomodoro hoạt động. Hãy hoàn thành, tiếp tục hoặc drop phiên đó trước',
            );
        }
    }

    private async ensureSessionOwnership(
        client: Prisma.TransactionClient | PrismaService,
        userId: string,
        sessionId: string,
    ) {
        const session = await client.pomodoroSession.findUnique({
            where: { id: sessionId },
            include: this.sessionInclude,
        });

        if (!session) throw new NotFoundException('Phiên Pomodoro không tồn tại');
        if (session.userId !== userId) throw new ForbiddenException('Không có quyền');
        return session;
    }

    private getWorkDuration(focusMode: FocusMode): number {
        return focusMode === FocusMode.DEEP_FOCUS ? 50 : 25;
    }

    private getBreakDuration(focusMode: FocusMode): number {
        return focusMode === FocusMode.DEEP_FOCUS ? 10 : 5;
    }

    private getActiveElapsedSeconds(
        session: {
            status: PomodoroStatus;
            startedAt: Date;
            lastResumedAt: Date | null;
            accumulatedActiveSeconds: number;
        },
        now = new Date(),
    ): number {
        let seconds = session.accumulatedActiveSeconds;

        if (session.status === PomodoroStatus.IN_PROGRESS) {
            const segmentStartedAt = session.lastResumedAt ?? session.startedAt;
            seconds += Math.max(
                0,
                Math.floor((now.getTime() - segmentStartedAt.getTime()) / 1000),
            );
        }

        return seconds;
    }

    private secondsToRoundedMinutes(seconds: number): number {
        if (seconds <= 0) return 0;
        return Math.max(1, Math.round(seconds / 60));
    }

    private toPercent(completedMinutes: number, estimatedMinutes: number): number {
        if (estimatedMinutes <= 0) return 100;
        return Math.min(
            100,
            Math.round((completedMinutes / estimatedMinutes) * 100),
        );
    }

    private canRetrySession(session: {
        status: PomodoroStatus;
        sessionType: PomodoroSessionType;
        task: { status: TaskStatus; deadline: Date | null } | null;
        subtask: { isCompleted: boolean } | null;
    }) {
        if (session.status !== PomodoroStatus.CANCELLED) return false;
        if (session.sessionType !== PomodoroSessionType.WORK) return false;
        if (!session.task || session.task.status === TaskStatus.DONE) return false;
        if (session.subtask?.isCompleted) return false;
        return true;
    }

    private formatSession(session: any) {
        const activeElapsedSeconds = this.getActiveElapsedSeconds(session);
        const plannedSeconds = session.plannedDuration * 60;

        return {
            ...session,
            activeElapsedSeconds,
            remainingSeconds: Math.max(plannedSeconds - activeElapsedSeconds, 0),
        };
    }

    private async buildSessionResponse(userId: string, session: any) {
        const progress = session.taskId
            ? await this.getTaskProgress(
                userId,
                session.taskId,
                session.subtaskId ?? undefined,
            )
            : null;

        return {
            session: this.formatSession(session),
            progress,
        };
    }

    private resolveNextAction(session: any, progress: any) {
        if (session.sessionType === PomodoroSessionType.BREAK) {
            return progress?.task?.isCompleted ? 'TASK_COMPLETED' : 'START_NEXT_WORK';
        }

        if (progress?.task?.isCompleted) return 'TASK_COMPLETED';
        if (progress?.unit?.estimateMet) {
            return progress.unit.type === 'SUBTASK' ? 'UNIT_COMPLETED' : 'TASK_COMPLETED';
        }
        return 'START_BREAK';
    }
}
