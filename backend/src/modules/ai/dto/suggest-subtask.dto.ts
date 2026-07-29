import { IsString, IsOptional, MinLength, MaxLength, IsDateString } from "class-validator";

export class SuggestSubtasksDto {
    @IsString()
    @MinLength(3)
    @MaxLength(200)
    taskTitle: string;

    @IsOptional()
    @IsDateString()
    deadline?: string;

    @IsOptional()
    @IsString()
    importance?: string;

    @IsOptional()
    @IsString()
    eisenhowerQuadrant?: string;

}

export class SuggestedSubtaskDto {
    title!: string;
    estimatedMinutes!: number;
    aiEstimatedMinutes!: number;
}

// Dữ liệu trả về cho frontend
export class AiSubtasksResponseDto {
    success!: boolean;
    message!: string;
    subtasks!: SuggestedSubtaskDto[];
    timestamp!: Date;
}
