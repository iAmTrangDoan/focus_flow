import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import {
    EventType,
    FocusMode,
    PomodoroSessionType,
    PomodoroStatus,
    Prisma,
    RestructureStrategy,
    SlotStatus,
    TaskStatus,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { PriorityScoreService } from '../tasks/priority-score.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { parseWorkWindow, resolveLogicalDate, parseHHMM, WorkWindow } from '../../common/utils/work-window.util';
import { SystemLogService } from '../admin/system-log.service';

type SchedulableTask = Prisma.TaskGetPayload<{
    include: { subtasks: true };
}>;

type UnitType = 'TASK' | 'SUBTASK' | 'REMAINDER';
type EnergyFitSource = 'POMODORO_HISTORY' | 'COLD_START';

interface WorkUnit {
    taskId: string;
    taskTitle: string;
    subtaskId: string | null;
    title: string;
    minutes: number;
    type: UnitType;
    sortOrder: number;
}

interface FreeSegment {
    start: Date;
    end: Date;
    dayKey: string;
}

interface PlannedSlot {
    userId: string;
    taskId: string;
    subtaskId: string | null;
    startAt: Date;
    endAt: Date;
    logicalDate: Date;
    isManual: boolean;
    status: SlotStatus;
    restructureStrategy: RestructureStrategy;
}

export interface ScheduleWarning {
    code: string;
    message: string;
    taskId?: string;
    taskTitle?: string;
    subtaskId?: string;
    subtaskTitle?: string;
}

export interface ScheduleOverflow {
    taskId: string;
    taskTitle: string;
    taskType: 'FIXED' | 'FLEXIBLE';
    requiredMinutes: number;
    scheduledMinutes: number;
    remainingMinutes: number;
    unscheduledUnits: Array<{
        subtaskId: string | null;
        title: string;
        minutes: number;
        type: UnitType;
    }>;
    reason: string;
}

interface EnergyFitResult {
    scores: Map<number, number> | null;
    source: EnergyFitSource;
    totalSessions: number;
}

interface FrozenSlotRow {
    id: string;
    userId: string;
    taskId: string;
    subtaskId: string | null;
    startAt: Date;
    endAt: Date;
    taskTitle: string;
}

class MaxHeap<T> {
    private heap: T[] = [];

    constructor(private compare: (a: T, b: T) => number) {}

    get size(): number {
        return this.heap.length;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    push(item: T): void {
        this.heap.push(item);
        this.up(this.heap.length - 1);
    }

    pop(): T | undefined {
        if (this.isEmpty()) return undefined;
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.heap.length > 0 && bottom !== undefined) {
            this.heap[0] = bottom;
            this.down(0);
        }
        return top;
    }

    private up(index: number): void {
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[index], this.heap[parent]) > 0) {
                this.swap(index, parent);
                index = parent;
            } else {
                break;
            }
        }
    }

    private down(index: number): void {
        const length = this.heap.length;
        while (2 * index + 1 < length) {
            let child = 2 * index + 1;
            if (child + 1 < length && this.compare(this.heap[child + 1], this.heap[child]) > 0) {
                child++;
            }
            if (this.compare(this.heap[child], this.heap[index]) > 0) {
                this.swap(index, child);
                index = child;
            } else {
                break;
            }
        }
    }

    private swap(i: number, j: number): void {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
}

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);
    private readonly DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
    private readonly DEFAULT_STANDARD_MINUTES = 25;
    private readonly DEFAULT_DEEP_FOCUS_MINUTES = 50;
    private readonly MIN_SESSIONS_FOR_ENERGYFIT = 20;
    private readonly MIN_SESSIONS_PER_HOUR = 3;
    private readonly ENERGYFIT_HISTORY_LIMIT = 500;
    private readonly activeGenerations = new Map<string, boolean>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
        private readonly priorityScoreService: PriorityScoreService,
        private readonly notificationGateway: NotificationGateway,
        private readonly systemLogService: SystemLogService,
    ) {}

    /**
     * Tạo lịch tuần tự động theo unit và lưu vào database.
     */
    async generateWeekly(userId: string, shouldNotify = true) {
        if (this.activeGenerations.get(userId)) {
            throw new ConflictException('Đang có tác vụ sinh lịch đang chạy cho tài khoản này. Vui lòng đợi.');
        }

        this.activeGenerations.set(userId, true); //active generation flag dùng để ngăn chặn việc sinh lịch nhiều lần cùng lúc
        const scheduleStart = Date.now();
       
        try {
            const now = new Date();
            const { timezone, weekStart, weekEnd, weekStartLocal, weekEndLocal } 
                = await this.getWeekContext(userId, now); //lấy thông tin tuần hiện tại và múi giờ của user
                
            const planningStart = this.roundUpToFiveMinutes(now > weekStart ? now : weekStart);

            // 1. Get user preferences first
            const prefs = await this.prisma.userPreference.findUnique({ where: { userId } });
            
            // 2. Parse work window
            const workWindow = parseWorkWindow(
                prefs?.workStartTime ?? '09:00',
                prefs?.workEndTime ?? '18:00',
            );
            const workDays = prefs?.workDays ?? [1, 2, 3, 4, 5];

            // 3. Build raw segments (run in user timezone)
            const rawSegments = this.buildRawFreeSegments(
                weekStartLocal,
                weekEndLocal,
                planningStart,
                { hour: Math.floor(workWindow.startMinutes / 60), minute: workWindow.startMinutes % 60 },
                { hour: Math.floor(workWindow.endMinutes / 60), minute: workWindow.endMinutes % 60 },
                workDays,
                workWindow.isOvernight,
                timezone,
            );

            // 4. Compute actual query bounds from raw segments (for overnight shifts)
            let planningStartQuery = planningStart;
            let planningEndQuery = weekEnd;
            if (rawSegments.length > 0) {
                const minStart = rawSegments.reduce(
                    (min, seg) => seg.start < min ? seg.start : min,
                    rawSegments[0].start,
                );
                const maxEnd = rawSegments.reduce(
                    (max, seg) => seg.end > max ? seg.end : max,
                    rawSegments[0].end,
                );
                planningStartQuery = minStart < planningStart ? minStart : planningStart;
                planningEndQuery = maxEnd > weekEnd ? maxEnd : weekEnd;
            }

            // 5. Query tasks & preserved slots
            const [tasks, preservedSlots] = await Promise.all([
                this.prisma.task.findMany({
                    where: {
                        userId,
                        status: { in: ['TODO', 'IN_PROGRESS'] },
                    },
                    include: {
                        subtasks: { orderBy: { sortOrder: 'asc' } },
                    },
                }),
                this.prisma.scheduleSlot.findMany({
                    where: {
                        userId,
                        startAt: { lt: planningEndQuery },
                        endAt: { gt: planningStartQuery },
                        OR: [
                            { isManual: true },
                            { isCompleted: true },
                            { startAt: { lt: planningStart } },
                            { task: { status: TaskStatus.DONE } },
                        ],
                    },
                    orderBy: { startAt: 'asc' },
                }),
            ]);

            if (tasks.length === 0) {
                const existingSlots = await this.getSlotsInRange(userId, weekStart, weekEnd);
                return {
                    message: 'Không có task cần lập lịch',
                    timezone,
                    weekStart,
                    weekEnd,
                    energyFit: {
                        source: 'COLD_START' as EnergyFitSource,
                        totalSessions: 0,
                    },
                    summary: {
                        fixedTasksPinned: 0,
                        flexibleTasksScheduled: 0,
                        newSlotsCreated: 0,
                        overdueTaskCount: 0,
                        overflowTaskCount: 0,
                    },
                    slots: this.formatSlots(existingSlots),
                    overdueTasks: [],
                    overflow: [],
                    warnings: [],
                };
            }

            // Tính lại priority scores cho tất cả tasks trước khi chạy lập lịch
            await this.refreshPriorityScores(tasks);

            const overdueTasks = tasks.filter(
                (task) => task.deadline && task.deadline < now,
            );
            const warnings: ScheduleWarning[] = overdueTasks.map((task) => ({
                code: 'TASK_OVERDUE',
                taskId: task.id,
                taskTitle: task.title,
                message: `Task đã quá deadline ${task.deadline!.toISOString()} và được ưu tiên khi lập lịch.`,
            }));
            const overflow: ScheduleOverflow[] = [];

            const fixedTasks = tasks
                .filter((task) => task.isFixedTask)
                .sort(
                    (a, b) =>
                        (a.fixedStart?.getTime() ?? Number.MAX_SAFE_INTEGER) -
                        (b.fixedStart?.getTime() ?? Number.MAX_SAFE_INTEGER),
                );

            const flexibleTasks = tasks
                .filter((task) => !task.isFixedTask)
                .sort((a, b) => this.compareFlexibleTasks(a, b, now));

            const plannedSlots: PlannedSlot[] = [];
            const blockedIntervals = preservedSlots.map((slot) => ({
                startAt: slot.startAt,
                endAt: slot.endAt,
            }));
            const preservedSlotsByTask = new Map<string, typeof preservedSlots>();
            for (const slot of preservedSlots) {
                const list = preservedSlotsByTask.get(slot.taskId) ?? [];
                list.push(slot);
                preservedSlotsByTask.set(slot.taskId, list);
            }

            // Chỉ các slot đã hoàn thành hoặc slot tương lai được giữ lại mới được
            // trừ khỏi thời lượng cần xếp. Slot quá giờ chưa chạy chỉ là lịch sử,
            // tuyệt đối không được coi là thời lượng công việc đã thực hiện.
            const creditablePreservedSlotsByTask = new Map<string, typeof preservedSlots>();
            for (const slot of preservedSlots) {
                const isCreditable =
                    slot.isCompleted ||
                    (slot.startAt >= planningStart && slot.status !== SlotStatus.FROZEN_OVERDUE);
                if (!isCreditable) continue;

                const list = creditablePreservedSlotsByTask.get(slot.taskId) ?? [];
                list.push(slot);
                creditablePreservedSlotsByTask.set(slot.taskId, list);
            }

            const fixedTasksAlreadyPreserved = new Set(
                fixedTasks
                    .filter(
                        (task) =>
                            task.fixedStart &&
                            task.fixedEnd &&
                            (preservedSlotsByTask.get(task.id) ?? []).some(
                                (slot) =>
                                    slot.startAt < task.fixedEnd! &&
                                    slot.endAt > task.fixedStart!,
                            ),
                    )
                    .map((task) => task.id),
            );

            // 1. Ghim fixed tasks trước
            for (const task of fixedTasks) {
                if (fixedTasksAlreadyPreserved.has(task.id)) continue;
                const fixedResult = this.planFixedTask(
                    task,
                    userId,
                    planningStart,
                    weekStart,
                    weekEnd,
                    blockedIntervals,
                    timezone,
                    workWindow,
                );

                warnings.push(...fixedResult.warnings);

                if (fixedResult.slot) {
                    plannedSlots.push(fixedResult.slot);
                    blockedIntervals.push({
                        startAt: fixedResult.slot.startAt,
                        endAt: fixedResult.slot.endAt,
                    });
                }

                if (fixedResult.overflow) {
                    overflow.push(fixedResult.overflow);
                }
            }

            // 2. Load EnergyFit và tạo các FreeSegments trống
            const energyFit = await this.getEnergyFitScores(userId, timezone);
            const freeSegments = this.subtractBlockingSlotsFromSegments(
                rawSegments,
                blockedIntervals,
            );

            let flexibleTasksScheduled = 0;

            // 3. Xếp Flexible tasks với Priority Queue Max-Heap và ràng buộc thứ tự subtasks tuần tự
            const tasksMap = new Map<string, SchedulableTask>();
            const taskRemainingUnits = new Map<string, WorkUnit[]>();
            const taskUnitIndex = new Map<string, number>();
            const scheduledMinutesMap = new Map<string, number>();
            const unscheduledUnitsMap = new Map<string, WorkUnit[]>();
            const totalRequiredMinutesMap = new Map<string, number>();

            for (const task of flexibleTasks) {
                tasksMap.set(task.id, task);
                const { workMinutes, breakMinutes } = this.getFocusDuration(task.focusMode);
                const unitResult = this.buildWorkUnits(task);
                warnings.push(...unitResult.warnings);

                const units = this.removePreservedUnits(
                    unitResult.units,
                    creditablePreservedSlotsByTask.get(task.id) ?? [],
                    workMinutes,
                    breakMinutes,
                );

                taskRemainingUnits.set(task.id, units);
                taskUnitIndex.set(task.id, 0);
                scheduledMinutesMap.set(task.id, 0);
                unscheduledUnitsMap.set(task.id, []);

                const getOccupiedMinutes = (unit: WorkUnit) => {
                    const sessions = Math.ceil(unit.minutes / workMinutes);
                    return unit.minutes + sessions * breakMinutes;
                };
                const requiredMinutes = units.reduce(
                    (sum, unit) => sum + getOccupiedMinutes(unit),
                    0,
                );
                totalRequiredMinutesMap.set(task.id, requiredMinutes);
            }

            const pq = new MaxHeap<WorkUnit>((a, b) => this.compareUnits(a, b, now, tasksMap));

            for (const task of flexibleTasks) {
                const units = taskRemainingUnits.get(task.id) || [];
                if (units.length > 0) {
                    pq.push(units[0]);
                }
            }

            while (!pq.isEmpty()) {
                const currentUnit = pq.pop()!;
                const taskId = currentUnit.taskId;
                const task = tasksMap.get(taskId)!;
                const { workMinutes, breakMinutes } = this.getFocusDuration(task.focusMode);

                const sessions = Math.ceil(currentUnit.minutes / workMinutes);
                const totalUnitDuration = currentUnit.minutes + sessions * breakMinutes;

                let remainingMinutes = totalUnitDuration;

                while (remainingMinutes > 0) {
                    const minMinutes = workMinutes + breakMinutes;
                    const placement = this.allocateUnit(
                        freeSegments,
                        remainingMinutes,
                        minMinutes,
                        timezone,
                        energyFit.scores,
                        task.deadline,
                    );

                    if (!placement) {
                        break;
                    }

                    plannedSlots.push({
                        userId,
                        taskId: task.id,
                        subtaskId: currentUnit.subtaskId,
                        startAt: placement.startAt,
                        endAt: placement.endAt,
                        isManual: false,
                        status: SlotStatus.SCHEDULED,
                        restructureStrategy: RestructureStrategy.NONE,
                        logicalDate: new Date(placement.dayKey + 'T00:00:00.000Z'),
                    });

                    const durationFit = Math.round(
                        (placement.endAt.getTime() - placement.startAt.getTime()) / 60_000,
                    );
                    remainingMinutes -= durationFit;
                    scheduledMinutesMap.set(taskId, (scheduledMinutesMap.get(taskId) || 0) + durationFit);
                }

                if (remainingMinutes <= 0) {
                    const nextIndex = taskUnitIndex.get(taskId)! + 1;
                    taskUnitIndex.set(taskId, nextIndex);
                    const units = taskRemainingUnits.get(taskId)!;
                    if (nextIndex < units.length) {
                        pq.push(units[nextIndex]);
                    }
                } else {
                    // Overflow occurred
                    const workFraction = workMinutes / (workMinutes + breakMinutes);
                    const remainingWorkMinutes = Math.round(remainingMinutes * workFraction);
                    if (remainingWorkMinutes > 0) {
                        unscheduledUnitsMap.get(taskId)!.push({
                            ...currentUnit,
                            minutes: remainingWorkMinutes,
                        });
                    }

                    const nextIndex = taskUnitIndex.get(taskId)! + 1;
                    const units = taskRemainingUnits.get(taskId)!;
                    for (let i = nextIndex; i < units.length; i++) {
                        unscheduledUnitsMap.get(taskId)!.push(units[i]);
                    }
                }
            }

            for (const task of flexibleTasks) {
                const scheduledMinutes = scheduledMinutesMap.get(task.id) || 0;
                if (scheduledMinutes > 0) {
                    flexibleTasksScheduled++;
                }

                const unscheduledUnits = unscheduledUnitsMap.get(task.id) || [];
                if (unscheduledUnits.length > 0) {
                    const { workMinutes, breakMinutes } = this.getFocusDuration(task.focusMode);
                    const getOccupiedMinutes = (unit: WorkUnit) => {
                        const sessions = Math.ceil(unit.minutes / workMinutes);
                        return unit.minutes + sessions * breakMinutes;
                    };
                    const remainingMinutes = unscheduledUnits.reduce(
                        (sum, unit) => sum + getOccupiedMinutes(unit),
                        0,
                    );
                    const requiredMinutes = totalRequiredMinutesMap.get(task.id) || 0;

                    overflow.push({
                        taskId: task.id,
                        taskTitle: task.title,
                        taskType: 'FLEXIBLE',
                        requiredMinutes,
                        scheduledMinutes,
                        remainingMinutes,
                        unscheduledUnits: unscheduledUnits.map((unit) => ({
                            subtaskId: unit.subtaskId,
                            title: unit.title,
                            minutes: getOccupiedMinutes(unit),
                            type: unit.type,
                        })),
                        reason: 'WEEK_CAPACITY_EXCEEDED',
                    });

                    warnings.push({
                        code: 'UNIT_NOT_SCHEDULED',
                        taskId: task.id,
                        taskTitle: task.title,
                        message: `Còn ${remainingMinutes} phút thuộc ${unscheduledUnits.length} unit chưa có chỗ trong tuần.`,
                    });
                }
            }

            const logicalWeekStart = new Date(weekStartLocal.toISODate() + 'T00:00:00.000Z');
            const logicalWeekEnd = new Date(weekEndLocal.toISODate() + 'T00:00:00.000Z');

            // 4. Chỉ khi kế hoạch đã tính xong hoàn toàn mới thực hiện transaction xóa và tạo slots
            await this.prisma.$transaction(async (tx) => {
                await tx.scheduleSlot.deleteMany({
                    where: {
                        userId,
                        isCompleted: false,
                        status: SlotStatus.FROZEN_OVERDUE,
                    },
                });

                await tx.scheduleSlot.deleteMany({
                    where: {
                        userId,
                        isManual: false,
                        isCompleted: false,
                        status: SlotStatus.SCHEDULED,
                        startAt: { gte: planningStart },
                        logicalDate: {
                            gte: logicalWeekStart,
                            lt: logicalWeekEnd,
                        },
                    },
                });

                if (plannedSlots.length > 0) {
                    await tx.scheduleSlot.createMany({ data: plannedSlots });
                }

            });

        const createdSlots = await this.getSlotsInRange(userId, weekStart, weekEnd);

        if (shouldNotify) {
            await this.notifyScheduleResult(
                userId,
                plannedSlots.length,
                overflow,
                overdueTasks.length,
            );
        }

        this.notificationGateway.emitToUser(userId, 'schedule_updated', {
            type: 'weekly_generated',
            occurredAt: new Date(),
        });

        const result = {
            message:
                overflow.length > 0
                    ? 'Đã tạo lịch nhưng vẫn còn task chưa được xếp hết'
                    : 'Đã tạo lịch tuần thành công',
            timezone,
            weekStart,
            weekEnd,
            energyFit: {
                source: energyFit.source,
                totalSessions: energyFit.totalSessions,
            },
            summary: {
                fixedTasksPinned:
                    plannedSlots.filter((slot) =>
                        fixedTasks.some((task) => task.id === slot.taskId),
                    ).length + fixedTasksAlreadyPreserved.size,
                flexibleTasksScheduled,
                newSlotsCreated: plannedSlots.length,
                overdueTaskCount: overdueTasks.length,
                overflowTaskCount: overflow.length,
            },
            slots: this.formatSlots(createdSlots),
            overdueTasks: overdueTasks.map((task) => ({
                taskId: task.id,
                title: task.title,
                deadline: task.deadline,
                delayMinutes: Math.max(
                    0,
                    Math.floor(
                        (now.getTime() - task.deadline!.getTime()) / 60_000,
                    ),
                ),
            })),
            overflow,
            warnings,
        };

        this.systemLogService.log({
            category: 'SCHEDULER',
            eventType: 'SCHEDULE_GENERATED',
            status: 'SUCCESS',
            userId,
            durationMs: Date.now() - scheduleStart,
            metadata: {
                taskCount: tasks.length,
                newSlotsCreated: plannedSlots.length,
                overflowTaskCount: overflow.length,
                overdueTaskCount: overdueTasks.length,
                flexibleTasksScheduled,
            },
        });

        return result;
        } finally {
            this.activeGenerations.delete(userId);
        }
    }

    /**
     * Luồng 1: đóng băng các slot đã tới giờ nhưng chưa có PomodoroSession.
     * Chạy theo lô mỗi 5 phút. Frontend vẫn tự tính trạng thái trễ theo đồng hồ
     * để hiển thị ngay; cron chịu trách nhiệm ghi nhận bền vững và analytics.
     */
    @Cron('0 */5 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
    async detectOverdueSlots(): Promise<{ frozenCount: number }> {
        const cronName = 'detectOverdueSlots';
        const cronStart = Date.now();
        await this.systemLogService.logAsync({
            category: 'CRON',
            eventType: 'CRON_STARTED',
            status: 'STARTED',
            source: cronName,
        });
        try {
            const result = await this.runDetectOverdueSlots();
            await this.systemLogService.logAsync({
                category: 'CRON',
                eventType: 'CRON_COMPLETED',
                status: 'SUCCESS',
                source: cronName,
                durationMs: Date.now() - cronStart,
                metadata: { frozenCount: result.frozenCount },
            });
            return result;
        } catch (err: any) {
            await this.systemLogService.logAsync({
                category: 'CRON',
                eventType: 'CRON_FAILED',
                status: 'FAILED',
                source: cronName,
                durationMs: Date.now() - cronStart,
                errorMessage: err?.message,
            });
            throw err;
        }
    }

    private async runDetectOverdueSlots(): Promise<{ frozenCount: number }> {

        const now = new Date();
        const rows = await this.prisma.$queryRaw<FrozenSlotRow[]>(Prisma.sql`
            WITH frozen AS (
                UPDATE "schedule_slots" AS ss
                SET
                    "status" = 'FROZEN_OVERDUE',
                    "updated_at" = NOW()
                WHERE ss."status" = 'SCHEDULED'
                  AND ss."is_completed" = FALSE
                  AND ss."start_at" < NOW()
                  AND NOT EXISTS (
                      SELECT 1
                      FROM "pomodoro_sessions" AS ps
                      WHERE ps."schedule_slot_id" = ss."id"
                  )
                RETURNING
                    ss."id",
                    ss."user_id",
                    ss."task_id",
                    ss."subtask_id",
                    ss."start_at",
                    ss."end_at"
            )
            SELECT
                f."id" AS "id",
                f."user_id" AS "userId",
                f."task_id" AS "taskId",
                f."subtask_id" AS "subtaskId",
                f."start_at" AS "startAt",
                f."end_at" AS "endAt",
                t."title" AS "taskTitle"
            FROM frozen AS f
            JOIN "tasks" AS t ON t."id" = f."task_id"
        `);

        if (rows.length > 0) {
            await this.prisma.behaviorLog.createMany({
                data: rows.map((slot) => ({
                    userId: slot.userId,
                    taskId: slot.taskId,
                    eventType: EventType.TASK_DELAYED,
                    scheduledTime: slot.startAt,
                    delayMinutes: Math.max(
                        0,
                        Math.floor((now.getTime() - slot.startAt.getTime()) / 60_000),
                    ),
                    occurredAt: now,
                    dedupeKey: `slot-overdue:${slot.id}`,
                    metadata: {
                        source: 'OVERDUE_SLOT_CRON',
                        scheduleSlotId: slot.id,
                        subtaskId: slot.subtaskId,
                    } as Prisma.InputJsonValue,
                })),
                skipDuplicates: true,
            });
        }

        const frozenSlots = rows;

        if (frozenSlots.length === 0) {
            return { frozenCount: 0 };
        }

        const byUser = new Map<string, FrozenSlotRow[]>();
        for (const slot of frozenSlots) {
            const list = byUser.get(slot.userId) ?? [];
            list.push(slot);
            byUser.set(slot.userId, list);
        }

        await Promise.all(
            [...byUser.entries()].map(async ([userId, slots]) => {
                const first = slots[0];
                const description = slots.length === 1
                    ? `“${first.taskTitle}” đã đến giờ nhưng chưa bắt đầu. Bạn có thể bắt đầu muộn hoặc tái cấu trúc lịch.`
                    : `Có ${slots.length} phiên đã đến giờ nhưng chưa bắt đầu. Lịch được giữ nguyên để bạn chủ động xử lý.`;

                await this.notificationService.createNotification(
                    userId,
                    'schedule',
                    slots.length === 1
                        ? 'Phiên làm việc đã trễ'
                        : `${slots.length} phiên làm việc đã trễ`,
                    description,
                    slots.length === 1 ? 'start_pomodoro' : 'view_details',
                    {
                        metadata: {
                            type: 'SCHEDULE_SLOTS_FROZEN',
                            slotIds: slots.map((slot) => slot.id),
                        },
                        dedupeKey: `slot-overdue-batch:${userId}:${slots[0].id}:${slots.length}`,
                    },
                );

                this.notificationGateway.emitToUser(
                    userId,
                    'schedule_slots_frozen',
                    {
                        slots: slots.map((slot) => ({
                            id: slot.id,
                            taskId: slot.taskId,
                            subtaskId: slot.subtaskId,
                            taskTitle: slot.taskTitle,
                            startAt: slot.startAt,
                            endAt: slot.endAt,
                            status: SlotStatus.FROZEN_OVERDUE,
                            delayMinutes: Math.max(
                                0,
                                Math.floor((now.getTime() - slot.startAt.getTime()) / 60_000),
                            ),
                        })),
                        occurredAt: now,
                    },
                );
            }),
        );

        this.logger.log(`Frozen ${frozenSlots.length} overdue schedule slot(s).`);
        return { frozenCount: frozenSlots.length };
    }

    /**
     * Preview tác động nghiệp vụ, chưa ghi DB. Đây là bản preview đơn giản cho
     * phạm vi đồ án: giữ slot cũ làm lịch sử và sinh lại phần lịch tương lai.
     */
    async previewOverdueSlotRestructure(
        userId: string,
        slotId: string,
        strategy: RestructureStrategy,
    ) {
        const slot = await this.ensureSlotOwnership(userId, slotId);
        this.assertSupportedOverdueStrategy(
            slot.status,
            strategy,
            slot.task.isFixedTask,
        );

        // Tạo một slot mô phỏng cho tương lai (ví dụ: dịch chuyển 24h sau) để làm preview cho frontend hiển thị
        const oneDayMs = 24 * 60 * 60 * 1000;
        const simulatedStart = new Date(slot.startAt.getTime() + oneDayMs);
        const simulatedEnd = new Date(slot.endAt.getTime() + oneDayMs);

        const simulatedSlot = {
            ...slot,
            id: `preview-${slot.id}`,
            startAt: simulatedStart,
            endAt: simulatedEnd,
            status: SlotStatus.SCHEDULED,
        };

        return {
            originalSlot: slot,
            affectedSlots: [simulatedSlot],
            warnings: [],
        };
    }

    /**
     * Xác nhận tái cấu trúc cho một slot quá giờ.
     * Penalty chỉ tăng ở bước confirm, không tăng khi preview.
     */
    async confirmOverdueSlotRestructure(
        userId: string,
        slotId: string,
        strategy: RestructureStrategy,
    ) {
        const slot = await this.ensureSlotOwnership(userId, slotId);
        this.assertSupportedOverdueStrategy(
            slot.status,
            strategy,
            slot.task.isFixedTask,
        );
        if (slot.restructureStrategy !== RestructureStrategy.NONE) {
            throw new ConflictException('Slot này đã được tái cấu trúc trước đó.');
        }
        const now = new Date();

        await this.prisma.$transaction(async (tx) => {
            await tx.scheduleSlot.update({
                where: { id: slotId },
                data: { restructureStrategy: strategy },
            });

            await tx.task.update({
                where: { id: slot.taskId },
                data: { rescheduleCount: { increment: 1 } },
            });

            await tx.behaviorLog.createMany({
                data: [{
                    userId,
                    taskId: slot.taskId,
                    eventType: EventType.RESCHEDULE_PENALTY,
                    occurredAt: now,
                    dedupeKey: `overdue-slot-restructure:${slotId}`,
                    metadata: {
                        source: 'OVERDUE_SLOT_ONE_TOUCH',
                        scheduleSlotId: slotId,
                        strategy,
                    } as Prisma.InputJsonValue,
                }],
                skipDuplicates: true,
            });
        });

        // generateWeekly giữ slot quá giờ làm lịch sử nhưng không trừ nó khỏi
        // thời lượng công việc còn lại; phần việc bị lỡ sẽ được xếp lại.
        const schedule = await this.generateWeekly(userId, false);

        this.systemLogService.log({
            category: 'SCHEDULER',
            eventType: 'SCHEDULE_RESTRUCTURED',
            status: 'SUCCESS',
            userId,
            metadata: {
                slotId,
                taskId: slot.taskId,
                taskTitle: slot.task.title,
                strategy,
            },
        });

        await this.notificationService.createNotification(
            userId,
            'schedule',
            'Đã tái cấu trúc lịch',
            `Phần việc bị lỡ của “${slot.task.title}” đã được đưa lại vào lịch tương lai.`,
            'view_details',
            {
                metadata: {
                    type: 'OVERDUE_SLOT_RESTRUCTURED',
                    slotId,
                    taskId: slot.taskId,
                    strategy,
                },
                dedupeKey: `overdue-slot-restructured:${slotId}`,
            },
        );

        this.notificationGateway.emitToUser(userId, 'schedule_updated', {
            type: 'overdue_slot_restructured',
            slotId,
            taskId: slot.taskId,
            occurredAt: now,
        });

        return schedule;
    }

    async getWeeklySchedule(userId: string) {
        const { weekStart, weekEnd } = await this.getWeekContext(
            userId,
            new Date(),
        );
        const slots = await this.getSlotsInRange(userId, weekStart, weekEnd);
        return this.formatSlots(slots);
    }

    async getSlots(userId: string, from?: string, to?: string) {
        const where: Prisma.ScheduleSlotWhereInput = { userId };

        if (from || to) {
            const parsedFrom = from ? this.parseDateOrThrow(from, 'from') : null;
            const parsedTo = to ? this.parseDateOrThrow(to, 'to') : null;

            if (parsedFrom && parsedTo) {
                where.startAt = { lt: parsedTo };
                where.endAt = { gt: parsedFrom };
            } else if (parsedFrom) {
                where.startAt = { gte: parsedFrom };
            } else if (parsedTo) {
                where.startAt = { lte: parsedTo };
            }
        }

        const slots = await this.prisma.scheduleSlot.findMany({
            where,
            include: this.slotInclude,
            orderBy: { startAt: 'asc' },
        });

        return this.formatSlots(slots);
    }

    async updateSlot(
        userId: string,
        slotId: string,
        startAt: string,
        endAt: string,
    ) {
        const slot = await this.ensureSlotOwnership(userId, slotId);
        const newStart = this.parseDateOrThrow(startAt, 'startAt');
        const newEnd = this.parseDateOrThrow(endAt, 'endAt');

        if (newEnd <= newStart) {
            throw new BadRequestException(
                'Thời gian kết thúc phải sau thời gian bắt đầu',
            );
        }

        if (slot.task.isFixedTask) {
            throw new BadRequestException(
                'Không kéo thả slot của fixed task. Hãy cập nhật fixedStart/fixedEnd của task.',
            );
        }

        // Kiểm tra ràng buộc thứ tự thực hiện của subtask
        if (slot.subtaskId && slot.subtask) {
            const subtasks = await this.prisma.subtask.findMany({
                where: { taskId: slot.taskId },
                orderBy: { sortOrder: 'asc' },
            });

            const currentIndex = subtasks.findIndex((s) => s.id === slot.subtaskId);

            if (currentIndex !== -1) {
                const otherSlots = await this.prisma.scheduleSlot.findMany({
                    where: {
                        taskId: slot.taskId,
                        id: { not: slotId },
                        status: { not: SlotStatus.FROZEN_OVERDUE },
                    },
                    include: { subtask: true },
                });

                // Các subtask phía trước (phải kết thúc trước khi subtask hiện tại bắt đầu)
                const predecessors = subtasks.slice(0, currentIndex);
                for (const pred of predecessors) {
                    const predSlots = otherSlots.filter((os) => os.subtaskId === pred.id);
                    for (const predSlot of predSlots) {
                        if (newStart.getTime() < predSlot.endAt.getTime()) {
                            throw new BadRequestException(
                                `Subtask '${slot.subtask.title}' không được thực hiện trước subtask '${pred.title}'.`,
                            );
                        }
                    }
                }

                // Các subtask phía sau (phải bắt đầu sau khi subtask hiện tại kết thúc)
                const successors = subtasks.slice(currentIndex + 1);
                for (const succ of successors) {
                    const succSlots = otherSlots.filter((os) => os.subtaskId === succ.id);
                    for (const succSlot of succSlots) {
                        if (newEnd.getTime() > succSlot.startAt.getTime()) {
                            throw new BadRequestException(
                                `'${slot.subtask.title}' không được thực hiện sau '${succ.title}'.`,
                            );
                        }
                    }
                }
            }
        }

        const conflict = await this.prisma.scheduleSlot.findFirst({
            where: {
                userId,
                id: { not: slotId },
                startAt: { lt: newEnd },
                endAt: { gt: newStart },
            },
        });

        if (conflict) {
            throw new BadRequestException(
                'Xung đột thời gian với slot khác',
            );
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { preference: true },
        });
        const tz = user?.timezone || 'Asia/Ho_Chi_Minh';
        const workWindow = parseWorkWindow(
            user?.preference?.workStartTime || '09:00',
            user?.preference?.workEndTime || '18:00',
        );
        const logicalDate = resolveLogicalDate(newStart, tz, workWindow);

        const updated = await this.prisma.scheduleSlot.update({
            where: { id: slotId },
            data: {
                startAt: newStart,
                endAt: newEnd,
                isManual: true,
                logicalDate,
            },
            include: this.slotInclude,
        });

        this.notificationGateway.emitToUser(userId, 'schedule_updated', {
            type: 'slot_updated',
            slotId,
            occurredAt: new Date(),
        });

        return this.formatSlot(updated);
    }

    async removeSlot(userId: string, slotId: string) {
        await this.ensureSlotOwnership(userId, slotId);
        await this.prisma.scheduleSlot.delete({ where: { id: slotId } });
        
        this.notificationGateway.emitToUser(userId, 'schedule_updated', {
            type: 'slot_removed',
            slotId,
            occurredAt: new Date(),
        });

        return { message: 'Xóa slot thành công' };
    }

    /**
     * Tái cấu trúc toàn bộ lịch tương lai.
     */
    async restructure(userId: string) {
        const now = new Date();
        const { weekStartLocal } = await this.getWeekContext(userId, now);
        const logicalWeekStart = new Date(weekStartLocal.toISODate() + 'T00:00:00.000Z');

        const affectedSlots = await this.prisma.scheduleSlot.findMany({
            where: {
                userId,
                isManual: false,
                status: SlotStatus.SCHEDULED,
                startAt: { gte: now },
                logicalDate: { gte: logicalWeekStart },
            },
            select: { taskId: true },
        });

        const taskIds = [...new Set(affectedSlots.map((slot) => slot.taskId))];

        if (taskIds.length > 0) {
            await this.prisma.$transaction(async (tx) => {
                await tx.task.updateMany({
                    where: { id: { in: taskIds }, userId },
                    data: { rescheduleCount: { increment: 1 } },
                });

                await tx.behaviorLog.createMany({
                    data: taskIds.map((taskId) => ({
                        userId,
                        taskId,
                        eventType: EventType.RESCHEDULE_PENALTY,
                        occurredAt: now,
                        metadata: {
                            source: 'GLOBAL_RESTRUCTURE',
                        } as Prisma.InputJsonValue,
                    })),
                });
            });
        }

        const result = await this.generateWeekly(userId, false);

        await this.notificationService.createNotification(
            userId,
            'schedule',
            'Tái cấu trúc lịch hoàn tất',
            `Đã tái cấu trúc lịch tương lai và áp dụng penalty cho ${taskIds.length} task.`,
            'view_details',
        );

        return result;
    }

    // ─── PRIORITY SCORE ────────────────────────────────────────

    private async refreshPriorityScores(tasks: SchedulableTask[]) {
        const results = await Promise.all(
            tasks.map(async (task) => ({
                task,
                score: (await this.priorityScoreService.calculate(task)).score,
            })),
        );

        const updates = results
            .filter(
                ({ task, score }) =>
                    Math.abs(task.priorityScore - score) > 0.001,
            )
            .map(({ task, score }) => {
                task.priorityScore = score;
                return this.prisma.task.update({
                    where: { id: task.id },
                    data: { priorityScore: score },
                });
            });

        if (updates.length > 0) {
            await this.prisma.$transaction(updates);
        }
    }

    //sắp xếp task linh hoạt
    private compareFlexibleTasks(
        a: SchedulableTask,
        b: SchedulableTask,
        now: Date,
    ) {
        const aOverdue = Boolean(a.deadline && a.deadline < now);
        const bOverdue = Boolean(b.deadline && b.deadline < now);

        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (a.priorityScore !== b.priorityScore) {
            return b.priorityScore - a.priorityScore;
        }

        const aDeadline = a.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDeadline = b.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (aDeadline !== bDeadline) return aDeadline - bDeadline;

        return a.createdAt.getTime() - b.createdAt.getTime();
    }

    private compareUnits(
        a: WorkUnit,
        b: WorkUnit,
        now: Date,
        tasksMap: Map<string, SchedulableTask>,
    ): number {
        const taskA = tasksMap.get(a.taskId);
        const taskB = tasksMap.get(b.taskId);

        if (!taskA) return -1;
        if (!taskB) return 1;

        // 1. Overdue
        const aOverdue = Boolean(taskA.deadline && taskA.deadline < now);
        const bOverdue = Boolean(taskB.deadline && taskB.deadline < now);
        if (aOverdue !== bOverdue) {
            return aOverdue ? 1 : -1;
        }

        // 2. Priority Score of parent task
        if (Math.abs(taskA.priorityScore - taskB.priorityScore) > 0.0001) {
            return taskA.priorityScore > taskB.priorityScore ? 1 : -1;
        }

        // 3. Deadline
        const aDeadline = taskA.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDeadline = taskB.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (aDeadline !== bDeadline) {
            return aDeadline < bDeadline ? 1 : -1;
        }

        // 4. CreatedAt
        const aCreated = taskA.createdAt.getTime();
        const bCreated = taskB.createdAt.getTime();
        if (aCreated !== bCreated) {
            return aCreated < bCreated ? 1 : -1;
        }

        // 5. sortOrder
        if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder < b.sortOrder ? 1 : -1;
        }

        // 6. Deterministic tie-break
        return a.taskId < b.taskId ? 1 : -1;
    }

    // ─── WORK UNITS ────────────────────────────────────────────

    private buildWorkUnits(task: SchedulableTask): {
        units: WorkUnit[];
        warnings: ScheduleWarning[];
    } {
        const warnings: ScheduleWarning[] = [];
        const defaultMinutes = this.getDefaultUnitMinutes(task.focusMode);
        const allSubtasks = task.subtasks;

        if (allSubtasks.length === 0) {
            return {
                units: [
                    {
                        taskId: task.id,
                        taskTitle: task.title,
                        subtaskId: null,
                        title: task.title,
                        minutes: task.estimatedMinutes ?? defaultMinutes,
                        type: 'TASK',
                        sortOrder: 0,
                    },
                ],
                warnings,
            };
        }

        const completedMinutes = allSubtasks
            .filter((subtask) => subtask.isCompleted)
            .reduce(
                (sum, subtask) =>
                    sum + (subtask.estimatedMinutes ?? defaultMinutes),
                0,
            );

        const pendingSubtasks = allSubtasks.filter(
            (subtask) => !subtask.isCompleted,
        );

        const units: WorkUnit[] = pendingSubtasks.map((subtask) => ({
            taskId: task.id,
            taskTitle: task.title,
            subtaskId: subtask.id,
            title: subtask.title,
            minutes: subtask.estimatedMinutes ?? defaultMinutes,
            type: 'SUBTASK',
            sortOrder: subtask.sortOrder,
        }));

        const pendingMinutes = units.reduce(
            (sum, unit) => sum + unit.minutes,
            0,
        );

        if (task.estimatedMinutes != null) {
            const parentRemainingMinutes = Math.max(
                task.estimatedMinutes - completedMinutes,
                0,
            );

            if (parentRemainingMinutes > pendingMinutes) {
                const uncoveredMinutes =
                    parentRemainingMinutes - pendingMinutes;
                units.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    subtaskId: null,
                    title: `Phần còn lại của ${task.title}`,
                    minutes: uncoveredMinutes,
                    type: 'REMAINDER',
                    sortOrder: Number.MAX_SAFE_INTEGER,
                });
                warnings.push({
                    code: 'SUBTASK_COVERAGE_GAP',
                    taskId: task.id,
                    taskTitle: task.title,
                    message: `Subtask chưa phủ ${uncoveredMinutes} phút; phần dư được tạo thành một unit riêng.`,
                });
            } else if (pendingMinutes > parentRemainingMinutes) {
                warnings.push({
                    code: 'SUBTASK_ESTIMATE_EXCEEDS_TASK_ESTIMATE',
                    taskId: task.id,
                    taskTitle: task.title,
                    message: `Tổng thời lượng subtask chưa hoàn thành (${pendingMinutes} phút) lớn hơn estimatedMinutes còn lại (${parentRemainingMinutes} phút); scheduler giữ nguyên các subtask để không làm mất công việc.`,
                });
            }
        }

        if (units.length === 0) {
            warnings.push({
                code: 'NO_REMAINING_UNIT',
                taskId: task.id,
                taskTitle: task.title,
                message:
                    'Task chưa DONE nhưng toàn bộ subtask đã hoàn thành và không còn thời lượng dư để lập lịch.',
            });
        }

        return { units, warnings };
    }

    private getDefaultUnitMinutes(focusMode: FocusMode) {
        return focusMode === FocusMode.DEEP_FOCUS
            ? this.DEFAULT_DEEP_FOCUS_MINUTES
            : this.DEFAULT_STANDARD_MINUTES;
    }

    private removePreservedUnits(
        units: WorkUnit[],
        slots: Array<{ subtaskId: string | null; startAt: Date; endAt: Date }>,
        workMinutes: number,
        breakMinutes: number,
    ): WorkUnit[] {
        const preservedMinutesBySubtask = new Map<string, number>();
        let preservedNullMinutes = 0;

        for (const slot of slots) {
            const slotDuration = (slot.endAt.getTime() - slot.startAt.getTime()) / 60_000;
            const slotWorkMinutes = slotDuration * (workMinutes / (workMinutes + breakMinutes));
            if (slot.subtaskId) {
                const current = preservedMinutesBySubtask.get(slot.subtaskId) ?? 0;
                preservedMinutesBySubtask.set(slot.subtaskId, current + slotWorkMinutes);
            } else {
                preservedNullMinutes += slotWorkMinutes;
            }
        }

        const result: WorkUnit[] = [];

        for (const unit of units) {
            if (unit.subtaskId) {
                const preservedWork = preservedMinutesBySubtask.get(unit.subtaskId) ?? 0;
                if (preservedWork > 0) {
                    const remainingWork = unit.minutes - preservedWork;
                    if (remainingWork > 0.001) {
                        result.push({
                            ...unit,
                            minutes: Math.round(remainingWork),
                        });
                    }
                } else {
                    result.push(unit);
                }
            } else {
                if (preservedNullMinutes > 0) {
                    const remainingWork = unit.minutes - preservedNullMinutes;
                    preservedNullMinutes = Math.max(0, preservedNullMinutes - unit.minutes);
                    if (remainingWork > 0.001) {
                        result.push({
                            ...unit,
                            minutes: Math.round(remainingWork),
                        });
                    }
                } else {
                    result.push(unit);
                }
            }
        }

        return result;
    }

    // ─── FIXED TASK ────────────────────────────────────────────

    private planFixedTask(
        task: SchedulableTask,
        userId: string,
        planningStart: Date,
        weekStart: Date,
        weekEnd: Date,
        blockedIntervals: Array<{ startAt: Date; endAt: Date }>,
        timezone: string,
        workWindow: WorkWindow,
    ): {
        slot: PlannedSlot | null;
        overflow: ScheduleOverflow | null;
        warnings: ScheduleWarning[];
    } {
        const warnings: ScheduleWarning[] = [];

        if (!task.fixedStart || !task.fixedEnd) {
            const message =
                'Fixed task thiếu fixedStart hoặc fixedEnd và không được chuyển thành flexible task.';
            warnings.push({
                code: 'INVALID_FIXED_TASK',
                taskId: task.id,
                taskTitle: task.title,
                message,
            });
            return {
                slot: null,
                warnings,
                overflow: this.fixedOverflow(task, 0, message),
            };
        }

        if (task.fixedEnd <= task.fixedStart) {
            const message = 'fixedEnd phải sau fixedStart.';
            warnings.push({
                code: 'INVALID_FIXED_RANGE',
                taskId: task.id,
                taskTitle: task.title,
                message,
            });
            return {
                slot: null,
                warnings,
                overflow: this.fixedOverflow(task, 0, message),
            };
        }

        if (task.fixedStart < weekStart || task.fixedStart >= weekEnd) {
            return { slot: null, overflow: null, warnings };
        }

        if (task.fixedEnd <= planningStart || task.fixedStart < planningStart) {
            const message =
                'Khung giờ fixed đã bắt đầu hoặc kết thúc nên scheduler không tạo lại slot mới.';
            warnings.push({
                code: 'FIXED_TIME_PASSED',
                taskId: task.id,
                taskTitle: task.title,
                message,
            });
            return {
                slot: null,
                warnings,
                overflow: this.fixedOverflow(task, 0, message),
            };
        }

        const conflict = blockedIntervals.some(
            (blocked) =>
                blocked.startAt < task.fixedEnd! &&
                blocked.endAt > task.fixedStart!,
        );

        if (conflict) {
            const message =
                'Fixed task xung đột với manual slot, slot đang diễn ra hoặc fixed task khác.';
            warnings.push({
                code: 'FIXED_TASK_CONFLICT',
                taskId: task.id,
                taskTitle: task.title,
                message,
            });
            return {
                slot: null,
                warnings,
                overflow: this.fixedOverflow(task, 0, message),
            };
        }

        const actualMinutes = Math.round(
            (task.fixedEnd.getTime() - task.fixedStart.getTime()) / 60_000,
        );

        if (
            task.estimatedMinutes != null &&
            task.estimatedMinutes !== actualMinutes
        ) {
            warnings.push({
                code: 'FIXED_DURATION_MISMATCH',
                taskId: task.id,
                taskTitle: task.title,
                message: `Fixed interval dài ${actualMinutes} phút, khác estimatedMinutes ${task.estimatedMinutes} phút. Fixed interval được xem là nguồn thời gian chính xác.`,
            });
        }

        return {
            slot: {
                userId,
                taskId: task.id,
                subtaskId: null,
                startAt: task.fixedStart,
                endAt: task.fixedEnd,
                isManual: false,
                status: SlotStatus.SCHEDULED,
                restructureStrategy: RestructureStrategy.NONE,
                logicalDate: resolveLogicalDate(task.fixedStart, timezone, workWindow),
            },
            overflow: null,
            warnings,
        };
    }

    private fixedOverflow(
        task: SchedulableTask,
        scheduledMinutes: number,
        reason: string,
    ): ScheduleOverflow {
        const requiredMinutes = task.fixedStart && task.fixedEnd
            ? Math.max(
                  0,
                  Math.round(
                      (task.fixedEnd.getTime() - task.fixedStart.getTime()) /
                          60_000,
                  ),
              )
            : task.estimatedMinutes ?? this.getDefaultUnitMinutes(task.focusMode);

        return {
            taskId: task.id,
            taskTitle: task.title,
            taskType: 'FIXED',
            requiredMinutes,
            scheduledMinutes,
            remainingMinutes: Math.max(requiredMinutes - scheduledMinutes, 0),
            unscheduledUnits: [
                {
                    subtaskId: null,
                    title: task.title,
                    minutes: requiredMinutes,
                    type: 'TASK',
                },
            ],
            reason,
        };
    }

    // ─── FLEXIBLE TASK ALLOCATION ─────────────────────────────

    private allocateUnit(
        freeSegments: FreeSegment[],
        unitMinutes: number,
        minMinutes: number,
        timezone: string,
        energyScores: Map<number, number> | null,
        deadline: Date | null,
    ): { startAt: Date; endAt: Date; dayKey: string } | null {
        const dayKeys = [...new Set(freeSegments.map((segment) => segment.dayKey))];

        for (const dayKey of dayKeys) {
            const candidates: Array<{
                segmentIndex: number;
                startAt: Date;
                endAt: Date;
                score: number;
                beforeDeadline: boolean;
                duration: number;
            }> = [];

            freeSegments.forEach((segment, segmentIndex) => {
                if (segment.dayKey !== dayKey) return;

                const segmentMinutes = (segment.end.getTime() - segment.start.getTime()) / 60_000;
                if (segmentMinutes < minMinutes) return;

                const starts = this.getCandidateStarts(segment, minMinutes, timezone, energyScores);

                for (const startAt of starts) {
                    const maxPossibleMinutes = (segment.end.getTime() - startAt.getTime()) / 60_000;
                    if (maxPossibleMinutes < minMinutes) continue;

                    const duration = Math.min(unitMinutes, maxPossibleMinutes);
                    const endAt = new Date(startAt.getTime() + duration * 60_000);

                    const hour = DateTime.fromJSDate(startAt).setZone(timezone).hour;
                    candidates.push({
                        segmentIndex,
                        startAt,
                        endAt,
                        score: energyScores?.get(hour) ?? 0.5,
                        beforeDeadline: !deadline || endAt <= deadline,
                        duration,
                    });
                }
            });

            if (candidates.length === 0) continue;

            candidates.sort((a, b) => {
                if (a.beforeDeadline !== b.beforeDeadline) {
                    return a.beforeDeadline ? -1 : 1;
                }
                if (energyScores && a.score !== b.score) {
                    return b.score - a.score;
                }
                return a.startAt.getTime() - b.startAt.getTime();
            });

            const selected = candidates[0];

            this.consumeFreeSegment(
                freeSegments,
                selected.segmentIndex,
                selected.startAt,
                selected.endAt,
                minMinutes,
            );

            return {
                startAt: selected.startAt,
                endAt: selected.endAt,
                dayKey,
            };
        }

        return null;
    }

    private getCandidateStarts(
        segment: FreeSegment,
        minMinutes: number,
        timezone: string,
        energyScores: Map<number, number> | null,
    ) {
        const latestStart = new Date(
            segment.end.getTime() - minMinutes * 60_000,
        );

        if (latestStart < segment.start) return [];
        if (!energyScores) return [new Date(segment.start)];

        const starts = new Map<number, Date>();
        starts.set(segment.start.getTime(), new Date(segment.start));

        let hourBoundary = DateTime.fromJSDate(segment.start)
            .setZone(timezone)
            .startOf('hour')
            .plus({ hours: 1 });

        while (hourBoundary.toUTC().toMillis() <= latestStart.getTime()) {
            const candidate = hourBoundary.toUTC().toJSDate();
            if (candidate >= segment.start) {
                starts.set(candidate.getTime(), candidate);
            }
            hourBoundary = hourBoundary.plus({ hours: 1 });
        }

        return [...starts.values()].sort(
            (a, b) => a.getTime() - b.getTime(),
        );
    }

    private consumeFreeSegment(
        freeSegments: FreeSegment[],
        segmentIndex: number,
        usedStart: Date,
        usedEnd: Date,
        minMinutes: number,
    ) {
        const segment = freeSegments[segmentIndex];
        const replacements: FreeSegment[] = [];

        if (usedStart > segment.start) {
            replacements.push({
                start: segment.start,
                end: usedStart,
                dayKey: segment.dayKey,
            });
        }

        if (usedEnd < segment.end) {
            replacements.push({
                start: usedEnd,
                end: segment.end,
                dayKey: segment.dayKey,
            });
        }

        const validReplacements = replacements.filter(
            (r) => (r.end.getTime() - r.start.getTime()) / 60_000 >= minMinutes,
        );

        freeSegments.splice(segmentIndex, 1, ...validReplacements);
        freeSegments.sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    // ─── FREE TIME + ENERGY FIT ───────────────────────────────

    private buildRawFreeSegments(
        weekStartLocal: DateTime,
        weekEndLocal: DateTime,
        planningStart: Date,
        workStart: { hour: number; minute: number },
        workEnd: { hour: number; minute: number },
        workDays: number[],
        isOvernight: boolean,
        timezone: string,
    ): FreeSegment[] {
        const rawSegments: FreeSegment[] = [];
        let day = weekStartLocal.startOf('day');
        const planningStartMillis = planningStart.getTime();

        while (day.toMillis() < weekEndLocal.toMillis()) {
            if (!workDays.includes(day.weekday)) {
                day = day.plus({ days: 1 });
                continue;
            }

            let dayStart = day.set({
                hour: workStart.hour,
                minute: workStart.minute,
                second: 0,
                millisecond: 0,
            });

            const dayEnd = isOvernight
                ? day.plus({ days: 1 }).set({
                      hour: workEnd.hour,
                      minute: workEnd.minute,
                      second: 0,
                      millisecond: 0,
                  })
                : day.set({
                      hour: workEnd.hour,
                      minute: workEnd.minute,
                      second: 0,
                      millisecond: 0,
                  });

            if (dayStart.toMillis() < planningStartMillis) {
                dayStart = DateTime.fromMillis(planningStartMillis, {
                    zone: timezone,
                });
            }

            if (dayStart.toMillis() < dayEnd.toMillis()) {
                rawSegments.push({
                    start: dayStart.toUTC().toJSDate(),
                    end: dayEnd.toUTC().toJSDate(),
                    dayKey: day.toISODate()!,
                });
            }

            day = day.plus({ days: 1 });
        }

        return rawSegments;
    }

    private subtractBlockingSlotsFromSegments(
        rawSegments: FreeSegment[],
        blockingSlots: Array<{ startAt: Date; endAt: Date }>,
    ): FreeSegment[] {
        const result: FreeSegment[] = [];
        for (const segment of rawSegments) {
            const window = { start: segment.start, end: segment.end };
            const subtracted = this.subtractBlockingSlots(window, blockingSlots);
            for (const sub of subtracted) {
                result.push({
                    start: sub.start,
                    end: sub.end,
                    dayKey: segment.dayKey,
                });
            }
        }
        return result.sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    private subtractBlockingSlots(
        window: { start: Date; end: Date },
        blockingSlots: Array<{ startAt: Date; endAt: Date }>,
    ) {
        let segments = [
            { start: new Date(window.start), end: new Date(window.end) },
        ];

        for (const blocking of blockingSlots) {
            const nextSegments: Array<{ start: Date; end: Date }> = [];

            for (const segment of segments) {
                if (
                    blocking.endAt <= segment.start ||
                    blocking.startAt >= segment.end
                ) {
                    nextSegments.push(segment);
                    continue;
                }

                if (blocking.startAt > segment.start) {
                    nextSegments.push({
                        start: segment.start,
                        end: new Date(blocking.startAt),
                    });
                }

                if (blocking.endAt < segment.end) {
                    nextSegments.push({
                        start: new Date(blocking.endAt),
                        end: segment.end,
                    });
                }
            }

            segments = nextSegments;
        }

        return segments;
    }

    private async getEnergyFitScores(
        userId: string,
        timezone: string,
    ): Promise<EnergyFitResult> {
        const sessions = await this.prisma.pomodoroSession.findMany({
            where: {
                userId,
                sessionType: PomodoroSessionType.WORK,
                status: {
                    in: [
                        PomodoroStatus.COMPLETED,
                        PomodoroStatus.CANCELLED,
                    ],
                },
            },
            select: { startedAt: true, status: true },
            orderBy: { startedAt: 'desc' },
            take: this.ENERGYFIT_HISTORY_LIMIT,
        });

        if (sessions.length < this.MIN_SESSIONS_FOR_ENERGYFIT) {
            return {
                scores: null,
                source: 'COLD_START',
                totalSessions: sessions.length,
            };
        }

        const totals = new Array<number>(24).fill(0);
        const completed = new Array<number>(24).fill(0);

        for (const session of sessions) {
            const hour = DateTime.fromJSDate(session.startedAt)
                .setZone(timezone).hour;
            totals[hour]++;
            if (session.status === PomodoroStatus.COMPLETED) {
                completed[hour]++;
            }
        }

        const scores = new Map<number, number>();
        for (let hour = 0; hour < 24; hour++) {
            scores.set(
                hour,
                totals[hour] < this.MIN_SESSIONS_PER_HOUR
                    ? 0.5
                    : completed[hour] / totals[hour],
            );
        }

        return {
            scores,
            source: 'POMODORO_HISTORY',
            totalSessions: sessions.length,
        };
    }

    private assertSupportedOverdueStrategy(
        status: SlotStatus,
        strategy: RestructureStrategy,
        isFixedTask: boolean,
    ) {
        if (status !== SlotStatus.FROZEN_OVERDUE) {
            throw new BadRequestException('Chỉ có thể tái cấu trúc slot đang FROZEN_OVERDUE.');
        }

        if (isFixedTask) {
            throw new BadRequestException(
                'Fixed task không thể dời tự động. Hãy cập nhật fixedStart/fixedEnd hoặc chuyển task thành flexible.',
            );
        }

        // TRIM_SUBTASKS chỉ đúng khi schema có cờ xác định subtask tùy chọn.
        // Không tự ý xóa/lược subtask vì có thể làm mất nội dung bắt buộc.
        if (strategy !== RestructureStrategy.SHIFT_TIME) {
            throw new BadRequestException(
                'Hiện tại chỉ hỗ trợ SHIFT_TIME. TRIM_SUBTASKS cần bổ sung thuộc tính isOptional cho subtask.',
            );
        }
    }

    // ─── QUERY + FORMAT HELPERS ────────────────────────────────

    private readonly slotInclude = {
        task: {
            select: {
                id: true,
                title: true,
                status: true,
                importance: true,
                focusMode: true,
                isFixedTask: true,
                subtasks: { select: { id: true } },
            },
        },
        subtask: {
            select: {
                id: true,
                title: true,
                estimatedMinutes: true,
                isCompleted: true,
                sortOrder: true,
            },
        },
    } satisfies Prisma.ScheduleSlotInclude;

    private async getSlotsInRange(userId: string, from: Date, to: Date) {
        return this.prisma.scheduleSlot.findMany({
            where: {
                userId,
                startAt: { lt: to },
                endAt: { gt: from },
            },
            include: this.slotInclude,
            orderBy: { startAt: 'asc' },
        });
    }

    private formatSlots(slots: any[]) {
        return slots.map((slot) => this.formatSlot(slot));
    }

    private formatSlot(slot: any) {
        const unitType: UnitType = slot.subtask
            ? 'SUBTASK'
            : slot.task.isFixedTask || slot.task.subtasks.length === 0
              ? 'TASK'
              : 'REMAINDER';

        const unitTitle = slot.subtask
            ? slot.subtask.title
            : unitType === 'REMAINDER'
              ? `Phần còn lại của ${slot.task.title}`
              : slot.task.title;

        return {
            ...slot,
            unit: {
                type: unitType,
                title: unitTitle,
                taskId: slot.taskId,
                subtaskId: slot.subtaskId,
                plannedMinutes: Math.round(
                    (slot.endAt.getTime() - slot.startAt.getTime()) / 60_000,
                ),
            },
        };
    }

    private async ensureSlotOwnership(userId: string, slotId: string) {
        const slot = await this.prisma.scheduleSlot.findUnique({
            where: { id: slotId },
            include: this.slotInclude,
        });
        if (!slot) throw new NotFoundException('Slot không tồn tại');
        if (slot.userId !== userId) {
            throw new ForbiddenException('Không có quyền');
        }
        return slot;
    }

    private async getWeekContext(userId: string, now: Date) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { timezone: true },
        });
        if (!user) throw new NotFoundException('User không tồn tại');

        const requestedTimezone = user.timezone || this.DEFAULT_TIMEZONE;
        const candidate = DateTime.fromJSDate(now).setZone(requestedTimezone);
        const timezone = candidate.isValid
            ? requestedTimezone
            : this.DEFAULT_TIMEZONE;
        const nowLocal = DateTime.fromJSDate(now).setZone(timezone);
        const weekStartLocal = nowLocal.startOf('week').startOf('day');
        const weekEndLocal = weekStartLocal.plus({ days: 7 });

        return {
            timezone,
            weekStartLocal,
            weekEndLocal,
            weekStart: weekStartLocal.toUTC().toJSDate(),
            weekEnd: weekEndLocal.toUTC().toJSDate(),
        };
    }

    private getFocusDuration(focusMode: FocusMode) {
        if (focusMode === FocusMode.DEEP_FOCUS) {
            return { workMinutes: 50, breakMinutes: 10 };
        }
        return { workMinutes: 25, breakMinutes: 5 };
    }

    private parseTime(value: string): [number, number] {
        try {
            const minutes = parseHHMM(value);
            return [Math.floor(minutes / 60), minutes % 60];
        } catch {
            return [9, 0];
        }
    }

    private parseDateOrThrow(value: string, field: string) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new BadRequestException(`${field} không phải ngày hợp lệ`);
        }
        return date;
    }

    private roundUpToFiveMinutes(date: Date) {
        const interval = 5 * 60_000;
        return new Date(Math.ceil(date.getTime() / interval) * interval);
    }

    private async notifyScheduleResult(
        userId: string,
        createdCount: number,
        overflow: ScheduleOverflow[],
        overdueCount: number,
    ) {
        const remainingMinutes = overflow.reduce(
            (sum, item) => sum + item.remainingMinutes,
            0,
        );

        await this.notificationService.createNotification(
            userId,
            'schedule',
            overflow.length > 0
                ? 'Lịch tuần chưa xếp hết'
                : 'Lên lịch tuần hoàn tất',
            overflow.length > 0
                ? `Đã tạo ${createdCount} slot, còn ${remainingMinutes} phút thuộc ${overflow.length} task chưa có chỗ. Có ${overdueCount} task quá deadline.`
                : `Đã tạo ${createdCount} slot theo unit. Có ${overdueCount} task quá deadline được ưu tiên.`,
            'view_details',
        );
    }
}
