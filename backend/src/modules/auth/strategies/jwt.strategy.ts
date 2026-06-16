import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}

/**
 * Strategy xác thực Access Token.
 * Extract JWT từ header Authorization: Bearer <token>
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(configService: ConfigService) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    /**
     * Payload đã được verify → gắn vào request.user
     */
    validate(payload: JwtPayload) {
        if (!payload.sub) {
            throw new UnauthorizedException('Token không hợp lệ');
        }
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}
