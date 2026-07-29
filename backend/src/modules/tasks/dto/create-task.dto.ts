import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsBoolean, Min, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Importance, FocusMode } from '@prisma/client';
import { CreateSubtaskDto } from './create-subtask.dto';


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

    @IsOptional()
    @IsDateString()
    fixedStart?: string;

    @IsOptional()
    @IsDateString()
    fixedEnd?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSubtaskDto)
    subtasks?: CreateSubtaskDto[];
}
