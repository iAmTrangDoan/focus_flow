import { Module } from "@nestjs/common";
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from "@nestjs/axios";
import { AiDemoController } from "./ai-demo.controller";
import { AiDemoService } from "./ai-demo.service";

@Module({
    imports: [
        ConfigModule,
        HttpModule.register({
            maxRedirects:0,
        })],
    controllers: [AiDemoController],
    providers: [AiDemoService],
    exports: [AiDemoService],
})
export class AiDemoModule { }
