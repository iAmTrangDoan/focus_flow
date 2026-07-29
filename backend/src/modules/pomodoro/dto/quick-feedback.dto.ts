import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const DROP_REASON_OPTIONS = [
    'Mệt',
    'Task quá khó',
    'Bị cắt ngang',
    'Bị phân tâm',
    'Không còn phù hợp',
    'Khác',
] as const;

export class QuickFeedbackDto {
    @ApiProperty({
        enum: DROP_REASON_OPTIONS,
        example: 'Bị phân tâm',
    })
    @IsString()
    @IsIn(DROP_REASON_OPTIONS)
    reason: string;

    @ApiPropertyOptional({
        example: 'Có cuộc gọi đột xuất',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    details?: string;
}
