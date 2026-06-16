import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuickFeedbackDto {
    @ApiProperty({
        example: 'Mệt',
        description: 'Lý do: Mệt / Task quá khó / Bị cắt ngang / Bị phân tâm',
    })
    @IsString()
    reason: string;
}
