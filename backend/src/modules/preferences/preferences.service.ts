import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { parseWorkWindow } from '../../common/utils/work-window.util';

@Injectable()
export class PreferencesService {
    constructor(private readonly prisma: PrismaService) { }

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
