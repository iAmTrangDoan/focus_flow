import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PriorityScoreService } from './priority-score.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly priorityScoreService: PriorityScoreService,
    ) { }

    async create(userId: string, dto: CreateTaskDto) {
        const nowWithGrace = new Date(Date.now() - 60000); // 1 minute grace period

        // Check deadline if provided
        if (dto.deadline) {
            const deadline = parseIncomingDate(dto.deadline);
            if (deadline && deadline < nowWithGrace) {
                throw new BadRequestException('Deadline không hợp lệ');
            }
        }

        // If fixed task, check overlaps before creating
        if (dto.isFixedTask && dto.fixedStart && dto.fixedEnd) {
            const start = parseIncomingDate(dto.fixedStart);
            const end = parseIncomingDate(dto.fixedEnd);
            if (start && end) {
                if (start < nowWithGrace) {
                    throw new BadRequestException('Thời gian bắt đầu không được ở trong quá khứ');
                }
                if (end <= start) {
                    throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
                }
                const conflict = await this.prisma.scheduleSlot.findFirst({
                    where: {
                        userId,
                        startAt: { lt: end },
                        endAt: { gt: start },
                    },
                });
                if (conflict) {
                    throw new BadRequestException('Khung giờ cố định bị trùng lặp với công việc khác.');
                }
            }
        }

        const task = await this.prisma.task.create({
            data: {
                userId,
                title: dto.title,
                description: dto.description,
                deadline: parseIncomingDate(dto.deadline),
                importance: dto.importance,
                focusMode: dto.focusMode,
                estimatedMinutes: dto.estimatedMinutes,
                isFixedTask: dto.isFixedTask ?? false,
                fixedStart: parseIncomingDate(dto.fixedStart),
                fixedEnd: parseIncomingDate(dto.fixedEnd),

                //Cập nhật subtask
                ...(dto.subtasks && dto.subtasks.length > 0 && {
                    subtasks: {
                        create: dto.subtasks.map((s, idx) => ({
                            title: s.title,
                            estimatedMinutes: s.estimatedMinutes ?? null,
                            sortOrder: s.sortOrder ?? idx,
                        })),
                    },
                }),
            },
            include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
        });

        // If fixed task with defined times, create a manual schedule slot
        if (task.isFixedTask && task.fixedStart && task.fixedEnd) {
            await this.prisma.scheduleSlot.create({
                data: {
                    userId,
                    taskId: task.id,
                    startAt: task.fixedStart,
                    endAt: task.fixedEnd,
                    isManual: true,
                },
            });
        }

        //Tính Priority score
        const { score } = await this.priorityScoreService.calculate(task);
        const updated = await this.prisma.task.update({
            where: { id: task.id },
            data: { priorityScore: score },
            include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
        });

        return this.mapTaskResponse(updated);
    }

    async findAll(userId: string, query: QueryTaskDto) {
        const tasks = await this.prisma.task.findMany({
            where: {
                userId,
                ...(query.status && { status: query.status }),
            },
            include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
        });

        // Tính toán lại priority score cho các task chưa hoàn thành
        const activeTasks = tasks.filter(t => t.status !== 'DONE');
        for (const task of activeTasks) {
            const { score } = await this.priorityScoreService.calculate(task);
            if (task.priorityScore !== score) {
                await this.prisma.task.update({
                    where: { id: task.id },
                    data: { priorityScore: score },
                });
                task.priorityScore = score;
            }
        }

        // Sắp xếp các task theo priority score giảm dần
        tasks.sort((a, b) => b.priorityScore - a.priorityScore);

        return tasks.map(t => this.mapTaskResponse(t));
    }

    async findOne(userId: string, taskId: string) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
        });

        if (!task) throw new NotFoundException('Task không tồn tại');
        if (task.userId !== userId) throw new ForbiddenException('Không có quyền truy cập task này');

        // Trả kèm priority score breakdown
        const { breakdown } = await this.priorityScoreService.calculate(task);
        return { ...this.mapTaskResponse(task), priorityBreakdown: breakdown };
    }

    async update(userId: string, taskId: string, dto: UpdateTaskDto) {

        const currentTask = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: {
                subtasks: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        })

        if (!currentTask) throw new NotFoundException('Task không tồn tại');

        const willBeFixed = dto.isFixedTask ?? currentTask.isFixedTask;
        const finalStart = dto.isFixedTask === false ? null : dto.fixedStart !== undefined ? parseIncomingDate(dto.fixedStart) : currentTask.fixedStart;

        const finalEnd = dto.isFixedTask === false ? null : dto.fixedEnd !== undefined ? parseIncomingDate(dto.fixedEnd) : currentTask.fixedEnd;
        if (willBeFixed) {
            if (!finalStart || !finalEnd) {
                throw new BadRequestException('Task cố định phải có giờ bắt đầu và giờ kết thúc');
            }

            if (finalEnd <= finalStart) {
                throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
            }

            const conflict = await this.prisma.scheduleSlot.findFirst({
                where: {
                    userId,
                    taskId: { not: taskId },
                    startAt: { lt: finalEnd },
                    endAt: { gt: finalStart },
                },
            });

            if (conflict) {
                throw new BadRequestException(
                    'Khung giờ cố định bị trùng với công việc khác',
                );
            }
        }

        // const updated = await this.prisma.$transaction.update({
        //     where: { id: taskId },
        //     data: {
        //         ...(dto.title !== undefined && { title: dto.title }),
        //         ...(dto.description !== undefined && { description: dto.description }),
        //         ...(dto.deadline !== undefined && { deadline: parseIncomingDate(dto.deadline) }),
        //         ...(dto.importance !== undefined && { importance: dto.importance }),
        //         ...(dto.focusMode !== undefined && { focusMode: dto.focusMode }),
        //         ...(dto.estimatedMinutes !== undefined && { estimatedMinutes: dto.estimatedMinutes }),
        //         ...(dto.isFixedTask !== undefined && { isFixedTask: dto.isFixedTask }),
        //         ...(dto.fixedStart !== undefined && { fixedStart: parseIncomingDate(dto.fixedStart) }),
        //         ...(dto.fixedEnd !== undefined && { fixedEnd: parseIncomingDate(dto.fixedEnd) }),
        //     },
        //     include: { subtasks: true },
        // });

        const updatedTask = await this.prisma.$transaction(async (tx) => {
            const taskData: Record<string, unknown> = {};

            if (dto.title !== undefined) {
                taskData.title = dto.title;
            }

            if (dto.description !== undefined) {
                taskData.description = dto.description;
            }

            if (dto.importance !== undefined) {
                taskData.importance = dto.importance;
            }

            if (dto.focusMode !== undefined) {
                taskData.focusMode = dto.focusMode;
            }

            if (dto.estimatedMinutes !== undefined) {
                taskData.estimatedMinutes =
                    dto.estimatedMinutes;
            }

            if (dto.deadline !== undefined) {
                taskData.deadline =
                    parseIncomingDate(dto.deadline);
            }

            if (dto.isFixedTask !== undefined) {
                taskData.isFixedTask = dto.isFixedTask;
            }

            /*
            * Khi chuyển sang fixed:
            * - lưu fixedStart/fixedEnd
            * - xóa deadline linh hoạt
            */
            if (willBeFixed) {
                taskData.fixedStart = finalStart;
                taskData.fixedEnd = finalEnd;

                if (dto.isFixedTask === true) {
                    taskData.deadline = null;
                }
            } else {
                /*
                 * Khi chuyển sang flexible:
                 * xóa hoàn toàn thời gian fixed cũ.
                 */
                taskData.fixedStart = null;
                taskData.fixedEnd = null;
            }

            await tx.task.update({
                where: { id: taskId },
                data: taskData,
            });

            // Đồng bộ subtasks

            if (dto.subtasks !== undefined) {
                const incomingIds = dto.subtasks
                    .map((subtask) => subtask.id)
                    .filter(
                        (id): id is string =>
                            typeof id === 'string' &&
                            id.length > 0,
                    );

                if (
                    new Set(incomingIds).size !==
                    incomingIds.length
                ) {
                    throw new BadRequestException(
                        'Danh sách subtask chứa id bị trùng',
                    );
                }

                const existingSubtasks =
                    await tx.subtask.findMany({
                        where: { taskId },
                        select: { id: true },
                    });

                const existingIdSet = new Set(
                    existingSubtasks.map(
                        (subtask) => subtask.id,
                    ),
                );

                const invalidId = incomingIds.find(
                    (id) => !existingIdSet.has(id),
                );

                if (invalidId) {
                    throw new BadRequestException(
                        `Subtask ${invalidId} không thuộc task này`,
                    );
                }

                /*
                * Xóa những subtask cũ không còn trong payload.
                *
                * subtasks === undefined:
                * không thay đổi danh sách.
                *
                * subtasks === []:
                * xóa toàn bộ danh sách.
                */
                if (incomingIds.length > 0) {
                    await tx.subtask.deleteMany({
                        where: {
                            taskId,
                            id: {
                                notIn: incomingIds,
                            },
                        },
                    });
                } else {
                    await tx.subtask.deleteMany({
                        where: { taskId },
                    });
                }

                for (
                    let index = 0;
                    index < dto.subtasks.length;
                    index++
                ) {
                    const subtask = dto.subtasks[index];
                    const isCompleted =
                        subtask.isCompleted ?? false;

                    if (subtask.id) {
                        await tx.subtask.update({
                            where: { id: subtask.id },
                            data: {
                                title: subtask.title,
                                estimatedMinutes:
                                    subtask.estimatedMinutes ??
                                    null,
                                sortOrder: index,
                                isCompleted,
                                completedAt: isCompleted
                                    ? new Date()
                                    : null,
                            },
                        });
                    } else {
                        await tx.subtask.create({
                            data: {
                                taskId,
                                title: subtask.title,
                                estimatedMinutes:
                                    subtask.estimatedMinutes ??
                                    null,
                                sortOrder: index,
                                isCompleted,
                                completedAt: isCompleted
                                    ? new Date()
                                    : null,
                            },
                        });
                    }
                }
                await this.updateParentTaskEstimatedMinutes(taskId, tx);
            }

            //Đồng bộ fixed schedule slot

            if (willBeFixed && finalStart && finalEnd) {
                const existingSlot =
                    await tx.scheduleSlot.findFirst({
                        where: {
                            taskId,
                            isManual: true,
                        },
                    });

                if (existingSlot) {
                    await tx.scheduleSlot.update({
                        where: { id: existingSlot.id },
                        data: {
                            startAt: finalStart,
                            endAt: finalEnd,
                        },
                    });
                } else {
                    await tx.scheduleSlot.create({
                        data: {
                            userId,
                            taskId,
                            startAt: finalStart,
                            endAt: finalEnd,
                            isManual: true,
                        },
                    });
                }
            } else {
                await tx.scheduleSlot.deleteMany({
                    where: {
                        taskId,
                        isManual: true,
                    },
                });
            }

            return tx.task.findUnique({
                where: { id: taskId },
                include: {
                    subtasks: {
                        orderBy: { sortOrder: 'asc' },
                    },
                },
            });
        });

        if (!updatedTask) {
            throw new NotFoundException('Task không tồn tại');
        }

        const { score } =
            await this.priorityScoreService.calculate(
                updatedTask,
            );

        const finalUpdated =
            await this.prisma.task.update({
                where: { id: taskId },
                data: {
                    priorityScore: score,
                },
                include: {
                    subtasks: {
                        orderBy: { sortOrder: 'asc' },
                    },
                },
            });

        return this.mapTaskResponse(finalUpdated);
    }

    //     // Sync schedule slot for fixed task
    //     if (updated.isFixedTask) {
    //         if (updated.fixedStart && updated.fixedEnd) {
    //             const existingSlot = await this.prisma.scheduleSlot.findFirst({
    //                 where: { taskId: updated.id, isManual: true },
    //             });
    //             if (existingSlot) {
    //                 await this.prisma.scheduleSlot.update({
    //                     where: { id: existingSlot.id },
    //                     data: {
    //                         startAt: updated.fixedStart,
    //                         endAt: updated.fixedEnd,
    //                     },
    //                 });
    //             } else {
    //                 await this.prisma.scheduleSlot.create({
    //                     data: {
    //                         userId,
    //                         taskId: updated.id,
    //                         startAt: updated.fixedStart,
    //                         endAt: updated.fixedEnd,
    //                         isManual: true,
    //                     },
    //                 });
    //             }
    //         } else {
    //             // If it is fixed but times are removed
    //             await this.prisma.scheduleSlot.deleteMany({
    //                 where: { taskId: updated.id, isManual: true },
    //             });
    //         }
    //     } else {
    //         // Delete any manual slot if it's no longer a fixed task
    //         await this.prisma.scheduleSlot.deleteMany({
    //             where: { taskId: updated.id, isManual: true },
    //         });
    //     }

    //     // Tính lại priority score
    //     const { score } = await this.priorityScoreService.calculate(updated);
    //     const finalUpdated = await this.prisma.task.update({
    //         where: { id: taskId },
    //         data: { priorityScore: score },
    //         include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
    //     });
    //     return this.mapTaskResponse(finalUpdated);
    // }

    async updateStatus(userId: string, taskId: string, statusStr: string) {
        await this.ensureOwnership(userId, taskId);

        // Map frontend status strings to Prisma enum
        const statusMap: Record<string, TaskStatus> = {
            'todo': TaskStatus.TODO,
            'in_progress': TaskStatus.IN_PROGRESS,
            'in-progress': TaskStatus.IN_PROGRESS,
            'done': TaskStatus.DONE,
            'completed': TaskStatus.DONE,
        };

        const status = statusMap[statusStr];
        if (!status) {
            throw new BadRequestException(`Trạng thái không hợp lệ: ${statusStr}`);
        }

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status,
                ...(status === TaskStatus.DONE && { completedAt: new Date() }),
                ...(status !== TaskStatus.DONE && { completedAt: null }),
            },
            include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
        });
        return this.mapTaskResponse(updated);
    }

    async remove(userId: string, taskId: string) {
        await this.ensureOwnership(userId, taskId);

        // Cascade: subtasks + schedule_slots sẽ bị xóa theo Prisma onDelete: Cascade
        await this.prisma.task.delete({ where: { id: taskId } });
        return { message: 'Xóa task thành công' };
    }

    async complete(userId: string, taskId: string) {
        await this.ensureOwnership(userId, taskId);

        // Đánh dấu task hoàn thành + tất cả subtask chưa xong
        const [task] = await this.prisma.$transaction([
            this.prisma.task.update({
                where: { id: taskId },
                data: {
                    status: TaskStatus.DONE,
                    completedAt: new Date(),
                },
                include: { subtasks: true },
            }),
            this.prisma.subtask.updateMany({
                where: { taskId, isCompleted: false },
                data: { isCompleted: true, completedAt: new Date() },
            }),
        ]);

        return this.mapTaskResponse(task);
    }

    //Subtask

    async findSubtasks(userId: string, taskId: string) {
        await this.ensureOwnership(userId, taskId);
        return this.prisma.subtask.findMany({
            where: { taskId },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async createSubtask(userId: string, taskId: string, dto: CreateSubtaskDto) {
        await this.ensureOwnership(userId, taskId);
        const subtask = await this.prisma.subtask.create({
            data: {
                taskId,
                title: dto.title,
                estimatedMinutes: dto.estimatedMinutes,
                sortOrder: dto.sortOrder ?? 0,
            },
        });
        await this.updateParentTaskEstimatedMinutes(taskId);
        return subtask;
    }

    async updateSubtask(userId: string, subtaskId: string, dto: UpdateSubtaskDto) {
        const subtask = await this.prisma.subtask.findUnique({
            where: { id: subtaskId },
            include: { task: true },
        });
        if (!subtask) throw new NotFoundException('Subtask không tồn tại');
        if (subtask.task.userId !== userId) throw new ForbiddenException('Không có quyền');

        const updated = await this.prisma.subtask.update({
            where: { id: subtaskId },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.estimatedMinutes !== undefined && { estimatedMinutes: dto.estimatedMinutes }),
                ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
                ...(dto.isCompleted !== undefined && {
                    isCompleted: dto.isCompleted,
                    completedAt: dto.isCompleted
                        ? new Date()
                        : null,
                }),
            },
        });
        await this.updateParentTaskEstimatedMinutes(subtask.taskId);
        return updated;
    }

    async completeSubtask(userId: string, subtaskId: string) {
        const subtask = await this.prisma.subtask.findUnique({
            where: { id: subtaskId },
            include: { task: true },
        });
        if (!subtask) throw new NotFoundException('Subtask không tồn tại');
        if (subtask.task.userId !== userId) throw new ForbiddenException('Không có quyền');

        const updated = await this.prisma.subtask.update({
            where: { id: subtaskId },
            data: { isCompleted: true, completedAt: new Date() },
        });

        // Nếu tất cả subtasks hoàn thành → cập nhật task status
        const remaining = await this.prisma.subtask.count({
            where: { taskId: subtask.taskId, isCompleted: false },
        });
        if (remaining === 0) {
            await this.prisma.task.update({
                where: { id: subtask.taskId },
                data: { status: TaskStatus.DONE, completedAt: new Date() },
            });
        } else {
            // Có ít nhất 1 subtask hoàn thành → IN_PROGRESS
            await this.prisma.task.update({
                where: { id: subtask.taskId },
                data: { status: TaskStatus.IN_PROGRESS },
            });
        }

        return updated;
    }

    async removeSubtask(userId: string, subtaskId: string) {
        const subtask = await this.prisma.subtask.findUnique({
            where: { id: subtaskId },
            include: { task: true },
        });
        if (!subtask) throw new NotFoundException('Subtask không tồn tại');
        if (subtask.task.userId !== userId) throw new ForbiddenException('Không có quyền');

        await this.prisma.subtask.delete({ where: { id: subtaskId } });
        await this.updateParentTaskEstimatedMinutes(subtask.taskId);
        return { message: 'Xóa subtask thành công' };
    }

    //HELPERS 

    private async updateParentTaskEstimatedMinutes(taskId: string, tx: any = this.prisma) {
        const subtasks = await tx.subtask.findMany({
            where: { taskId },
            select: { estimatedMinutes: true },
        });
        if (subtasks.length > 0) {
            const total = subtasks.reduce((sum, s) => sum + (s.estimatedMinutes ?? 0), 0);
            await tx.task.update({
                where: { id: taskId },
                data: { estimatedMinutes: total },
            });
        }
    }

    private async ensureOwnership(userId: string, taskId: string) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task không tồn tại');
        if (task.userId !== userId) throw new ForbiddenException('Không có quyền truy cập task này');
        return task;
    }

    private mapTaskResponse(task: any) {

        if (!task) return null;

        return {
            ...task,
            deadline: task.deadline
                ? new Date(task.deadline).toISOString()
                : null,
            fixedStart: task.fixedStart
                ? new Date(task.fixedStart).toISOString()
                : null,
            fixedEnd: task.fixedEnd
                ? new Date(task.fixedEnd).toISOString()
                : null,
        };
    }
}

