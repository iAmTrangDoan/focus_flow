import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubtaskDto {
    @ApiProperty({ example: 'Tìm tài liệu tham khảo' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ example: 25 })
    @IsOptional()
    @IsInt()
    @Min(1)
    estimatedMinutes?: number;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}
