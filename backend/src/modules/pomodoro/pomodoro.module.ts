import { Module } from '@nestjs/common';
import { PomodoroController } from './pomodoro.controller';
import { PomodoroService } from './pomodoro.service';
import { NotificationModule } from '../notification/notification.module';
import { PomodoroUnitController } from './pomodoro-unit.controller';

@Module({
    imports: [NotificationModule],
    controllers: [PomodoroController, PomodoroUnitController,],
    providers: [PomodoroService],
    exports: [PomodoroService],
})
export class PomodoroModule {}

