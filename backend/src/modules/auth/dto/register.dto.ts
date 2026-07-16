import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    Matches,
    IsArray,
    ArrayMinSize,
    IsInt,
    Min,
    Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email đăng ký' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;

    @ApiProperty({ example: 'password123', description: 'Mật khẩu (tối thiểu 6 ký tự)' })
    @IsString()
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    password: string;

    @ApiPropertyOptional({ example: 'Nguyễn Văn A', description: 'Tên hiển thị' })
    @IsOptional()
    @IsString()
    displayName?: string;

    // ─── Preferences (optional — form có thể skip step 2) ───

    @ApiPropertyOptional({ example: '9:00 AM', description: 'Giờ bắt đầu làm việc (HH:MM hoặc h:mm AM/PM)' })
    @IsOptional()
    @Matches(/^([01]?\d|2[0-3]):\d{2}(\s?(AM|PM))?$/i, {
        message: 'workStartTime phải có format HH:MM hoặc h:mm AM/PM',
    })
    workStartTime?: string;

    @ApiPropertyOptional({ example: '12:00 PM', description: 'Giờ kết thúc làm việc (HH:MM hoặc h:mm AM/PM)' })
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

    @ApiPropertyOptional({ example: 'Study & Learning', description: 'Mục tiêu chính' })
    @IsOptional()
    @IsString()
    mainGoal?: string;
}
