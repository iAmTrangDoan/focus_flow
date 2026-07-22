import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { InsightStatus } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from '../analytics/analytics.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly analyticsService: AnalyticsService,
    ) {}

      // ─── SUGGEST SUBTASKS ────────────────────────────────────────

    /**
     * Gợi ý danh sách subtask từ Gemini dựa trên thông tin task.
     */
    async suggestSubtasks(taskTitle: string, deadline?: string, eisenhowerQuadrant?: string) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new HttpException('GEMINI_API_KEY chưa được cấu hình', HttpStatus.INTERNAL_SERVER_ERROR);
        }

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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            console.log('🚀 [KIỂM TRA] --- ĐANG GỬI REQUEST LÊN GEMINI ---');
            const response = await firstValueFrom(
                this.httpService.post(url, {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
                })
            );

            const rawText: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            const parsed = this.cleanAndParseJson(rawText);

            if (!parsed || !Array.isArray(parsed.subtasks)) {
                return { subtasks: [] };
            }

            return {
                subtasks: parsed.subtasks.map((s: any) => ({
                    title: String(s.title || '').trim(),
                    aiEstimatedMinutes: Number(s.aiEstimatedMinutes || s.estimatedMinutes) || 25,
                    estimatedMinutes: Number(s.aiEstimatedMinutes || s.estimatedMinutes) || 25,
                })).filter((s: any) => s.title.length > 0),
            };

        } catch (err) {
            const status = err?.response?.status ?? err?.status;

            if (status === 429) {
                // Gemini rate limit — rethrow so the frontend can show the error message
                this.logger.error(`Rate limit (429) when suggesting subtasks for "${taskTitle}":`, err?.message ?? err);
                throw new HttpException('AI đang quá tải (rate limit). Vui lòng thử lại sau vài giây.', HttpStatus.TOO_MANY_REQUESTS);
            }

            // Other unexpected errors — log and return empty to avoid crash
            this.logger.error(`Error suggesting subtasks for "${taskTitle}":`, err?.message ?? err);
            return { subtasks: [] };
        }
    }

    // ─── GET INSIGHTS ───────────────────────────────────────────

    /**
     * Lấy danh sách AI Insights của user, lọc theo tuần nếu truyền weekStartDate.
     */
    async getInsights(userId: string, weekStartDate?: string) {
        const where: any = { userId };

        if (weekStartDate) {
            where.weekStartDate = this.parseStartOfDay(weekStartDate);
        }

        const insights = await this.prisma.aiInsight.findMany({
            where,
            orderBy: { weekStartDate: 'desc' },
            take: 10,
        });

        return insights.map(i => this.formatInsight(i));
    }

    /**
     * Lấy danh sách tất cả các tuần đã có insight (dùng cho dropdown).
     */
    async getAvailableWeeks(userId: string) {
        const insights = await this.prisma.aiInsight.findMany({
            where: { userId },
            select: { weekStartDate: true, status: true },
            orderBy: { weekStartDate: 'desc' },
            take: 10,
        });

        return insights.map(i => {
            const start = new Date(i.weekStartDate);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            const isoWeek = this.getISOWeek(start);
            return {
                weekStartDate: this.formatLocalDateString(start),
                label: `Tuần ${isoWeek} · ${fmt(start)} - ${fmt(end)}`,
                status: i.status,
            };
        });
    }

    // ─── GENERATE INSIGHTS ───────────────────────────────────────

    /**
     * Tạo AI Insight cho một tuần cụ thể (hoặc tuần trước nếu không truyền).
     * Idempotent: nếu đã có và không force → trả về insight cũ.
     */
    async generateInsight(userId: string, weekStartDate?: string, force = false) {
        const weekStart = weekStartDate
            ? this.parseStartOfDay(weekStartDate)
            : this.getLastMonday();

        // Kiểm tra đã có chưa
        const existing = await this.prisma.aiInsight.findUnique({
            where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
        });

        if (existing && !force && existing.status === InsightStatus.GENERATED) {
            return this.formatInsight(existing);
        }

        // Tạo placeholder PENDING
        const record = await this.prisma.aiInsight.upsert({
            where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
            create: {
                userId,
                weekStartDate: weekStart,
                content: {},
                status: InsightStatus.PENDING,
            },
            update: { status: InsightStatus.PENDING },
        });

        // Tổng hợp dữ liệu hành vi tuần đó
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const [logs, sessions, tasks] = await Promise.all([
            this.prisma.behaviorLog.findMany({
                where: { userId, occurredAt: { gte: weekStart, lt: weekEnd } },
                include: { task: { select: { title: true } } },
                orderBy: { occurredAt: 'asc' },
            }),
            this.prisma.pomodoroSession.findMany({
                where: { userId, startedAt: { gte: weekStart, lt: weekEnd } },
            }),
            this.prisma.task.findMany({
                where: { userId, createdAt: { gte: weekStart, lt: weekEnd } },
            }),
        ]);

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'DONE').length;
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
        const droppedSessions = sessions.filter(s => s.status === 'CANCELLED').length;

        // CHẶN CASE DỮ LIỆU THIẾU để tiết kiệm token
        if (totalTasks === 0 && totalSessions === 0 && logs.length === 0) {
            const staticContent = {
                insights: [
                    {
                        category: 'completion_rate',
                        content: 'Chào mừng bạn đến với FocusFlow! Hãy bắt đầu tạo công việc mới và thực hiện các phiên Pomodoro để chúng tôi có đủ dữ liệu phân tích năng suất cho bạn.',
                        actionable: false,
                        actionType: 'none',
                    }
                ],
                summary: 'Chưa có đủ dữ liệu hoạt động trong tuần này.'
            };

            await this.prisma.aiInsight.update({
                where: { id: record.id },
                data: {
                    content: staticContent,
                    inputSummary: { totalTasks: 0, completedTasks: 0, totalSessions: 0 } as any,
                    status: InsightStatus.GENERATED,
                    isActionable: false,
                },
            });

            const updated = await this.prisma.aiInsight.findUnique({ where: { id: record.id } });
            return this.formatInsight(updated!);
        }

        // Tính các chỉ số nâng cao phục vụ Prompt
        // 1. Phân phối sự kiện
        const eventCounts = this.countEvents(logs);

        // 2. Procrastination Score
        let pScore = 0;
        try {
            const scoreResult = await this.analyticsService.getProcrastinationScore(userId, this.formatLocalDateString(weekStart));
            pScore = scoreResult.score;
        } catch (e) {
            this.logger.warn(`Could not fetch Procrastination Score: ${e.message}`);
        }

        // 3. Khung giờ năng suất nhất (Top 2 giờ hoàn thành task nhiều nhất)
        const taskCompletedLogs = logs.filter(log => log.eventType === 'TASK_COMPLETED');
        const productiveHourCounts = new Array(24).fill(0);
        taskCompletedLogs.forEach(log => {
            const hour = new Date(log.occurredAt).getHours();
            productiveHourCounts[hour]++;
        });
        const productiveHours = productiveHourCounts
            .map((count, hour) => ({ hour, count }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 2)
            .map(item => `${item.hour}h`)
            .join(', ') || 'Chưa xác định';

        // 4. Khung giờ trì hoãn nhất (Top 2 giờ hủy phiên Pomodoro nhiều nhất)
        const cancelledSessions = sessions.filter(s => s.status === 'CANCELLED');
        const procrastinatedHourCounts = new Array(24).fill(0);
        cancelledSessions.forEach(s => {
            const hour = new Date(s.startedAt).getHours();
            procrastinatedHourCounts[hour]++;
        });
        const procrastinatedHours = procrastinatedHourCounts
            .map((count, hour) => ({ hour, count }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 2)
            .map(item => `${item.hour}h`)
            .join(', ') || 'Chưa xác định';

        // 5. Lý do hủy phiên chính
        const dropReasonCounts: Record<string, number> = {};
        cancelledSessions.forEach(s => {
            if (s.dropReason) {
                dropReasonCounts[s.dropReason] = (dropReasonCounts[s.dropReason] ?? 0) + 1;
            }
        });
        const topDropReason = Object.entries(dropReasonCounts)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0])[0] ?? 'Không có lý do cụ thể';

        const inputSummary = {
            totalTasks,
            completedTasks,
            totalSessions,
            completedSessions,
            droppedSessions,
            avgFocusMinutes: sessions.length > 0
                ? Math.round(sessions.reduce((sum, s) => sum + (s.actualDuration ?? s.plannedDuration), 0) / sessions.length)
                : 0,
            eventCounts,
            procrastinationScore: pScore,
            productiveHours,
            procrastinatedHours,
            topDropReason,
        };

        // Gọi Gemini API
        try {
            const content = await this.callGeminiInsights(inputSummary, weekStart);

            await this.prisma.aiInsight.update({
                where: { id: record.id },
                data: {
                    content,
                    inputSummary: inputSummary as any,
                    status: InsightStatus.GENERATED,
                    isActionable: true,
                },
            });

            const updated = await this.prisma.aiInsight.findUnique({ where: { id: record.id } });
            return this.formatInsight(updated!);
        } catch (err) {
            this.logger.error('Gemini API error during insights generation:', err?.message ?? err);

            await this.prisma.aiInsight.update({
                where: { id: record.id },
                data: { status: InsightStatus.FAILED, inputSummary: inputSummary as any },
            });

            throw new HttpException('Không thể tạo AI Insight lúc này. Vui lòng thử lại sau.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async callGeminiInsights(summary: any, weekStart: Date): Promise<any> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new HttpException('GEMINI_API_KEY chưa được cấu hình', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const weekNum = this.getISOWeek(weekStart);
        const prompt = `Bạn là một trợ lý phân tích năng suất cá nhân thông minh và là một chuyên gia tâm lý học hành vi. 
Dựa trên dữ liệu hành vi làm việc thực tế của người dùng trong Tuần ${weekNum}, hãy phân tích và đưa ra nhận xét chi tiết, mang tính xây dựng cao bằng tiếng Việt.

**Dữ liệu tuần ${weekNum}:**
- Tổng số Task đã tạo: ${summary.totalTasks}, Đã hoàn thành: ${summary.completedTasks} (Tỷ lệ hoàn thành: ${summary.totalTasks > 0 ? Math.round(summary.completedTasks / summary.totalTasks * 100) : 0}%)
- Tổng phiên Pomodoro: ${summary.totalSessions} (Hoàn thành: ${summary.completedSessions}, Bỏ ngang: ${summary.droppedSessions})
- Thời gian tập trung trung bình mỗi phiên: ${summary.avgFocusMinutes} phút
- Điểm Trì Hoãn (Procrastination Score): ${summary.procrastinationScore}/100 (Điểm càng cao thể hiện mức độ trì hoãn càng nghiêm trọng)
- Khung giờ năng suất nhất (Hoàn thành task nhiều nhất): ${summary.productiveHours}
- Khung giờ trì hoãn nhiều nhất (Bỏ ngang Pomodoro nhiều nhất): ${summary.procrastinatedHours}
- Lý do bỏ ngang Pomodoro phổ biến nhất: "${summary.topDropReason}"
- Phân loại các sự kiện hành vi: ${JSON.stringify(summary.eventCounts)}

**Yêu cầu đầu ra:**
Hãy viết nhận xét đa dạng, giọng điệu tự nhiên, khuyến khích nhưng thẳng thắn. 
Trả về JSON với cấu trúc chính xác sau đây (không được có markdown tag như \`\`\`json hay bất kỳ văn bản giải thích nào khác ngoài JSON):
{
  "insights": [
    {
      "category": "golden_hours",
      "content": "Phân tích cụ thể về khung giờ vàng năng suất của họ (${summary.productiveHours}). Đưa ra lời khuyên làm thế nào để bảo vệ khung giờ này để làm việc quan trọng nhất.",
      "actionable": true
    },
    {
      "category": "procrastination_pattern",
      "content": "Phân tích về khung giờ trì hoãn (${summary.procrastinatedHours}) và lý do bỏ ngang phổ biến nhất (${summary.topDropReason}). Chỉ ra điểm yếu tâm lý/hành vi của họ một cách khoa học.",
      "actionable": true
    },
    {
      "category": "completion_rate",
      "content": "Nhận xét về tỷ lệ hoàn thành công việc và Pomodoro. Đánh giá khả năng duy trì kỷ luật và quản lý thời gian của họ trong tuần.",
      "actionable": false
    }
  ],
  "summary": "Tóm tắt tổng quan hiệu suất và tinh thần làm việc của người dùng trong tuần vừa qua ngắn gọn trong tối đa 2 câu."
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await firstValueFrom(
            this.httpService.post(url, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.65, maxOutputTokens: 1024 },
            })
        );

        const rawText: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return this.cleanAndParseJson(rawText);
    }

  

    // ─── CRON JOB ────────────────────────────────────────────────

    /**
     * Tự động chạy tạo AI Insights hàng tuần lúc 07:00 sáng Thứ Hai.
     */
    @Cron('0 0 7 * * 1')
    async handleWeeklyInsightsCron() {
        this.logger.log('Starting weekly AI Insights cron job...');
        try {
            const users = await this.prisma.user.findMany({
                where: { isActive: true, role: 'USER' },
                select: { id: true },
            });

            const weekStart = this.formatLocalDateString(this.getLastMonday());
            this.logger.log(`Cron target weekStartDate: ${weekStart}. Processing ${users.length} users.`);

            for (const user of users) {
                try {
                    await this.generateInsight(user.id, weekStart, false);
                    this.logger.log(`Successfully generated insight in cron for user ${user.id}`);
                } catch (e) {
                    this.logger.error(`Failed to generate insight in cron for user ${user.id}: ${e.message}`);
                }
            }
        } catch (err) {
            this.logger.error('Error executing weekly AI Insights cron job:', err?.message ?? err);
        }
        this.logger.log('Completed weekly AI Insights cron job.');
    }

    // ─── PRIVATE HELPERS ────────────────────────────────────────

    private cleanAndParseJson(rawText: string) {
        const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Gemini response does not contain a valid JSON object');
        }
        return JSON.parse(jsonMatch[0]);
    }

    private countEvents(logs: any[]): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const log of logs) {
            counts[log.eventType] = (counts[log.eventType] ?? 0) + 1;
        }
        return counts;
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

    private parseStartOfDay(dateStr: string): Date {
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const [, y, m, d] = match;
            return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
        }
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    private formatLocalDateString(date: Date): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    private getLastMonday(): Date {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = CN, 1 = T2, ...
        const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(monday.getDate() - daysToLastMonday - 7);
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    private getISOWeek(date: Date): number {
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
}
