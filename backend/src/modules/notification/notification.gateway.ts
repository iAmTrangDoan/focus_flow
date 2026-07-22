import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Socket.IO Gateway cho FocusFlow.
 * Mỗi user kết nối sẽ được join vào room riêng theo userId.
 * Server emit vào room đó khi có sự kiện (Pomodoro, Schedule, Analytics...).
 */
@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/ws',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationGateway.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async handleConnection(client: Socket) {
        try {
            const token =
                client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                client.disconnect();
                return;
            }

            const secret = this.configService.get<string>('JWT_SECRET');
            const payload = this.jwtService.verify(token, { secret });
            const userId: string = payload.sub;

            // Join user vào room riêng
            await client.join(`user:${userId}`);
            client.data.userId = userId;
            this.logger.log(`Client connected: ${client.id} → user:${userId}`);
        } catch {
            this.logger.warn(`Invalid token, disconnecting ${client.id}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * Phát thông báo tới một user cụ thể.
     * Dùng cho: Pomodoro completed, schedule generated, procrastination alert...
     */
    emitToUser(userId: string, event: string, data: any) {
        this.server.to(`user:${userId}`).emit(event, data);
    }

    /**
     * Phát thông báo tới tất cả users (dùng cho admin broadcast nếu cần).
     */
    emitBroadcast(event: string, data: any) {
        this.server.emit(event, data);
    }
}
