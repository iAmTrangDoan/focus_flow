import {
    IsOptional,
    IsString,
    Matches,
    IsArray,
    ArrayMinSize,
    IsInt,
    Min,
    Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
    @ApiPropertyOptional({ example: '09:00', description: 'Giờ bắt đầu (HH:MM hoặc h:mm AM/PM)' })
    @IsOptional()
    @Matches(/^([01]?\d|2[0-3]):\d{2}(\s?(AM|PM))?$/i, {
        message: 'workStartTime phải có format HH:MM hoặc h:mm AM/PM',
    })
    workStartTime?: string;

    @ApiPropertyOptional({ example: '18:00', description: 'Giờ kết thúc (HH:MM hoặc h:mm AM/PM)' })
    @IsOptional()
    @Matches(/^([01]?\d|2[0-3]):\d{2}(\s?(AM|PM))?$/i, {
        message: 'workEndTime phải có format HH:MM hoặc h:mm AM/PM',
    })
    workEndTime?: string;

    @ApiPropertyOptional({ example: [1, 2, 3, 4, 5], description: 'Ngày làm việc (1=Mon..7=Sun)' })
    @IsOptional()
    @IsArray({ message: 'workDays phải là mảng' })
    @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 ngày làm việc' })
    @IsInt({ each: true, message: 'Mỗi ngày phải là số nguyên' })
    @Min(1, { each: true, message: 'Giá trị ngày phải từ 1 đến 7' })
    @Max(7, { each: true, message: 'Giá trị ngày phải từ 1 đến 7' })
    workDays?: number[];

}
