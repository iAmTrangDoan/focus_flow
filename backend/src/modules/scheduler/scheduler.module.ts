import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { NotificationModule } from '../notification/notification.module';
import { TasksModule } from '../tasks/tasks.module';
import { AdminModule } from '../admin/admin.module';

@Module({
    imports: [NotificationModule, TasksModule, AdminModule],
    controllers: [SchedulerController],
    providers: [SchedulerService],
    exports: [SchedulerService],
})
export class SchedulerModule {}

