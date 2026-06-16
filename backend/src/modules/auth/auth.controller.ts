import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // ─── REGISTER ──────────────────────────────────────────────

    @Post('register')
    @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
    @ApiResponse({ status: 201, description: 'Đăng ký thành công, trả về user + tokens' })
    @ApiResponse({ status: 409, description: 'Email đã được sử dụng' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    // ─── LOGIN ─────────────────────────────────────────────────

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Đăng nhập' })
    @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về user + tokens' })
    @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng' })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    // ─── REFRESH TOKEN ─────────────────────────────────────────

    @Post('refresh')
    @UseGuards(AuthGuard('jwt-refresh'))
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cấp lại access token bằng refresh token' })
    @ApiResponse({ status: 200, description: 'Trả về cặp tokens mới' })
    @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ' })
    async refreshTokens(@CurrentUser() user: { id: string; refreshToken: string }) {
        return this.authService.refreshTokens(user.id, user.refreshToken);
    }

    // ─── LOGOUT ────────────────────────────────────────────────

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Đăng xuất (revoke refresh token)' })
    @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
    async logout(
        @CurrentUser('id') userId: string,
        @Body('refreshToken') refreshToken: string,
    ) {
        return this.authService.logout(userId, refreshToken);
    }

    // ─── GET ME ────────────────────────────────────────────────

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
    @ApiResponse({ status: 200, description: 'Trả về thông tin user (không bao gồm password)' })
    @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
    async getMe(@CurrentUser('id') userId: string) {
        return this.authService.getMe(userId);
    }
}
