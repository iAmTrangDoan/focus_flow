import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    // ─── TASKS ─────────────────────────────────────────────────

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách task (sắp xếp theo priority score)' })
    findAll(@CurrentUser('id') userId: string, @Query() query: QueryTaskDto) {
        return this.tasksService.findAll(userId, query);
    }

    @Post()
    @ApiOperation({ summary: 'Tạo task mới' })
    create(@CurrentUser('id') userId: string, @Body() dto: CreateTaskDto) {
        return this.tasksService.create(userId, dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Xem chi tiết task kèm subtasks + priority breakdown' })
    findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.tasksService.findOne(userId, id);
    }

    @Put(':id')
    @Patch(':id')
    @ApiOperation({ summary: 'Cập nhật task' })
    update(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: UpdateTaskDto,
    ) {
        return this.tasksService.update(userId, id, dto);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Cập nhật nhanh trạng thái task' })
    updateStatus(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body('status') status: string,
    ) {
        return this.tasksService.updateStatus(userId, id, status);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa task' })
    remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.tasksService.remove(userId, id);
    }

    @Patch(':id/complete')
    @ApiOperation({ summary: 'Đánh dấu hoàn thành task' })
    complete(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.tasksService.complete(userId, id);
    }

    // ─── SUBTASKS ──────────────────────────────────────────────

    @Get(':id/subtasks')
    @ApiOperation({ summary: 'Lấy danh sách subtask của task' })
    findSubtasks(@CurrentUser('id') userId: string, @Param('id') taskId: string) {
        return this.tasksService.findSubtasks(userId, taskId);
    }

    @Post(':id/subtasks')
    @ApiOperation({ summary: 'Thêm subtask mới' })
    createSubtask(
        @CurrentUser('id') userId: string,
        @Param('id') taskId: string,
        @Body() dto: CreateSubtaskDto,
    ) {
        return this.tasksService.createSubtask(userId, taskId, dto);
    }
}

/**
 * Controller cho subtask routes: /api/subtasks/:id
 */
@ApiTags('Subtasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subtasks')
export class SubtasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Patch(':id')
    @ApiOperation({ summary: 'Cập nhật subtask' })
    update(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: UpdateSubtaskDto,
    ) {
        return this.tasksService.updateSubtask(userId, id, dto);
    }

    @Patch(':id/complete')
    @ApiOperation({ summary: 'Đánh dấu hoàn thành subtask' })
    complete(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.tasksService.completeSubtask(userId, id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa subtask' })
    remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.tasksService.removeSubtask(userId, id);
    }
}
