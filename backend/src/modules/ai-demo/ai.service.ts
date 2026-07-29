import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { InsightStatus } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { Cron } from '@nestjs/schedule';
import { DateTime } from 'luxon';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    // ─── CẤU HÌNH GEMINI ─────────────────────────────────────────
    private readonly GEMINI_TIMEOUT_MS = 15_000;
    private readonly DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
    private readonly CRON_USER_DELAY_MS = 1_500;
    private readonly MIN_SESSIONS_FOR_HOUR_INSIGHT = 3;

    // ─── GEMINI STRUCTURED OUTPUT SCHEMA ─────────────────────────
    private readonly insightSchema = {
        type: 'object',
        properties: {
            summary: { type: 'string' },
            strengths: {
                type: 'array',
                items: { type: 'string' },
            },
            concerns: {
                type: 'array',
                items: { type: 'string' },
            },
            actionableSuggestions: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        content: { type: 'string' },
                        actionType: {
                            type: 'string',
                            enum: [
                                'reprioritize_morning',
                                'reprioritize_evening',
                                'shorten_tasks',
                                'adjust_reminder',
                                'none',
                            ],
                        },
                    },
                    required: ['content', 'actionType'],
                },
            },
        },
        required: ['summary', 'strengths', 'concerns', 'actionableSuggestions'],
    };

    // ─── DROP REASON MAPPING ─────────────────────────────────────
    // Maps Vietnamese drop reasons from Pomodoro to English keys for AI prompt
    private readonly DROP_REASON_MAP: Record<string, string> = {
        'Mệt': 'tired',
        'Task quá khó': 'too_hard',
        'Bị cắt ngang': 'interrupted',
        'Bị phân tâm': 'distracted',
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    private getSubtaskModel(): string {
        return this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';
    }

    private getInsightModel(): string {
        return this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';
    }

    // ─── SUGGEST SUBTASKS ────────────────────────────────────────

    /**
     * Gợi ý danh sách subtask từ Gemini dựa trên thông tin task.
     * Lỗi 429 (rate limit) được rethrow để FE hiển thị thông báo rõ ràng.
     * Các lỗi khác được nuốt và trả về danh sách rỗng để không chặn luồng tạo task.
     */
    async suggestSubtasks(taskTitle: string, deadline?: string, eisenhowerQuadrant?: string) {
        const prompt = `Bạn là một chuyên gia quản lý công việc và chia nhỏ task theo phương pháp Pomodoro. 
            Hãy chia nhỏ công việc dưới đây thành danh sách các subtask (tối đa 5 subtask) cụ thể, thực tế và có thể thực hiện độc lập.
            Mỗi subtask nên có thời lượng ước tính là bội số của 5 phút (ví dụ: 15, 20, 25, 30, 45, 60), tối thiểu là 10 phút và tối đa là 120 phút.

            Thông tin công việc:
            - Tên công việc: "${taskTitle}"
            ${deadline ? `- Hạn chót (Deadline): ${deadline}` : ''}
            ${eisenhowerQuadrant ? `- Nhóm Eisenhower: ${eisenhowerQuadrant}` : ''}

            Yêu cầu trả về JSON với cấu trúc chính xác sau đây (không được có markdown tag như \`\`\`json hay bất kỳ văn bản giải thích nào khác ngoài JSON):
            {
            "subtasks": [
                {
                "title": "Tên subtask ngắn gọn, hành động cụ thể",
                "aiEstimatedMinutes": 25
                }
            ]
            }`;

        try {
            const parsed = await this.callGeminiApi(
                this.getSubtaskModel(),
                prompt,
                { temperature: 0.3, maxOutputTokens: 512 },
                `suggestSubtasks:"${taskTitle}"`,
            );

            if (!parsed || !Array.isArray(parsed.subtasks)) {
                return { subtasks: [] };
            }

            return {
                subtasks: parsed.subtasks
                    .map((s: any) => ({
                        title: String(s.title || '').trim(),
                        aiEstimatedMinutes: Number(s.aiEstimatedMinutes || s.estimatedMinutes) || 25,
                        estimatedMinutes: Number(s.aiEstimatedMinutes || s.estimatedMinutes) || 25,
                    }))
                    .filter((s: any) => s.title.length > 0),
            };
        } catch (err: any) {
            if (err instanceof HttpException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
                throw err; // để frontend hiển thị đúng thông báo rate limit
            }
            this.logger.error(`suggestSubtasks fallback for "${taskTitle}": ${err?.message ?? err}`);
            return { subtasks: [] };
        }
    }

    // ─── GET INSIGHTS ───────────────────────────────────────────

    async getInsights(userId: string, weekStartDate?: string) {
        const where: any = { userId };

        if (weekStartDate) {
            where.weekStartDate = DateTime.fromISO(weekStartDate, { zone: 'utc' })
                .startOf('day')
                .toJSDate();
        }

        const insights = await this.prisma.aiInsight.findMany({
            where,
            orderBy: { weekStartDate: 'desc' },
            take: 10,
        });

        return insights.map(i => this.formatInsight(i));
    }

    async getAvailableWeeks(userId: string) {
        const insights = await this.prisma.aiInsight.findMany({
            where: { userId, status: InsightStatus.GENERATED },
            select: { weekStartDate: true, status: true },
            orderBy: { weekStartDate: 'desc' },
            take: 10,
        });

        return insights.map(i => {
            const start = DateTime.fromJSDate(i.weekStartDate, { zone: 'utc' });
            const end = start.plus({ days: 6 });
            const isoWeek = start.weekNumber;
            return {
                weekStartDate: start.toISODate(),
                label: `Tuần ${isoWeek} · ${start.toFormat('d/M/yyyy')} - ${end.toFormat('d/M/yyyy')}`,
                status: i.status,
            };
        });
    }

    // ─── GENERATE LAST WEEK INSIGHT ──────────────────────────────

    /**
     * Tạo AI Insight cho tuần trước.
     * Idempotent: nếu đã có GENERATED → trả về insight cũ.
     * Không nhận force, không cho user chọn tuần tùy ý.
     */
    async generateLastWeekInsight(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { timezone: true },
        });
        const timezone = user?.timezone || this.DEFAULT_TIMEZONE;

        const { weekKey, rangeStart, rangeEnd } = this.getPreviousWeekRange(timezone);

        // Idempotent: nếu đã có GENERATED → trả về cũ
        const existing = await this.prisma.aiInsight.findUnique({
            where: { userId_weekStartDate: { userId, weekStartDate: weekKey } },
        });
        if (existing?.status === InsightStatus.GENERATED) {
            return this.formatInsight(existing);
        }

        const record = await this.prisma.aiInsight.upsert({
            where: { userId_weekStartDate: { userId, weekStartDate: weekKey } },
            create: {
                userId,
                weekStartDate: weekKey,
                content: {},
                status: InsightStatus.PENDING,
            },
            update: { status: InsightStatus.PENDING },
        });

        const inputSummary = await this.buildInputSummary(
            userId,
            rangeStart,
            rangeEnd,
            timezone,
        );

        // CHẶN CASE DỮ LIỆU THIẾU để tiết kiệm token
        if (
            inputSummary.completionSummary.created === 0 &&
            inputSummary.pomodoroStats.totalSessions === 0
        ) {
            const staticContent = {
                summary: 'Chưa có đủ dữ liệu hoạt động trong tuần này.',
                strengths: [],
                concerns: [],
                actionableSuggestions: [],
            };

            await this.prisma.aiInsight.update({
                where: { id: record.id },
                data: {
                    content: staticContent,
                    inputSummary: inputSummary as any,
                    status: InsightStatus.GENERATED,
                    isActionable: false,
                },
            });

            const updated = await this.prisma.aiInsight.findUnique({ where: { id: record.id } });
            return this.formatInsight(updated!);
        }

        try {
            const weekNum = DateTime.fromJSDate(weekKey, { zone: 'utc' }).weekNumber;
            const content = await this.callGeminiInsights(inputSummary, weekNum, rangeStart, rangeEnd);

            const isActionable = content.actionableSuggestions?.some(
                (s: any) => s.actionType !== 'none',
            ) ?? false;

            await this.prisma.aiInsight.update({
                where: { id: record.id },
                data: {
                    content,
                    inputSummary: inputSummary as any,
                    status: InsightStatus.GENERATED,
                    isActionable,
                },
            });

            const updated = await this.prisma.aiInsight.findUnique({ where: { id: record.id } });
            return this.formatInsight(updated!);
        } catch (err: any) {
            this.logger.error(`Gemini API error during insights generation for user ${userId}: ${err?.message ?? err}`);

            await this.prisma.aiInsight.update({
                where: { id: record.id },
                data: { status: InsightStatus.FAILED, inputSummary: inputSummary as any },
            });

            if (err instanceof HttpException) {
                throw err;
            }

            throw new HttpException(
                'Không thể tạo AI Insight lúc này.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ─── BUILD INPUT SUMMARY ────────────────────────────────────

    private async buildInputSummary(
        userId: string,
        rangeStart: Date,
        rangeEnd: Date,
        timezone: string,
    ) {
        // Query dữ liệu song song
        const [createdTasks, completedTasks, sessions, rescheduleEvents] = await Promise.all([
            // #2: Task tạo trong tuần
            this.prisma.task.count({
                where: { userId, createdAt: { gte: rangeStart, lt: rangeEnd } },
            }),
            // #2: Task hoàn thành trong tuần (bất kể tạo khi nào)
            this.prisma.task.count({
                where: { userId, completedAt: { gte: rangeStart, lt: rangeEnd } },
            }),
            // #3: Chỉ query phiên WORK
            this.prisma.pomodoroSession.findMany({
                where: {
                    userId,
                    sessionType: 'WORK',
                    startedAt: { gte: rangeStart, lt: rangeEnd },
                },
            }),
            // Đếm số lần reschedule trong tuần
            this.prisma.behaviorLog.count({
                where: {
                    userId,
                    eventType: { in: ['TASK_RESCHEDULED', 'RESCHEDULE_PENALTY'] },
                    occurredAt: { gte: rangeStart, lt: rangeEnd },
                },
            }),
        ]);

        // #3: Phân loại phiên Pomodoro
        const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
        const droppedSessions = sessions.filter(s => s.status === 'CANCELLED');

        // #3: avgFocusMinutes chỉ tính phiên COMPLETED
        const avgFocusMinutes = completedSessions.length > 0
            ? Math.round(
                completedSessions.reduce(
                    (sum, s) => sum + (s.actualDuration ?? s.plannedDuration),
                    0,
                ) / completedSessions.length,
            )
            : 0;

        // #5: Khung giờ năng suất (từ Pomodoro COMPLETED, ngưỡng >= 3)
        const bestHours = this.getTopHourRanges(completedSessions, timezone, 'endedAt');
        const worstHours = this.getTopHourRanges(droppedSessions, timezone, 'endedAt');

        // Drop reason breakdown (map Vietnamese → English keys)
        const dropReasonBreakdown = { tired: 0, too_hard: 0, interrupted: 0, distracted: 0 };
        droppedSessions.forEach(s => {
            if (s.dropReason) {
                const key = this.DROP_REASON_MAP[s.dropReason];
                if (key && key in dropReasonBreakdown) {
                    dropReasonBreakdown[key as keyof typeof dropReasonBreakdown]++;
                }
            }
        });

        // Task completion by duration bucket
        const taskCompletionByDuration = await this.getTaskCompletionByDuration(
            userId,
            rangeStart,
            rangeEnd,
            timezone,
        );

        return {
            weekRange: {
                from: DateTime.fromJSDate(rangeStart).toISODate(),
                to: DateTime.fromJSDate(rangeEnd).toISODate(),
            },
            energyHeatmap: {
                bestHours,
                worstHours,
            },
            taskCompletionByDuration,
            pomodoroStats: {
                totalSessions: sessions.length,
                completedSessions: completedSessions.length,
                droppedSessions: droppedSessions.length,
                avgFocusMinutes,
                dropReasonBreakdown,
            },
            rescheduleEvents,
            completionSummary: {
                created: createdTasks,
                completed: completedTasks,
            },
        };
    }

    // ─── TASK COMPLETION BY DURATION ────────────────────────────

    private async getTaskCompletionByDuration(
        userId: string,
        rangeStart: Date,
        rangeEnd: Date,
        timezone: string,
    ): Promise<{ bucket: string; completionRate: number; mostDelayedTimeOfDay: string | null }[]> {
        // Lấy tất cả task tạo trong tuần hoặc hoàn thành trong tuần
        const tasks = await this.prisma.task.findMany({
            where: {
                userId,
                OR: [
                    { createdAt: { gte: rangeStart, lt: rangeEnd } },
                    { completedAt: { gte: rangeStart, lt: rangeEnd } },
                ],
            },
            select: {
                estimatedMinutes: true,
                status: true,
                completedAt: true,
            },
        });

        const buckets: Record<string, { total: number; completed: number; completedHours: number[] }> = {
            short: { total: 0, completed: 0, completedHours: [] },
            medium: { total: 0, completed: 0, completedHours: [] },
            long: { total: 0, completed: 0, completedHours: [] },
        };

        tasks.forEach(task => {
            const mins = task.estimatedMinutes ?? 25; // default 25 nếu không có
            const bucket = mins < 30 ? 'short' : mins <= 90 ? 'medium' : 'long';
            buckets[bucket].total++;
            if (task.status === 'DONE' && task.completedAt) {
                buckets[bucket].completed++;
                const hour = this.getHourInTimezone(task.completedAt, timezone);
                buckets[bucket].completedHours.push(hour);
            }
        });

        return Object.entries(buckets).map(([bucket, data]) => {
            const completionRate = data.total > 0
                ? Math.round((data.completed / data.total) * 100) / 100
                : 0;

            // mostDelayedTimeOfDay: detect if most non-completed tasks cluster at a time
            let mostDelayedTimeOfDay: string | null = null;
            if (data.completedHours.length >= 2) {
                const avgHour = Math.round(
                    data.completedHours.reduce((a, b) => a + b, 0) / data.completedHours.length,
                );
                if (avgHour >= 5 && avgHour < 12) mostDelayedTimeOfDay = 'morning';
                else if (avgHour >= 12 && avgHour < 17) mostDelayedTimeOfDay = 'afternoon';
                else if (avgHour >= 17 && avgHour < 21) mostDelayedTimeOfDay = 'evening';
                else mostDelayedTimeOfDay = 'night';
            }

            return { bucket, completionRate, mostDelayedTimeOfDay };
        });
    }

    // ─── CALL GEMINI INSIGHTS (STRUCTURED OUTPUT) ───────────────

    private async callGeminiInsights(
        summary: any,
        weekNum: number,
        rangeStart: Date,
        rangeEnd: Date,
    ): Promise<any> {
        const prompt = this.buildWeeklyInsightPrompt(summary, weekNum);

        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new HttpException('GEMINI_API_KEY chưa được cấu hình', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const model = this.getInsightModel();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.GEMINI_TIMEOUT_MS);

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    url,
                    {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.5,
                            maxOutputTokens: 1024,
                            responseMimeType: 'application/json',
                            responseSchema: this.insightSchema,
                        },
                    },
                    {
                        headers: { 'x-goog-api-key': apiKey },
                        signal: controller.signal as any,
                        timeout: this.GEMINI_TIMEOUT_MS,
                    },
                ),
            );

            const rawText: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            const parsed = JSON.parse(rawText);
            return this.validateInsightContent(parsed);
        } catch (err: any) {
            const status = err?.response?.status ?? err?.status;
            const isTimeout =
                err?.code === 'ECONNABORTED' ||
                err?.name === 'CanceledError' ||
                controller.signal.aborted;

            if (status === 429) {
                this.logger.error(`[weeklyInsight:week${weekNum}] Gemini rate limit (429): ${err?.message ?? err}`);
                throw new HttpException('AI đang quá tải (rate limit). Vui lòng thử lại sau vài giây.', HttpStatus.TOO_MANY_REQUESTS);
            }

            if (isTimeout) {
                this.logger.error(`[weeklyInsight:week${weekNum}] Gemini timeout sau ${this.GEMINI_TIMEOUT_MS}ms`);
                throw new HttpException('AI phản hồi quá chậm, vui lòng thử lại.', HttpStatus.GATEWAY_TIMEOUT);
            }

            this.logger.error(`[weeklyInsight:week${weekNum}] Gemini error: ${err?.message ?? err}`);
            throw new HttpException('Không thể xử lý yêu cầu AI lúc này.', HttpStatus.BAD_GATEWAY);
        } finally {
            clearTimeout(timer);
        }
    }

    private buildWeeklyInsightPrompt(input: any, weekNum: number): string {
        const {
            weekRange,
            energyHeatmap,
            taskCompletionByDuration,
            pomodoroStats,
            rescheduleEvents,
            completionSummary,
        } = input;

        const formatDropReasons = (
            breakdown: Record<string, number>,
        ): string => {
            const labels: Record<string, string> = {
                tired: 'mệt',
                too_hard: 'task quá khó',
                interrupted: 'bị cắt ngang',
                distracted: 'bị phân tâm',
            };
            const entries = Object.entries(breakdown)
                .filter(([, count]) => count > 0)
                .sort((a, b) => b[1] - a[1]);

            if (entries.length === 0) return 'không có dữ liệu';

            return entries
                .map(([key, count]) => `${labels[key] ?? key} (${count} lần)`)
                .join(', ');
        };

        const bucketLabels: Record<string, string> = {
            short: 'ngắn (<30 phút)',
            medium: 'vừa (30-90 phút)',
            long: 'dài (>90 phút)',
        };

        return `
Bạn là trợ lý phân tích năng suất cá nhân trong ứng dụng quản lý công việc FocusFlow.
Nhiệm vụ của bạn là đọc dữ liệu hành vi làm việc của người dùng trong tuần và viết nhận xét ngắn gọn, mang tính hỗ trợ.

NGUYÊN TẮC BẮT BUỘC:
- Giọng điệu: trấn an, không phán xét, không thúc ép, không dùng từ ngữ tạo cảm giác tội lỗi (vd "bạn đã thất bại", "bạn cần cố gắng hơn").
- Không suy diễn nguyên nhân cá nhân (vd không nói "có thể bạn đang stress công việc khác") — chỉ mô tả pattern quan sát được từ dữ liệu.
- Không đưa ra lời khuyên y tế/tâm lý.
- Viết bằng tiếng Việt, ngắn gọn, cụ thể, có thể hành động được (actionable).
- Nếu dữ liệu không đủ để rút ra kết luận (vd mẫu quá nhỏ), hãy nói rõ điều đó thay vì suy diễn.

DỮ LIỆU TUẦN ${weekNum} (${weekRange.from} → ${weekRange.to}):

1. Khung giờ hiệu quả nhất: ${energyHeatmap.bestHours.length > 0 ? energyHeatmap.bestHours.join(', ') : 'chưa đủ dữ liệu'}
2. Khung giờ hay trì hoãn/bỏ dở: ${energyHeatmap.worstHours.length > 0 ? energyHeatmap.worstHours.join(', ') : 'chưa đủ dữ liệu'}

3. Tỷ lệ hoàn thành theo độ dài công việc:
${taskCompletionByDuration
    .map(
        (d: any) =>
            `   - Việc ${bucketLabels[d.bucket] ?? d.bucket}: hoàn thành ${(d.completionRate * 100).toFixed(0)}%${d.mostDelayedTimeOfDay ? `, hay bị trì hoãn vào ${d.mostDelayedTimeOfDay}` : ''}`,
    )
    .join('\n')}

4. Phiên Pomodoro:
   - Tổng số phiên: ${pomodoroStats.totalSessions}
   - Hoàn thành: ${pomodoroStats.completedSessions}
   - Bỏ ngang: ${pomodoroStats.droppedSessions}
   - Thời gian tập trung trung bình mỗi phiên hoàn thành: ${pomodoroStats.avgFocusMinutes} phút
   - Lý do bỏ ngang phổ biến: ${formatDropReasons(pomodoroStats.dropReasonBreakdown)}

5. Số lần dùng "Tái cấu trúc một chạm" trong tuần: ${rescheduleEvents}

6. Tổng quan: tạo mới ${completionSummary.created} công việc, hoàn thành ${completionSummary.completed} công việc.
`.trim();
    }

    // ─── GỌI GEMINI DÙNG CHUNG (cho suggestSubtasks) ────────────

    private async callGeminiApi(
        model: string,
        prompt: string,
        generationConfig: { temperature: number; maxOutputTokens: number },
        context: string,
    ): Promise<any> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new HttpException('GEMINI_API_KEY chưa được cấu hình', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.GEMINI_TIMEOUT_MS);

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    url,
                    {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig,
                    },
                    {
                        signal: controller.signal as any,
                        timeout: this.GEMINI_TIMEOUT_MS,
                    },
                ),
            );

            const rawText: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            return this.cleanAndParseJson(rawText);
        } catch (err: any) {
            const status = err?.response?.status ?? err?.status;
            const isTimeout =
                err?.code === 'ECONNABORTED' ||
                err?.name === 'CanceledError' ||
                controller.signal.aborted;

            if (status === 429) {
                this.logger.error(`[${context}] Gemini rate limit (429): ${err?.message ?? err}`);
                throw new HttpException('AI đang quá tải (rate limit). Vui lòng thử lại sau vài giây.', HttpStatus.TOO_MANY_REQUESTS);
            }

            if (isTimeout) {
                this.logger.error(`[${context}] Gemini timeout sau ${this.GEMINI_TIMEOUT_MS}ms`);
                throw new HttpException('AI phản hồi quá chậm, vui lòng thử lại.', HttpStatus.GATEWAY_TIMEOUT);
            }

            this.logger.error(`[${context}] Gemini error: ${err?.message ?? err}`);
            throw new HttpException('Không thể xử lý yêu cầu AI lúc này.', HttpStatus.BAD_GATEWAY);
        } finally {
            clearTimeout(timer);
        }
    }

    // ─── CRON JOB ────────────────────────────────────────────────

    /**
     * Tự động chạy tạo AI Insights hàng tuần lúc 07:00 sáng Thứ Hai.
     * NOTE: giờ chạy hiện hardcode. Nếu Admin cần tự cấu hình giờ chạy qua system_configs,
     * cần chuyển sang dùng SchedulerRegistry.addCronJob() động — chưa làm để tránh over-engineer
     * ngoài phạm vi đồ án; ghi rõ giới hạn này trong luận văn nếu giữ nguyên.
     */
    @Cron('0 0 7 * * 1', {
        timeZone: 'Asia/Ho_Chi_Minh',
        waitForCompletion: true,
    })
    async handleWeeklyInsightsCron() {
        this.logger.log('Starting weekly AI Insights cron job...');
        try {
            const users = await this.prisma.user.findMany({
                where: { isActive: true, role: 'USER' },
                select: { id: true },
            });

            this.logger.log(`Cron: Processing ${users.length} users for last week insights.`);

            for (const user of users) {
                try {
                    await this.generateLastWeekInsight(user.id);
                    this.logger.log(`Successfully generated insight in cron for user ${user.id}`);
                } catch (e: any) {
                    this.logger.error(`Failed to generate insight in cron for user ${user.id}: ${e.message}`);
                }
                // Tránh dội request liên tiếp lên Gemini khi số lượng user lớn
                await this.sleep(this.CRON_USER_DELAY_MS);
            }
        } catch (err: any) {
            this.logger.error(`Error executing weekly AI Insights cron job: ${err?.message ?? err}`);
        }
        this.logger.log('Completed weekly AI Insights cron job.');
    }

    // ─── PRIVATE HELPERS ────────────────────────────────────────

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private cleanAndParseJson(rawText: string) {
        const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Gemini response does not contain a valid JSON object');
        }
        return JSON.parse(jsonMatch[0]);
    }

    private validateInsightContent(content: any) {
        if (
            !content ||
            typeof content.summary !== 'string' ||
            !Array.isArray(content.actionableSuggestions)
        ) {
            throw new Error('Gemini trả về insight không đúng cấu trúc');
        }
        return content;
    }

    private formatInsight(insight: any) {
        return {
            id: insight.id,
            weekStartDate: insight.weekStartDate,
            status: insight.status,
            isActionable: insight.isActionable,
            content: insight.content,
            inputSummary: insight.inputSummary,
            createdAt: insight.createdAt,
        };
    }

    // ─── TIMEZONE HELPERS (Luxon) ───────────────────────────────

    /**
     * Tính phạm vi tuần từ weekStartDate (ISO string) + timezone của user.
     * weekKey: khóa tuần chuẩn (UTC midnight thứ Hai).
     * rangeStart/rangeEnd: phạm vi query chuyển sang UTC.
     */
    private getWeekRange(weekStartDate: string, timezone: string) {
        const localStart = DateTime.fromISO(weekStartDate, { zone: timezone }).startOf('day');

        if (!localStart.isValid || localStart.weekday !== 1) {
            throw new BadRequestException('weekStartDate phải là ngày Thứ Hai hợp lệ');
        }

        return {
            weekKey: DateTime.fromISO(weekStartDate, { zone: 'utc' }).startOf('day').toJSDate(),
            rangeStart: localStart.toUTC().toJSDate(),
            rangeEnd: localStart.plus({ days: 7 }).toUTC().toJSDate(),
        };
    }

    /**
     * Lấy phạm vi tuần trước dựa trên timezone của user.
     */
    private getPreviousWeekRange(timezone: string) {
        const now = DateTime.now().setZone(timezone);
        const lastMonday = now.startOf('week').minus({ weeks: 1 });
        return this.getWeekRange(lastMonday.toISODate()!, timezone);
    }

    /**
     * Lấy giờ trong ngày (0-23) của một thời điểm, theo timezone chỉ định.
     */
    private getHourInTimezone(date: Date, timezone: string): number {
        try {
            return DateTime.fromJSDate(date).setZone(timezone).hour;
        } catch {
            this.logger.warn(`Invalid timezone "${timezone}", falling back to server local hour`);
            return date.getHours();
        }
    }

    /**
     * Tìm top 2 khung giờ từ danh sách sessions.
     * Trả về mảng string dạng ["08:00-09:00", "14:00-15:00"].
     * Trả về mảng rỗng nếu chưa đủ dữ liệu (< MIN_SESSIONS_FOR_HOUR_INSIGHT).
     */
    private getTopHourRanges(
        sessions: any[],
        timezone: string,
        timeField: 'startedAt' | 'endedAt',
    ): string[] {
        if (sessions.length < this.MIN_SESSIONS_FOR_HOUR_INSIGHT) {
            return [];
        }

        const hourCounts = new Array(24).fill(0);
        sessions.forEach(session => {
            const time = session[timeField] ?? session.startedAt;
            const hour = this.getHourInTimezone(new Date(time), timezone);
            hourCounts[hour]++;
        });

        return hourCounts
            .map((count, hour) => ({ hour, count }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 2)
            .map(item => `${String(item.hour).padStart(2, '0')}:00-${String(item.hour + 1).padStart(2, '0')}:00`);
    }

    private getISOWeek(date: Date): number {
        return DateTime.fromJSDate(date, { zone: 'utc' }).weekNumber;
    }
}