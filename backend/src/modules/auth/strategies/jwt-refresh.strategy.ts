import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

export interface JwtRefreshPayload {
    sub: string;
}

/**
 * Strategy xác thực Refresh Token.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(configService: ConfigService) {
        const secret = configService.get<string>('JWT_REFRESH_SECRET');
        if (!secret) {
            throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
        }

        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
            ignoreExpiration: false,
            secretOrKey: secret,
            passReqToCallback: true,
        });
    }

    /**
     * Validate refresh token payload.
     * Trả về userId và rawToken để service kiểm tra revoke status.
     */
    validate(req: Request, payload: JwtRefreshPayload) {
        const refreshToken = req.body?.refreshToken;
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token không được cung cấp');
        }
        return {
            id: payload.sub,
            refreshToken,
        };
    }
}
