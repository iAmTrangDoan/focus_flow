import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

export interface WorkWindow {
  startMinutes: number;   // phút tính từ 00:00
  endMinutes: number;
  durationMinutes: number;
  isOvernight: boolean;
}

export function parseHHMM(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new BadRequestException('Thời gian phải đúng định dạng HH:MM (ví dụ: 09:00, 20:30)');
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour * 60 + minute;
}

export function parseWorkWindow(startTime: string, endTime: string): WorkWindow {
  const startMinutes = parseHHMM(startTime);
  const endMinutes = parseHHMM(endTime);

  if (startMinutes === endMinutes) {
    throw new BadRequestException('Giờ bắt đầu và kết thúc không được giống nhau');
  }

  const isOvernight = endMinutes < startMinutes;
  const durationMinutes = isOvernight
    ? 24 * 60 - startMinutes + endMinutes
    : endMinutes - startMinutes;

  if (durationMinutes < 30) {
    throw new BadRequestException('Khung giờ làm việc tối thiểu là 30 phút');
  }

  if (durationMinutes > 720) {
    throw new BadRequestException('Khung giờ làm việc tối đa là 12 tiếng');
  }

  return {
    startMinutes,
    endMinutes,
    durationMinutes,
    isOvernight,
  };
}

export function resolveLogicalDate(
  startAt: Date,
  timezone: string,
  workWindow: WorkWindow,
): Date {
  const localStart = DateTime.fromJSDate(startAt).setZone(timezone);
  let logicalDay = localStart.startOf('day');

  if (
    workWindow.isOvernight &&
    (localStart.hour * 60 + localStart.minute) < workWindow.endMinutes
  ) {
    // Nếu nằm trong khoảng qua đêm (trước endMinutes vào sáng hôm sau), lùi lại 1 ngày logic
    logicalDay = logicalDay.minus({ days: 1 });
  }

  return new Date(`${logicalDay.toISODate()}T00:00:00.000Z`);
}