/* Format date dd/mm/yyyy, HH:mm using target timezone */
// export function formatDateTime(value: Date | string | undefined | null, timezone = 'Asia/Ho_Chi_Minh'): string {
//     if (!value) return '';
//     const d = new Date(value);
//     if (isNaN(d.getTime())) return '';
//     try {
//         const formatter = new Intl.DateTimeFormat('vi-VN', {
//             timeZone: timezone,
//             day: '2-digit',
//             month: '2-digit',
//             year: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit',
//             hour12: false
//         });
//         const parts = formatter.formatToParts(d);
//         const partMap = new Map(parts.map(p => [p.type, p.value]));
//         const day = partMap.get('day');
//         const month = partMap.get('month');
//         const year = partMap.get('year');
//         const hour = partMap.get('hour');
//         const minute = partMap.get('minute');
//         return `${day}/${month}/${year}, ${hour}:${minute}`;
//     } catch (e) {
//         const dd = String(d.getUTCDate()).padStart(2, '0');
//         const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
//         const yyyy = d.getUTCFullYear();
//         const HH = String(d.getUTCHours()).padStart(2, '0');
//         const min = String(d.getUTCMinutes()).padStart(2, '0');
//         return `${dd}/${mm}/${yyyy}, ${HH}:${min}`;
//     }
// }

/* Parse date from ISO string or "dd/mm/yyyy, HH:mm" format */
export function parseIncomingDate(value: string | Date | undefined | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;

    // Try matching "dd/mm/yyyy, HH:mm"
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2})$/);
    if (match) {
        const [, dd, mm, yyyy, HH, min] = match;
        return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(min));
    }

    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}
