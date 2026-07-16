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
                deadline: dto.deadline ? new Date(dto.deadline) : null,
                importance: dto.importance,
                focusMode: dto.focusMode,
                estimatedMinutes: dto.estimatedMinutes,
                isFixedTask: dto.isFixedTask ?? false,
                fixedStart: dto.fixedStart ? new Date(dto.fixedStart) : null,
                fixedEnd: dto.fixedEnd ? new Date(dto.fixedEnd) : null,
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

        return updated;
    }

    async findAll(userId: string, query: QueryTaskDto) {
        return this.prisma.task.findMany({
            where: {
                userId,
                ...(query.status && { status: query.status }),
            },
            include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { priorityScore: 'desc' },
        });
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
        return { ...task, priorityBreakdown: breakdown };
    }

    async update(userId: string, taskId: string, dto: UpdateTaskDto) {
        await this.ensureOwnership(userId, taskId);

        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.deadline !== undefined && { deadline: dto.deadline ? new Date(dto.deadline) : null }),
                ...(dto.importance !== undefined && { importance: dto.importance }),
                ...(dto.focusMode !== undefined && { focusMode: dto.focusMode }),
                ...(dto.estimatedMinutes !== undefined && { estimatedMinutes: dto.estimatedMinutes }),
                ...(dto.isFixedTask !== undefined && { isFixedTask: dto.isFixedTask }),
                ...(dto.fixedStart !== undefined && { fixedStart: dto.fixedStart ? new Date(dto.fixedStart) : null }),
                ...(dto.fixedEnd !== undefined && { fixedEnd: dto.fixedEnd ? new Date(dto.fixedEnd) : null }),
            },
            include: { subtasks: true },
        });

        // Tính lại priority score
        const { score } = await this.priorityScoreService.calculate(updated);
        return this.prisma.task.update({
            where: { id: taskId },
            data: { priorityScore: score },
            include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
        });
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

        return this.prisma.task.update({
            where: { id: taskId },
            data: {
                status,
                ...(status === TaskStatus.DONE && { completedAt: new Date() }),
                ...(status !== TaskStatus.DONE && { completedAt: null }),
            },
            include: { subtasks: { orderBy: { sortOrder: 'asc' } } },
        });
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

        return task;
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
}
