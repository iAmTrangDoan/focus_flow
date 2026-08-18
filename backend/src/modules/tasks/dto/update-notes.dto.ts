import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateNotesDto {
    @ApiProperty({
        description: 'Markdown content of the note',
        example: '## Kết quả\n- Đã hoàn thành mục 2.1\n- Cần review lại mục 2.3',
        maxLength: 10000,
    })
    @IsString()
    @MaxLength(10000)
    notes: string;
}
