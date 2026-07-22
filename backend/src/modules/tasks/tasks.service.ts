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
                // Create inline subtasks if provided
                ...(dto.subtasks && dto.subtasks.length > 0 && {
                    subtasks: {
                        create: dto.subtasks.map((s, idx) => ({
                            title: s.title,
                            estimatedMinutes: s.estimatedMinutes ?? s.aiEstimatedMinutes ?? null,
                            sortOrder: idx,
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
            orderBy: { priorityScore: 'desc' },
        });
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
        await this.ensureOwnership(userId, taskId);

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.deadline !== undefined && { deadline: parseIncomingDate(dto.deadline) }),
                ...(dto.importance !== undefined && { importance: dto.importance }),
                ...(dto.focusMode !== undefined && { focusMode: dto.focusMode }),
                ...(dto.estimatedMinutes !== undefined && { estimatedMinutes: dto.estimatedMinutes }),
                ...(dto.isFixedTask !== undefined && { isFixedTask: dto.isFixedTask }),
                ...(dto.fixedStart !== undefined && { fixedStart: parseIncomingDate(dto.fixedStart) }),
                ...(dto.fixedEnd !== undefined && { fixedEnd: parseIncomingDate(dto.fixedEnd) }),
            },
            include: { subtasks: true },
        });

        // Tính lại priority score
        const { score } = await this.priorityScoreService.calculate(updated);
        const finalUpdated = await this.prisma.task.update({
            where: { id: taskId },
            data: { priorityScore: score },
            include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
        });
        return this.mapTaskResponse(finalUpdated);
    }

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
        return this.prisma.subtask.create({
            data: {
                taskId,
                title: dto.title,
                estimatedMinutes: dto.estimatedMinutes,
                sortOrder: dto.sortOrder ?? 0,
            },
        });
    }

    async updateSubtask(userId: string, subtaskId: string, dto: UpdateSubtaskDto) {
        const subtask = await this.prisma.subtask.findUnique({
            where: { id: subtaskId },
            include: { task: true },
        });
        if (!subtask) throw new NotFoundException('Subtask không tồn tại');
        if (subtask.task.userId !== userId) throw new ForbiddenException('Không có quyền');

        return this.prisma.subtask.update({
            where: { id: subtaskId },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.estimatedMinutes !== undefined && { estimatedMinutes: dto.estimatedMinutes }),
                ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
            },
        });
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
        return { message: 'Xóa subtask thành công' };
    }

    //HELPERS 

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
            deadline: task.deadline ? formatDateTime(task.deadline) : null,
            fixedStart: task.fixedStart ? formatDateTime(task.fixedStart) : null,
            fixedEnd: task.fixedEnd ? formatDateTime(task.fixedEnd) : null,
        };
    }
}

/* Format date dd/mm/yyyy, HH:mm using target timezone */
export function formatDateTime(value: Date | string | undefined | null, timezone = 'Asia/Ho_Chi_Minh'): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    try {
        const formatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: timezone,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(d);
        const partMap = new Map(parts.map(p => [p.type, p.value]));
        const day = partMap.get('day');
        const month = partMap.get('month');
        const year = partMap.get('year');
        const hour = partMap.get('hour');
        const minute = partMap.get('minute');
        return `${day}/${month}/${year}, ${hour}:${minute}`;
    } catch (e) {
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = d.getUTCFullYear();
        const HH = String(d.getUTCHours()).padStart(2, '0');
        const min = String(d.getUTCMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy}, ${HH}:${min}`;
    }
}

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
