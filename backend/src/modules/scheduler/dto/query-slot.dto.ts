import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySlotDto {
    @ApiPropertyOptional({ example: '2026-06-09', description: 'Ngày bắt đầu (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({ example: '2026-06-15', description: 'Ngày kết thúc (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    to?: string;
}
