import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { PomodoroModule } from './modules/pomodoro/pomodoro.module';
import { AdminModule } from './modules/admin/admin.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { AccountModule } from './modules/account/account.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AiDemoModule } from './modules/ai-demo/ai-demo.module';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { CloudinaryModule } from './common/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // thư viện gọi cron job
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: seconds(60),
          limit: 10,
        },
      ],
    }),
    PrismaModule,
    CloudinaryModule,
    AuthModule,
    TasksModule,
    SchedulerModule,
    PomodoroModule,
    AdminModule,
    PreferencesModule,
    AccountModule,
    AnalyticsModule,
    AiModule,
    NotificationModule,
    AiDemoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }



