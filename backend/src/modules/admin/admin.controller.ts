import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, SystemLogCategory, SystemLogStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    //USER MANAGEMENT

    @Get('users')
    @ApiOperation({ summary: 'Danh sách toàn bộ user' })
    listUsers() {
        return this.adminService.listUsers();
    }

    @Get('users/:id')
    @ApiOperation({ summary: 'Xem chi tiết user' })
    getUserDetail(@Param('id') id: string) {
        return this.adminService.getUserDetail(id);
    }

    @Patch('users/:id/toggle-active')
    @ApiOperation({ summary: 'Khóa / mở khóa tài khoản' })
    toggleActive(@Param('id') id: string) {
        return this.adminService.toggleUserActive(id);
    }

    //DASHBOARD

    @Get('dashboard')
    @ApiOperation({ summary: 'Chỉ số tổng quan hệ thống' })
    getDashboard() {
        return this.adminService.getDashboard();
    }

    @Get('recent-activities')
    @ApiOperation({ summary: 'Hoạt động hệ thống gần đây (24h qua)' })
    getRecentActivities() {
        return this.adminService.getRecentActivities();
    }

    //SYSTEM CONFIGS 
    @Get('configs')
    @ApiOperation({ summary: 'Lấy cấu hình hệ thống' })
    getConfigs() {
        return this.adminService.getConfigs();
    }

    @Patch('configs')
    @ApiOperation({ summary: 'Cập nhật cấu hình (validate trọng số)' })
    updateConfigs(
        @CurrentUser('id') adminId: string,
        @Body() dto: UpdateConfigDto,
    ) {
        return this.adminService.updateConfigs(dto.configs, adminId);
    }

    //SYSTEM LOGS
    @Get('system-logs')
    @ApiOperation({ summary: 'Nhật ký hệ thống' })
    @ApiQuery({ name: 'status', required: false, enum: SystemLogStatus })
    @ApiQuery({ name: 'category', required: false, enum: SystemLogCategory })
    @ApiQuery({ name: 'eventType', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getSystemLogs(
        @Query('status') status?: SystemLogStatus,
        @Query('category') category?: SystemLogCategory,
        @Query('eventType') eventType?: string,
        @Query('search') search?: string,
        @Query('limit') limit?: string,
    ) {
        return this.adminService.getSystemLogs({
            status,
            category,
            eventType,
            search,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
}

