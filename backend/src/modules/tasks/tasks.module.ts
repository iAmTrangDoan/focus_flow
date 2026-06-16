import { Module } from '@nestjs/common';
import { TasksController, SubtasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PriorityScoreService } from './priority-score.service';

@Module({
    controllers: [TasksController, SubtasksController],
    providers: [TasksService, PriorityScoreService],
    exports: [TasksService, PriorityScoreService],
})
export class TasksModule {}
