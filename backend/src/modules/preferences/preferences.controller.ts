import {
    Controller,
    Get,
    Put,
    Post,
    Delete,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto, TestSaveGeminiKeyDto } from './dto/update-preferences.dto';

@ApiTags('Preferences')
@Controller('preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PreferencesController {
    constructor(private readonly preferencesService: PreferencesService) {}

    @Get()
    @ApiOperation({ summary: 'Lấy preferences của user hiện tại' })
    @ApiResponse({ status: 200, description: 'Trả về user preferences' })
    async getMyPreferences(@CurrentUser('id') userId: string) {
        return this.preferencesService.getByUserId(userId);
    }

    @Put()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cập nhật preferences (partial update)' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    async updateMyPreferences(
        @CurrentUser('id') userId: string,
        @Body() dto: UpdatePreferencesDto,
    ) {
        return this.preferencesService.update(userId, dto);
    }

    // ─── GEMINI AI KEY ENDPOINTS ──────────────────────────────────────────────

    @Get('gemini-status')
    @ApiOperation({ summary: 'Lấy trạng thái kết nối Gemini AI (không trả về key thô)' })
    @ApiResponse({ status: 200, description: '{ connected: boolean, maskedKey: string | null }' })
    async getGeminiStatus(@CurrentUser('id') userId: string) {
        return this.preferencesService.getGeminiStatus(userId);
    }

    @Post('gemini-key/test-save')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Kiểm tra Gemini API key và lưu nếu hợp lệ' })
    @ApiResponse({ status: 200, description: 'Key hợp lệ, đã lưu thành công' })
    @ApiResponse({ status: 401, description: 'API key không hợp lệ' })
    @ApiResponse({ status: 400, description: 'Key rỗng hoặc vượt rate limit' })
    async testAndSaveGeminiKey(
        @CurrentUser('id') userId: string,
        @Body() dto: TestSaveGeminiKeyDto,
    ) {
        return this.preferencesService.testAndSaveGeminiKey(userId, dto.apiKey);
    }

    @Delete('gemini-key')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Gỡ bỏ Gemini API key của user' })
    @ApiResponse({ status: 200, description: 'Đã xoá key thành công' })
    async revokeGeminiKey(@CurrentUser('id') userId: string) {
        return this.preferencesService.revokeGeminiKey(userId);
    }
}
