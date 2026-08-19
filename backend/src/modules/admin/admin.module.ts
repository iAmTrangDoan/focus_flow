import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemLogService } from './system-log.service';

@Module({
    controllers: [AdminController],
    providers: [AdminService, SystemLogService],
    exports: [AdminService, SystemLogService],
})
export class AdminModule {}

