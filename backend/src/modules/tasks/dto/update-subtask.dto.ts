import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateSubtaskDto } from './create-subtask.dto';

export class UpdateSubtaskDto extends PartialType(CreateSubtaskDto) {
    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isCompleted?: boolean;
}