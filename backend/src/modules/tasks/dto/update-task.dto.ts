import {
    ApiPropertyOptional,
    OmitType,
    PartialType,
} from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateTaskDto } from './create-task.dto';
import { CreateSubtaskDto } from './create-subtask.dto';

export class UpdateTaskSubtaskDto extends CreateSubtaskDto {
    @ApiPropertyOptional({
        example: 'cms4lsqr6001201kan0li20eg',
        description: 'Có id nếu là subtask đã tồn tại',
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiPropertyOptional({
        example: false,
        description: 'Trạng thái hoàn thành của subtask',
    })
    @IsOptional()
    @IsBoolean()
    isCompleted?: boolean;
}

class UpdateTaskBaseDto extends PartialType( OmitType(CreateTaskDto, ['subtasks'] as const),
) {}

export class UpdateTaskDto extends UpdateTaskBaseDto {
    @ApiPropertyOptional({
        type: [UpdateTaskSubtaskDto],
        description: 'Danh sách subtask mới nhất của task',
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateTaskSubtaskDto)
    subtasks?: UpdateTaskSubtaskDto[];
}