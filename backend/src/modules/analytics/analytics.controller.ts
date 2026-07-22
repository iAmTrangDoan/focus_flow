import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('procrastination-score')
    @ApiOperation({ summary: 'Lấy Procrastination Score theo ngày (tự tính nếu chưa có)' })
    @ApiQuery({ name: 'date', required: false, example: '2026-07-17', description: 'Ngày cần tính (YYYY-MM-DD). Mặc định: hôm nay' })
    getProcrastinationScore(
        @CurrentUser('id') userId: string,
        @Query('date') date?: string,
    ) {
        const target = date ?? new Date().toISOString().split('T')[0];
        return this.analyticsService.getProcrastinationScore(userId, target);
    }

    @Get('completion-rate')
    @ApiOperation({ summary: 'Thống kê tỷ lệ hoàn thành task theo ngày' })
    @ApiQuery({ name: 'range', required: false, enum: ['this_week', 'last_week', 'this_month'] })
    getCompletionRate(
        @CurrentUser('id') userId: string,
        @Query('range') range?: 'this_week' | 'last_week' | 'this_month',
    ) {
        return this.analyticsService.getCompletionRate(userId, range ?? 'this_week');
    }

    @Get('weekly-productivity')
    @ApiOperation({ summary: 'Thống kê năng suất theo tuần (5 tuần gần nhất)' })
    getWeeklyProductivity(@CurrentUser('id') userId: string) {
        return this.analyticsService.getWeeklyProductivity(userId);
    }

    @Get('heatmap')
    @ApiOperation({ summary: 'Heatmap mật độ tập trung theo giờ × thứ (30 ngày gần nhất)' })
    getHeatmap(@CurrentUser('id') userId: string) {
        return this.analyticsService.getHeatmap(userId);
    }
}
