/**
 * Generates an array of time labels at 30-minute intervals covering the full 24-hour day.
 * Format: 12-hour clock with AM/PM (e.g. "12:00 AM", "12:30 AM", ..., "11:30 PM")
 */
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += 1) {
    const hour24 = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const period = hour24 < 12 ? 'AM' : 'PM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const label = `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
    slots.push(label);
  }
  return slots;
}

/**
 * Converts a 12-hour time label (e.g. "9:30 AM") to total minutes from midnight.
 * Used for comparing time slots.
 */
export function timeLabelToMinutes(label: string): number {
  const [time, period] = label.split(' ');
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (period === 'AM') {
    if (hour === 12) hour = 0;
  } else {
    if (hour !== 12) hour += 12;
  }
  return hour * 60 + minute;
}

/** Full list of 48 time slots (12:00 AM → 11:30 PM), computed once at module load. */
export const ALL_TIME_SLOTS = generateTimeSlots();
