import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [NotificationModule],
    controllers: [SchedulerController],
    providers: [SchedulerService],
    exports: [SchedulerService],
})
export class SchedulerModule {}

