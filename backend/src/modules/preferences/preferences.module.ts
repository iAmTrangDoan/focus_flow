import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';

@Module({
    imports: [ConfigModule], // Cần cho ConfigService trong PreferencesService
    controllers: [PreferencesController],
    providers: [PreferencesService],
    exports: [PreferencesService],
})
export class PreferencesModule {}
