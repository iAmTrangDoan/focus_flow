import { PomodoroSessionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
    @ApiProperty({ description: 'ID của task cha' })
    @IsString()
    taskId: string;

    @ApiPropertyOptional({
        description: 'Bắt buộc khi task có subtasks và chạy phiên WORK',
    })
    @IsOptional()
    @IsString()
    subtaskId?: string;

    @ApiPropertyOptional({
        description: 'ScheduleSlot được dùng để mở phiên, nếu bắt đầu từ lịch',
    })
    @IsOptional()
    @IsString()
    scheduleSlotId?: string;

    @ApiPropertyOptional({ enum: PomodoroSessionType, default: 'WORK' })
    @IsOptional()
    @IsEnum(PomodoroSessionType)
    sessionType?: PomodoroSessionType;
}
