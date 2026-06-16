import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PomodoroStatus } from '@prisma/client';

export class QuerySessionDto {
    @ApiPropertyOptional({ enum: PomodoroStatus })
    @IsOptional()
    @IsEnum(PomodoroStatus)
    status?: PomodoroStatus;
}
