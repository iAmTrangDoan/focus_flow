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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody, ApiInternalServerErrorResponse, ApiUnauthorizedResponse, ApiTooManyRequestsResponse, ApiBadGatewayResponse, ApiServiceUnavailableResponse, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiDemoService } from './ai-demo.service';
import { Expose } from 'class-transformer';
import { SuggestSubtasksDto,AiSubtasksResponseDto } from './dto/suggest-subtask.dto';

@ApiTags('AIDemo') //dùng để nhóm các api trong swagge  r
@ApiBearerAuth() //dùng để xác thực token
@UseGuards(JwtAuthGuard) //dùng để xác thực token
@Controller('ai-demo') //dùng để định tuyến api

export class AiDemoController{
    constructor(private readonly aiDemoService: AiDemoService){} //dùng để tiêmAiDemoService vào controller

    //Gọi đến API Post - Tạo danh sách subtasks
    @Post('suggest-subtasks')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Tạo danh sách subtasks'})
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
    suggestSubtask(
        @Body() dto: SuggestSubtasksDto,
    ):Promise<AiSubtasksResponseDto>{
        return this.aiDemoService.suggestSubtasks(dto);
    }
}
