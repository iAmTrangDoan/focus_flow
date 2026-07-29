import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import {
    SuggestSubtasksDto,
    GetInsightsQueryDto,
} from './dto/ai-request.dto';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Get('insights')
    @ApiOperation({ summary: 'Lấy danh sách AI Insights (lọc theo tuần nếu truyền)' })
    getInsights(
        @CurrentUser('id') userId: string,
        @Query() query: GetInsightsQueryDto,
    ) {
        return this.aiService.getInsights(userId, query.weekStartDate);
    }

    @Get('insights/weeks')
    @ApiOperation({ summary: 'Danh sách các tuần đã có insight (dùng cho dropdown)' })
    getAvailableWeeks(@CurrentUser('id') userId: string) {
        return this.aiService.getAvailableWeeks(userId);
    }

    @Post('insights/generate')
    // 3 request / giờ theo tracker mặc định của ThrottlerGuard
    @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
    @ApiOperation({ summary: 'Tạo AI Insight cho tuần trước (idempotent)' })
    generateInsight(
        @CurrentUser('id') userId: string,
    ) {
        return this.aiService.generateLastWeekInsight(userId);
    }

    @Post('suggest-subtasks')
    @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 lần / phút
    @ApiOperation({ summary: 'Gợi ý subtasks cho công việc dựa trên AI' })
    suggestSubtasks(@Body() dto: SuggestSubtasksDto) {
        return this.aiService.suggestSubtasks(dto.taskTitle, dto.deadline, dto.eisenhowerQuadrant);
    }
}