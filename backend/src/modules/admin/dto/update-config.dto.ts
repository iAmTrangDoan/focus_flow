import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ConfigItemDto {
    @ApiProperty({ example: 'priority_weight_urgency' })
    @IsString()
    key: string;

    @ApiProperty({ example: '0.25' })
    @IsString()
    value: string;
}

export class UpdateConfigDto {
    @ApiProperty({ type: [ConfigItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConfigItemDto)
    configs: ConfigItemDto[];
}
