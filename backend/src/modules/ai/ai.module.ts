import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AdminModule } from '../admin/admin.module';

@Module({
    imports: [HttpModule, AnalyticsModule, AdminModule],
    controllers: [AiController],
    providers: [AiService],
    exports: [AiService],
})
export class AiModule {}

