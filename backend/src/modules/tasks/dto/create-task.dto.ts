import { IsString, IsOptional, IsEnum, IsInt, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Importance, FocusMode } from '@prisma/client';

export class CreateTaskDto {
    @ApiProperty({ example: 'Làm báo cáo tuần' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ example: 'Chi tiết công việc...' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: '2026-06-20T23:59:00Z' })
    @IsOptional()
    @IsDateString()
    deadline?: string;

    @ApiPropertyOptional({ enum: Importance, default: 'LOW' })
    @IsOptional()
    @IsEnum(Importance)
    importance?: Importance;

    @ApiPropertyOptional({ enum: FocusMode, default: 'STANDARD' })
    @IsOptional()
    @IsEnum(FocusMode)
    focusMode?: FocusMode;

    @ApiPropertyOptional({ example: 60, description: 'Thời lượng ước tính (phút)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    estimatedMinutes?: number;
}
