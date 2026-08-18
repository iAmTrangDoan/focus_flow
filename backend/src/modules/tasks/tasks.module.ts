import { Module } from '@nestjs/common';
import { TasksController, SubtasksController, AttachmentsController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PriorityScoreService } from './priority-score.service';

@Module({
    controllers: [TasksController, SubtasksController, AttachmentsController],
    providers: [TasksService, PriorityScoreService],
    exports: [TasksService, PriorityScoreService],
})
export class TasksModule {}

