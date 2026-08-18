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
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_ENTITY = 5;

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

    // ─── TASK NOTES ───────────────────────────────────────────

    @Patch(':id/notes')
    @ApiOperation({ summary: 'Cập nhật ghi chú cho task (autosave)' })
    updateTaskNotes(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: UpdateNotesDto,
    ) {
        return this.tasksService.updateTaskNotes(userId, id, dto.notes);
    }

    // ─── TASK ATTACHMENTS ─────────────────────────────────────

    @Get(':id/attachments')
    @ApiOperation({ summary: 'Lấy danh sách file đính kèm của task' })
    getTaskAttachments(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
    ) {
        return this.tasksService.getAttachments(userId, { taskId: id });
    }

    @Post(':id/attachments')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload file đính kèm cho task (không có subtask)' })
    async uploadTaskAttachment(
        @CurrentUser('id') userId: string,
        @Param('id') taskId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('sessionId') sessionId?: string,
    ) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn file để upload.');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new BadRequestException('File không được vượt quá 10MB.');
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                'Chỉ chấp nhận file PDF, DOC, DOCX, TXT, PNG, JPG, JPEG.',
            );
        }
        return this.tasksService.uploadAttachment(userId, {
            taskId,
            subtaskId: undefined,
            sessionId,
            file,
            maxFiles: MAX_FILES_PER_ENTITY,
        });
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

    // ─── SUBTASK NOTES ────────────────────────────────────────

    @Patch(':id/notes')
    @ApiOperation({ summary: 'Cập nhật ghi chú cho subtask (autosave)' })
    updateSubtaskNotes(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: UpdateNotesDto,
    ) {
        return this.tasksService.updateSubtaskNotes(userId, id, dto.notes);
    }

    // ─── SUBTASK ATTACHMENTS ──────────────────────────────────

    @Get(':id/attachments')
    @ApiOperation({ summary: 'Lấy danh sách file đính kèm của subtask' })
    getSubtaskAttachments(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
    ) {
        return this.tasksService.getAttachments(userId, { subtaskId: id });
    }

    @Post(':id/attachments')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload file đính kèm cho subtask' })
    async uploadSubtaskAttachment(
        @CurrentUser('id') userId: string,
        @Param('id') subtaskId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('sessionId') sessionId?: string,
    ) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn file để upload.');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new BadRequestException('File không được vượt quá 10MB.');
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                'Chỉ chấp nhận file PDF, DOC, DOCX, TXT, PNG, JPG, JPEG.',
            );
        }
        return this.tasksService.uploadAttachment(userId, {
            subtaskId,
            taskId: undefined,
            sessionId,
            file,
            maxFiles: MAX_FILES_PER_ENTITY,
        });
    }
}

/**
 * Controller cho attachment routes: /api/attachments/:id
 */
@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
    constructor(private readonly tasksService: TasksService) {}

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa file đính kèm' })
    remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.tasksService.removeAttachment(userId, id);
    }
}

