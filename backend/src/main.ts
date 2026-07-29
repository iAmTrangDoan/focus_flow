import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,           // Loại bỏ các field không có trong DTO
            forbidNonWhitelisted: true, // Báo lỗi nếu gửi field không hợp lệ
            transform: true,           // Tự động transform types
        }),
    );

    const allowedOrigins = ['http://localhost:5173', 'http://localhost', 'http://localhost:80'];
    
    if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
    }

    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
    });

    const config = new DocumentBuilder()
        .setTitle('FocusFlow API')
        .setDescription('API quản lý công việc cá nhân tích hợp AI và Pomodoro')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

