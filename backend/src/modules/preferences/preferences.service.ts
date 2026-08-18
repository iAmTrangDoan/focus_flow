import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { parseWorkWindow } from '../../common/utils/work-window.util';
import { encrypt, decrypt } from '../../common/utils/encryption.util';
import axios from 'axios';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

@Injectable()
export class PreferencesService {
    private readonly logger = new Logger(PreferencesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Lấy preferences của user. Nếu chưa có row → tạo mặc định.
     */
    async getByUserId(userId: string) {
        let prefs = await this.prisma.userPreference.findUnique({
            where: { userId },
        });

        if (!prefs) {
            // Tạo row mặc định cho user chưa có preferences (user cũ chưa backfill)
            prefs = await this.prisma.userPreference.create({
                data: { userId },
            });
        }

        return prefs;
    }

    /**
     * Cập nhật preferences (partial update).
     */
    async update(userId: string, dto: UpdatePreferencesDto) {
        // Đảm bảo user đã có preferences row
        const existing = await this.getByUserId(userId);

        // Convert time nếu cần
        const startHHMM = dto.workStartTime
            ? this.toHHMM(dto.workStartTime) ?? existing.workStartTime
            : undefined;
        const endHHMM = dto.workEndTime
            ? this.toHHMM(dto.workEndTime) ?? existing.workEndTime
            : undefined;

        // Validate start & end bằng helper mới
        const effectiveStart = startHHMM ?? existing.workStartTime;
        const effectiveEnd = endHHMM ?? existing.workEndTime;
        parseWorkWindow(effectiveStart, effectiveEnd);

        return this.prisma.userPreference.update({
            where: { userId },
            data: {
                ...(startHHMM && { workStartTime: startHHMM }),
                ...(endHHMM && { workEndTime: endHHMM }),
                ...(dto.workDays && { workDays: dto.workDays }),
            },
        });
    }

    // ─── GEMINI API KEY MANAGEMENT ────────────────────────────────────────────

    /**
     * Lấy trạng thái kết nối Gemini AI của user.
     * Trả về { connected, maskedKey } — KHÔNG trả về key thô.
     */
    async getGeminiStatus(userId: string): Promise<{
        connected: boolean;
        maskedKey: string | null;
    }> {
        const prefs = await this.getByUserId(userId);

        if (!prefs.geminiApiKey) {
            return { connected: false, maskedKey: null };
        }

        try {
            const plainKey = decrypt(prefs.geminiApiKey);
            const maskedKey = this.maskApiKey(plainKey);
            return { connected: true, maskedKey };
        } catch {
            // Key bị hỏng hoặc giả mạo → coi như chưa kết nối
            this.logger.warn(`User ${userId}: geminiApiKey decrypt thất bại, reset về null`);
            return { connected: false, maskedKey: null };
        }
    }

    /**
     * Kiểm tra Gemini API key bằng cách ping Gemini, nếu OK thì encrypt & lưu DB.
     * @throws UnauthorizedException nếu key không hợp lệ (401/403 từ Gemini)
     * @throws BadRequestException nếu key rỗng
     * @throws InternalServerErrorException nếu Gemini không phản hồi
     */
    async testAndSaveGeminiKey(userId: string, apiKey: string): Promise<{
        connected: boolean;
        maskedKey: string;
        message: string;
    }> {
        if (!apiKey || !apiKey.trim()) {
            throw new BadRequestException('API key không được để trống');
        }

        const trimmedKey = apiKey.trim();

        // Ping Gemini: dùng models endpoint nhẹ nhất
        await this.pingGeminiApi(trimmedKey);

        // Key hợp lệ → encrypt và lưu DB
        const encryptedKey = encrypt(trimmedKey);
        await this.prisma.userPreference.update({
            where: { userId },
            data: { geminiApiKey: encryptedKey },
        });

        return {
            connected: true,
            maskedKey: this.maskApiKey(trimmedKey),
            message: 'Kết nối Gemini AI thành công! API key đã được lưu bảo mật.',
        };
    }

    /**
     * Xoá Gemini API key của user khỏi DB.
     */
    async revokeGeminiKey(userId: string): Promise<{ connected: boolean }> {
        await this.getByUserId(userId); // đảm bảo row tồn tại

        await this.prisma.userPreference.update({
            where: { userId },
            data: { geminiApiKey: null },
        });

        return { connected: false };
    }

    // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────

    /**
     * Ping Gemini models.list endpoint để xác minh API key.
     * Sử dụng gemini-2.0-flash-lite hoặc bất kỳ model nào để list.
     */
    private async pingGeminiApi(apiKey: string): Promise<void> {
        const url = `${GEMINI_BASE_URL}/models?pageSize=1&key=${apiKey}`;
        const timeoutMs = 8000;

        try {
            const response = await axios.get(url, {
                timeout: timeoutMs,
                validateStatus: (status) => status < 500, // tự xử lý 4xx
            });

            if (response.status === 401 || response.status === 403) {
                throw new UnauthorizedException(
                    'API key không hợp lệ hoặc không có quyền truy cập Gemini. Vui lòng kiểm tra lại.',
                );
            }

            if (response.status === 429) {
                throw new BadRequestException(
                    'API key đã vượt quá giới hạn request. Vui lòng thử lại sau.',
                );
            }

            if (response.status !== 200) {
                throw new InternalServerErrorException(
                    `Gemini trả về lỗi không mong đợi (HTTP ${response.status}). Vui lòng thử lại.`,
                );
            }
        } catch (err) {
            if (
                err instanceof UnauthorizedException ||
                err instanceof BadRequestException ||
                err instanceof InternalServerErrorException
            ) {
                throw err;
            }

            // Network error / timeout
            this.logger.error(`Ping Gemini thất bại: ${err?.message}`);
            throw new InternalServerErrorException(
                'Không thể kết nối đến Gemini API. Vui lòng kiểm tra kết nối mạng và thử lại.',
            );
        }
    }

    /**
     * Che mờ API key, chỉ hiển thị 4 ký tự cuối.
     * Ví dụ: "AIzaSyXXXXXXXXXXXXXXXXXX" → "••••••••••••••••••••xxxx"
     */
    private maskApiKey(key: string): string {
        if (key.length <= 4) return '••••';
        const visible = key.slice(-4);
        const hidden = '•'.repeat(Math.min(key.length - 4, 20));
        return `${hidden}${visible}`;
    }

    /**
     * Convert time label ("9:00 AM", "12:00 PM", "14:30") → "HH:MM" format.
     */
    private toHHMM(label: string): string | null {
        if (/^\d{2}:\d{2}$/.test(label)) return label;
        const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let hour = parseInt(match[1], 10);
        const min = match[2];
        const period = match[3].toUpperCase();
        if (period === 'AM' && hour === 12) hour = 0;
        if (period === 'PM' && hour !== 12) hour += 12;
        return `${hour.toString().padStart(2, '0')}:${min}`;
    }
}
