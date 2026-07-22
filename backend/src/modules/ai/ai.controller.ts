import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { IsString, IsOptional } from 'class-validator';

export class SuggestSubtasksDto {
    @IsString()
    taskTitle: string;

    @IsOptional()
    @IsString()
    deadline?: string;

    @IsOptional()
    @IsString()
    eisenhowerQuadrant?: string;
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) {}

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách AI Insights (lọc theo tuần nếu truyền)' })
    @ApiQuery({ name: 'weekStartDate', required: false, description: 'YYYY-MM-DD (ngày Thứ 2 đầu tuần)' })
    getInsights(
        @CurrentUser('id') userId: string,
        @Query('weekStartDate') weekStartDate?: string,
    ) {
        return this.aiService.getInsights(userId, weekStartDate);
    }

    @Get('weeks')
    @ApiOperation({ summary: 'Danh sách các tuần đã có insight (dùng cho dropdown)' })
    getAvailableWeeks(@CurrentUser('id') userId: string) {
        return this.aiService.getAvailableWeeks(userId);
    }

    @Post('generate')
    @ApiOperation({ summary: 'Tạo AI Insight cho một tuần (idempotent, có thể force ghi đè)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                weekStartDate: { type: 'string', example: '2026-07-14', description: 'Ngày Thứ 2 đầu tuần. Mặc định: tuần trước' },
                force: { type: 'boolean', example: false, description: 'true = ghi đè nếu đã có' },
            },
        },
    })
    generateInsight(
        @CurrentUser('id') userId: string,
        @Body() body: { weekStartDate?: string; force?: boolean },
    ) {
        return this.aiService.generateInsight(userId, body.weekStartDate, body.force ?? false);
    }

    @Post('suggest-subtasks')
    @ApiOperation({ summary: 'Gợi ý subtasks cho công việc dựa trên AI' })
    suggestSubtasks(
        @Body() dto: SuggestSubtasksDto,
    ) {
        return this.aiService.suggestSubtasks(dto.taskTitle, dto.deadline, dto.eisenhowerQuadrant);
    }
}
