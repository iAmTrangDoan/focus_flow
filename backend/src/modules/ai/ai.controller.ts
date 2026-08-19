import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiQuery,
    ApiBody,
    ApiOkResponse,
    ApiUnauthorizedResponse,
    ApiTooManyRequestsResponse,
    ApiBadGatewayResponse,
    ApiServiceUnavailableResponse,
    ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { SuggestSubtasksDto, AiSubtasksResponseDto } from './dto/suggest-subtask.dto';

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
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Tạo danh sách subtasks' })
    @ApiOkResponse({
        description: 'Phân rã task thành công',
        type: AiSubtasksResponseDto,
    })
    @ApiUnauthorizedResponse({
        description: 'Người dùng chưa đăng nhập hoặc token không hợp lệ',
    })
    @ApiTooManyRequestsResponse({
        description: 'Gemini API đang bị rate limit',
    })
    @ApiBadGatewayResponse({
        description: 'Gemini trả về dữ liệu không hợp lệ',
    })
    @ApiServiceUnavailableResponse({
        description: 'Gemini timeout hoặc tạm thời không khả dụng',
    })
    @ApiInternalServerErrorResponse({
        description: 'Backend chưa cấu hình Gemini API key',
    })
    suggestSubtasks(
        @CurrentUser('id') userId: string,
        @Body() dto: SuggestSubtasksDto,
    ): Promise<AiSubtasksResponseDto> {
        return this.aiService.suggestSubtasks(userId, dto);
    }
}
