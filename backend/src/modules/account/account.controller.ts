import {
    Controller,
    Get,
    Put,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccountService } from './account.service';

@ApiTags('Account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
    constructor(private readonly accountService: AccountService) {}

    @Get('me')
    @ApiOperation({ summary: 'Lấy thông tin profile của user hiện tại' })
    @ApiResponse({ status: 200, description: 'Trả về thông tin profile' })
    async getProfile(@CurrentUser('id') userId: string) {
        return this.accountService.getProfile(userId);
    }

    @Put('me')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cập nhật thông tin profile của user hiện tại' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    async updateProfile(
        @CurrentUser('id') userId: string,
        @Body('displayName') displayName: string,
    ) {
        return this.accountService.updateProfile(userId, displayName);
    }

    @Put('password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Đổi mật khẩu' })
    @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
    async changePassword(
        @CurrentUser('id') userId: string,
        @Body() body: { current: string; next: string },
    ) {
        return this.accountService.changePassword(userId, body.current, body.next);
    }

    @Get('activity-log')
    @ApiOperation({ summary: 'Lấy danh sách nhật ký hành vi / hoạt động' })
    @ApiResponse({ status: 200, description: 'Trả về danh sách hoạt động' })
    async getActivityLogs(
        @CurrentUser('id') userId: string,
        @Query('type') type?: string,
    ) {
        return this.accountService.getActivityLogs(userId, type);
    }
}
