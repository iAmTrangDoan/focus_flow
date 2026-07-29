import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProgressQueryDto {
    @ApiPropertyOptional({ description: 'ID subtask đang cần xem tiến độ' })
    @IsOptional()
    @IsString()
    subtaskId?: string;
}
