import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    // ─── REGISTER ──────────────────────────────────────────────

    async register(dto: RegisterDto) {
        // Kiểm tra email đã tồn tại chưa
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new ConflictException('Email đã được sử dụng');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, 12);

        // Tạo user mới (role mặc định = USER)
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                displayName: dto.displayName,
            },
        });

        // Cấp cặp tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role);
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    // ─── LOGIN ─────────────────────────────────────────────────

    async login(dto: LoginDto) {
        // Tìm user theo email
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
        }

        // Kiểm tra tài khoản còn hoạt động
        if (!user.isActive) {
            throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
        }

        // Cấp cặp tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role);
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    // ─── REFRESH TOKENS ────────────────────────────────────────

    async refreshTokens(userId: string, refreshToken: string) {
        // Tìm tất cả refresh tokens chưa revoke của user
        const storedTokens = await this.prisma.refreshToken.findMany({
            where: {
                userId,
                isRevoked: false,
                expiresAt: { gt: new Date() },
            },
        });

        // Kiểm tra refresh token có khớp với token đã lưu không
        let matchedToken: typeof storedTokens[0] | null = null;
        for (const stored of storedTokens) {
            const isMatch = await bcrypt.compare(refreshToken, stored.tokenHash);
            if (isMatch) {
                matchedToken = stored;
                break;
            }
        }

        if (!matchedToken) {
            throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
        }

        // Revoke token cũ (rotation)
        await this.prisma.refreshToken.update({
            where: { id: matchedToken.id },
            data: { isRevoked: true },
        });

        // Lấy user info để tạo token mới
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.isActive) {
            throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa');
        }

        // Cấp cặp tokens mới
        const tokens = await this.generateTokens(user.id, user.email, user.role);
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    // ─── LOGOUT ────────────────────────────────────────────────

    async logout(userId: string, refreshToken: string) {
        // Revoke tất cả refresh tokens khớp của user
        const storedTokens = await this.prisma.refreshToken.findMany({
            where: {
                userId,
                isRevoked: false,
            },
        });

        for (const stored of storedTokens) {
            const isMatch = await bcrypt.compare(refreshToken, stored.tokenHash);
            if (isMatch) {
                await this.prisma.refreshToken.update({
                    where: { id: stored.id },
                    data: { isRevoked: true },
                });
                break;
            }
        }

        return { message: 'Đăng xuất thành công' };
    }

    // ─── GET ME ────────────────────────────────────────────────

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new UnauthorizedException('Người dùng không tồn tại');
        }
        return this.sanitizeUser(user);
    }

    // ─── PRIVATE HELPERS ───────────────────────────────────────

    /**
     * Tạo cặp Access Token + Refresh Token
     */
    private async generateTokens(userId: string, email: string, role: string) {
        const accessExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
        const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

        const [accessToken, refreshToken] = await Promise.all([
            // Access Token — chứa đầy đủ thông tin user
            this.jwtService.signAsync(
                { sub: userId, email, role },
                {
                    secret: this.configService.get<string>('JWT_SECRET'),
                    expiresIn: accessExpiresIn as any,
                },
            ),
            // Refresh Token — chỉ chứa userId
            this.jwtService.signAsync(
                { sub: userId },
                {
                    secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                    expiresIn: refreshExpiresIn as any,
                },
            ),
        ]);

        return { accessToken, refreshToken };
    }

    /**
     * Hash và lưu refresh token vào database
     */
    private async saveRefreshToken(userId: string, refreshToken: string) {
        const tokenHash = await bcrypt.hash(refreshToken, 12);

        // Tính thời gian hết hạn
        const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
        const expiresAt = new Date();
        const days = parseInt(expiresIn.replace('d', ''), 10) || 7;
        expiresAt.setDate(expiresAt.getDate() + days);

        await this.prisma.refreshToken.create({
            data: {
                tokenHash,
                userId,
                expiresAt,
            },
        });
    }

    /**
     * Loại bỏ passwordHash trước khi trả về client
     */
    private sanitizeUser(user: { id: string; email: string; displayName: string | null; role: string; timezone: string; isActive: boolean; createdAt: Date; updatedAt: Date; passwordHash?: string }) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }
}
