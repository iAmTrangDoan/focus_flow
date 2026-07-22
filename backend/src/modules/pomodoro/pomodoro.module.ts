import { Module } from '@nestjs/common';
import { PomodoroController } from './pomodoro.controller';
import { PomodoroService } from './pomodoro.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [NotificationModule],
    controllers: [PomodoroController],
    providers: [PomodoroService],
    exports: [PomodoroService],
})
export class PomodoroModule {}

