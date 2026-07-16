import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsBoolean, Min, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Importance, FocusMode } from '@prisma/client';

export class CreateSubtaskInlineDto {
    @ApiProperty({ example: 'Tìm tài liệu tham khảo' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ example: 25 })
    @IsOptional()
    @IsInt()
    @Min(1)
    aiEstimatedMinutes?: number;

    @ApiPropertyOptional({ example: 25 })
    @IsOptional()
    @IsInt()
    @Min(1)
    estimatedMinutes?: number;
}

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

    @ApiPropertyOptional({ example: false, description: 'Task cố định lịch (fixed event)' })
    @IsOptional()
    @IsBoolean()
    isFixedTask?: boolean;

    @ApiPropertyOptional({ example: '2026-06-20T09:00:00Z', description: 'Giờ bắt đầu (fixed task)' })
    @IsOptional()
    @IsDateString()
    fixedStart?: string;

    @ApiPropertyOptional({ example: '2026-06-20T10:00:00Z', description: 'Giờ kết thúc (fixed task)' })
    @IsOptional()
    @IsDateString()
    fixedEnd?: string;

    @ApiPropertyOptional({ type: [CreateSubtaskInlineDto], description: 'Danh sách subtasks tạo kèm' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSubtaskInlineDto)
    subtasks?: CreateSubtaskInlineDto[];
}
