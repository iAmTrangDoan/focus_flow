import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PomodoroService } from './pomodoro.service';

@ApiTags('Pomodoro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pomodoro/units')
export class PomodoroUnitController {
    constructor(
        private readonly pomodoroService: PomodoroService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách task/subtask có thể chạy Pomodoro',
    })
    getUnits(@CurrentUser('id') userId: string) {
        return this.pomodoroService.getUnits(userId);
    }

    @Get('suggestions')
    @ApiOperation({
        summary: 'Gợi ý 3 task có Priority Score cao nhất chưa hoàn thành',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getSuggestions(
        @CurrentUser('id') userId: string,
        @Query('limit') limit?: string,
    ) {
        return this.pomodoroService.getNextSuggestions(
            userId,
            limit ? parseInt(limit, 10) : 3,
        );
    }
}