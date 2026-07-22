import {
    Controller,
    Get,
    Patch,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách thông báo của user hiện tại' })
    @ApiResponse({ status: 200, description: 'Trả về mảng thông báo' })
    async getNotifications(@CurrentUser('id') userId: string) {
        return this.notificationService.getNotifications(userId);
    }

    @Patch('read-all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
    async markAllAsRead(@CurrentUser('id') userId: string) {
        await this.notificationService.markAllAsRead(userId);
        return { success: true };
    }

    @Patch(':id/read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Đánh dấu một thông báo là đã đọc' })
    async markAsRead(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
    ) {
        await this.notificationService.markAsRead(userId, id);
        return { success: true };
    }
}
