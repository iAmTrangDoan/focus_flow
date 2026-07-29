import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { NotificationModule } from '../notification/notification.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
    imports: [NotificationModule, TasksModule],
    controllers: [SchedulerController],
    providers: [SchedulerService],
    exports: [SchedulerService],
})
export class SchedulerModule {}

