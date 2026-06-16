import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PomodoroService } from './pomodoro.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { QuickFeedbackDto } from './dto/quick-feedback.dto';
import { QuerySessionDto } from './dto/query-session.dto';

@ApiTags('Pomodoro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pomodoro/sessions')
export class PomodoroController {
    constructor(private readonly pomodoroService: PomodoroService) {}

    @Post()
    @ApiOperation({ summary: 'Bắt đầu phiên Pomodoro mới' })
    start(@CurrentUser('id') userId: string, @Body() dto: CreateSessionDto) {
        return this.pomodoroService.startSession(userId, dto.taskId, dto.sessionType);
    }

    @Get('current')
    @ApiOperation({ summary: 'Lấy phiên đang hoạt động' })
    getCurrent(@CurrentUser('id') userId: string) {
        return this.pomodoroService.getCurrentSession(userId);
    }

    @Get()
    @ApiOperation({ summary: 'Lịch sử các phiên Pomodoro' })
    getHistory(@CurrentUser('id') userId: string, @Query() query: QuerySessionDto) {
        return this.pomodoroService.getHistory(userId, query.status);
    }

    @Patch(':id/pause')
    @ApiOperation({ summary: 'Tạm dừng phiên' })
    pause(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.pomodoroService.pauseSession(userId, id);
    }

    @Patch(':id/resume')
    @ApiOperation({ summary: 'Tiếp tục phiên sau tạm dừng' })
    resume(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.pomodoroService.resumeSession(userId, id);
    }

    @Patch(':id/complete')
    @ApiOperation({ summary: 'Hoàn thành phiên' })
    complete(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.pomodoroService.completeSession(userId, id);
    }

    @Patch(':id/cancel')
    @ApiOperation({ summary: 'Hủy / bỏ ngang phiên (Drop)' })
    cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.pomodoroService.cancelSession(userId, id);
    }

    @Post(':id/quick-feedback')
    @ApiOperation({ summary: 'Khảo sát nhanh lý do bỏ ngang' })
    quickFeedback(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: QuickFeedbackDto,
    ) {
        return this.pomodoroService.quickFeedback(userId, id, dto.reason);
    }
}
