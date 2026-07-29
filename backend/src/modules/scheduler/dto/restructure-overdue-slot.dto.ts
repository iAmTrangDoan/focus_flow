import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RestructureStrategy } from '@prisma/client';

export class RestructureOverdueSlotDto {
    @ApiProperty({
        enum: [RestructureStrategy.SHIFT_TIME],
        example: RestructureStrategy.SHIFT_TIME,
        description:
            'Hiện tại chỉ hỗ trợ SHIFT_TIME. TRIM_SUBTASKS cần cờ isOptional trên Subtask.',
    })
    @IsEnum(RestructureStrategy)
    strategy: RestructureStrategy;
}
