import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PomodoroSessionType } from '@prisma/client';

export class CreateSessionDto {
    @ApiProperty({ description: 'ID của task liên kết' })
    @IsString()
    taskId: string;

    @ApiPropertyOptional({ enum: PomodoroSessionType, default: 'WORK' })
    @IsOptional()
    @IsEnum(PomodoroSessionType)
    sessionType?: PomodoroSessionType;
}
