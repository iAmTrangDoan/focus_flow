import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SchedulerService } from './scheduler.service';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { QuerySlotDto } from './dto/query-slot.dto';
import { RestructureOverdueSlotDto } from './dto/restructure-overdue-slot.dto';

@ApiTags('Scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('schedule')
export class SchedulerController {
    constructor(private readonly schedulerService: SchedulerService) {}

    @Post('generate')
    @ApiOperation({ summary: 'Tạo lịch tuần tự động bằng thuật toán Greedy Scheduling' })
    generate(@CurrentUser('id') userId: string) {
        return this.schedulerService.generateWeekly(userId);
    }

    @Get('weekly')
    @ApiOperation({ summary: 'Lấy lịch tuần hiện tại' })
    getWeekly(@CurrentUser('id') userId: string) {
        return this.schedulerService.getWeeklySchedule(userId);
    }

    @Get('slots')
    @ApiOperation({ summary: 'Lấy danh sách slots (lọc theo khoảng ngày)' })
    getSlots(@CurrentUser('id') userId: string, @Query() query: QuerySlotDto) {
        return this.schedulerService.getSlots(userId, query.from, query.to);
    }

    @Patch('slots/:id')
    @ApiOperation({ summary: 'Cập nhật slot (kéo thả đổi giờ)' })
    updateSlot(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: UpdateSlotDto,
    ) {
        return this.schedulerService.updateSlot(userId, id, dto.startAt, dto.endAt);
    }

    @Delete('slots/:id')
    @ApiOperation({ summary: 'Xóa slot khỏi lịch' })
    removeSlot(@CurrentUser('id') userId: string, @Param('id') id: string) {
        return this.schedulerService.removeSlot(userId, id);
    }

    @Post('slots/:id/restructure/preview')
    @ApiOperation({ summary: 'Xem trước tác động tái cấu trúc một slot quá giờ' })
    previewOverdueSlotRestructure(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: RestructureOverdueSlotDto,
    ) {
        return this.schedulerService.previewOverdueSlotRestructure(
            userId,
            id,
            dto.strategy,
        );
    }

    @Post('slots/:id/restructure/confirm')
    @ApiOperation({ summary: 'Xác nhận tái cấu trúc một slot quá giờ' })
    confirmOverdueSlotRestructure(
        @CurrentUser('id') userId: string,
        @Param('id') id: string,
        @Body() dto: RestructureOverdueSlotDto,
    ) {
        return this.schedulerService.confirmOverdueSlotRestructure(
            userId,
            id,
            dto.strategy,
        );
    }

    @Post('restructure')
    @ApiOperation({ summary: 'Tái cấu trúc lịch từ thời điểm hiện tại' })
    restructure(@CurrentUser('id') userId: string) {
        return this.schedulerService.restructure(userId);
    }
}
