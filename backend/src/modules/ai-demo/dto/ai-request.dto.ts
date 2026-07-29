import { IsOptional, IsString, Matches } from 'class-validator';

export class SuggestSubtasksDto {
    @IsString()
    taskTitle: string;

    @IsOptional()
    @IsString()
    deadline?: string;

    @IsOptional()
    @IsString()
    eisenhowerQuadrant?: string;
}

export class GetInsightsQueryDto {
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'weekStartDate phải có định dạng YYYY-MM-DD',
    })
    weekStartDate?: string;
}