import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
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
}
