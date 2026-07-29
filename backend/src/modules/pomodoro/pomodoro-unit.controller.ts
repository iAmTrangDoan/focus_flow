import {
    Controller,
    Get,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
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
}