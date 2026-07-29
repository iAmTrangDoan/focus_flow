import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { ProgressQueryDto } from './dto/progress-query.dto';
import { QuerySessionDto } from './dto/query-session.dto';
import { QuickFeedbackDto } from './dto/quick-feedback.dto';
import { PomodoroService } from './pomodoro.service';

@ApiTags('Pomodoro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pomodoro/sessions')
export class PomodoroController {
    constructor(private readonly pomodoroService: PomodoroService) {}

    @Post()
    @ApiOperation({ summary: 'Bắt đầu phiên Pomodoro cho task/subtask' })
    start(@CurrentUser('id') userId: string, @Body() dto: CreateSessionDto) {
        return this.pomodoroService.startSession(userId, dto);
    }

    @Post(':id/retry')
    @ApiOperation({ summary: 'Tạo phiên mới để chạy lại phiên WORK đã drop' })
    retry(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.pomodoroService.retryCancelledSession(userId, id);
    }

    @Get('current')
    @ApiOperation({ summary: 'Lấy phiên đang chạy hoặc đang tạm dừng' })
    getCurrent(@CurrentUser('id') userId: string) {
        return this.pomodoroService.getCurrentSession(userId);
    }

    @Get('task/:taskId/progress')
    @ApiOperation({ summary: 'Lấy tiến độ task và unit đang chọn' })
    getProgress(
        @CurrentUser('id') userId: string,
        @Param('taskId') taskId: string,
        @Query() query: ProgressQueryDto,
    ) {
        return this.pomodoroService.getTaskProgress(
            userId,
            taskId,
            query.subtaskId,
        );
    }

    @Get()
    @ApiOperation({ summary: 'Lịch sử các phiên Pomodoro' })
    getHistory(
        @CurrentUser('id') userId: string,
        @Query() query: QuerySessionDto,
    ) {
        return this.pomodoroService.getHistory(userId, query.status);
    }

    @Patch(':id/pause')
    @ApiOperation({ summary: 'Tạm dừng phiên và lưu thời gian đã chạy' })
    pause(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.pomodoroService.pauseSession(userId, id);
    }

    @Patch(':id/resume')
    @ApiOperation({ summary: 'Tiếp tục phiên đang tạm dừng' })
    resume(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.pomodoroService.resumeSession(userId, id);
    }

    @Patch(':id/complete')
    @ApiOperation({ summary: 'Hoàn thành phiên và tính lại tiến độ công việc' })
    complete(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.pomodoroService.completeSession(userId, id);
    }

    // @Patch(':id/cancel')
    // @ApiOperation({ summary: 'Drop phiên và yêu cầu khảo sát nhanh' })
    // cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
    //     return this.pomodoroService.cancelSession(userId, id);
    // }

    @Patch(':id/cancel')
    @ApiOperation({
        summary: 'Drop phiên và lưu lý do',
    })
    cancel(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: QuickFeedbackDto,
    ) {
        return this.pomodoroService.cancelSession(
            userId,
            id,
            dto.reason,
            dto.details,    
        );
    }

    @Post(':id/quick-feedback')
    @ApiOperation({ summary: 'Lưu lý do người dùng drop phiên' })
    quickFeedback(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: QuickFeedbackDto,
    ) {
        return this.pomodoroService.quickFeedback(
            userId,
            id,
            dto.reason,
            dto.details,
        );
    }
}
