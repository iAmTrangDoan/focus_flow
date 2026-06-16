import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSlotDto {
    @ApiProperty({ example: '2026-06-12T09:00:00Z' })
    @IsDateString()
    startAt: string;

    @ApiProperty({ example: '2026-06-12T09:30:00Z' })
    @IsDateString()
    endAt: string;
}
