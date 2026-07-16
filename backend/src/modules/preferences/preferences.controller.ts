import {
    Controller,
    Get,
    Put,
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
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

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
}
