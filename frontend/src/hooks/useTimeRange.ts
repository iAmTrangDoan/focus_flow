import { useState, useEffect, useMemo } from 'react';
import { ALL_TIME_SLOTS, timeLabelToMinutes } from '../utils/timeSlots';

/**
 * Custom hook quản lý state Work Hours (startTime / endTime).
 * - availableEndTimes: chỉ gồm các slot sau startTime
 * - Auto-reset endTime nếu startTime thay đổi làm endTime hiện tại không còn hợp lệ
 */
export function useTimeRange(
  defaultStart = '9:00 AM',
  defaultEnd = '12:00 PM',
) {
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);

  const availableEndTimes = useMemo(() => {
    const startMinutes = timeLabelToMinutes(startTime);
    return ALL_TIME_SLOTS.filter((t) => timeLabelToMinutes(t) > startMinutes);
  }, [startTime]);

  useEffect(() => {
    if (!availableEndTimes.includes(endTime)) {
      setEndTime(availableEndTimes[0] ?? '');
    }
  }, [availableEndTimes, endTime]);

  return { startTime, setStartTime, endTime, setEndTime, availableEndTimes };
}
