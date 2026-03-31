'use client';

import { useState, useEffect } from 'react';
import { AVAILABLE_DAYS, TIME_SLOTS, isBookingClosed, getTodayKST } from '@/lib/constants';

interface SpotStats {
  total: number;
  smalltalk: number;
  reflection: number;
}

interface DateStats {
  [spot: string]: SpotStats;
  _total: SpotStats;
}

interface CalendarProps {
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
  activeMonths?: string;
  isTrial?: boolean;
}

export default function Calendar({ selectedDates, onDatesChange, activeMonths, isTrial }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMembershipAlert, setShowMembershipAlert] = useState(false);
  const [alertMonth, setAlertMonth] = useState('');
  const [dateStats, setDateStats] = useState<{ [date: string]: DateStats }>({});
  const [closedDates, setClosedDates] = useState<{ date: string; spot: string | null }[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // 활성월 체크
  const activeMonthList = activeMonths ? activeMonths.split(',').map(m => m.trim()) : [];
  const hasMonthRestriction = activeMonthList.length > 0;

  const isMonthActive = (y: number, m: number) => {
    if (!hasMonthRestriction) return true;
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    return activeMonthList.includes(monthStr);
  };

  const getMonthLabel = (m: number) => ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'][m];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    const nextY = month === 11 ? year + 1 : year;
    const nextM = month === 11 ? 0 : month + 1;
    // 체험권은 4월까지만 가능
    if (isTrial) {
      // 4월(month index 3) 이후로는 못 넘기게
      if (nextY > 2026 || (nextY === 2026 && nextM > 3)) {
        setAlertMonth(`${nextY}년 ${getMonthLabel(nextM)}`);
        setShowMembershipAlert(true);
        return;
      }
    }
    if (hasMonthRestriction && !isMonthActive(nextY, nextM)) {
      setAlertMonth(`${nextY}년 ${getMonthLabel(nextM)}`);
      setShowMembershipAlert(true);
      return;
    }
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 예약 현황 로드
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/reservations/stats?month=${monthStr}`);
        if (res.ok) {
          const data = await res.json();
          // stats를 날짜별로 집계
          const grouped: { [date: string]: DateStats } = {};
          for (const s of data.stats as any[]) {
            if (!grouped[s.date]) grouped[s.date] = { _total: { total: 0, smalltalk: 0, reflection: 0 } };
            if (!grouped[s.date][s.spot]) grouped[s.date][s.spot] = { total: 0, smalltalk: 0, reflection: 0 };
            grouped[s.date][s.spot].total += s.count;
            grouped[s.date]._total.total += s.count;
            if (s.mode === 'reflection') {
              grouped[s.date][s.spot].reflection += s.count;
              grouped[s.date]._total.reflection += s.count;
            } else {
              grouped[s.date][s.spot].smalltalk += s.count;
              grouped[s.date]._total.smalltalk += s.count;
            }
          }
          setDateStats(grouped);
          setClosedDates(data.closed || []);
        }
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, [monthStr]);

  const isDateClosed = (dateStr: string): boolean => {
    return closedDates.some(c => c.date === dateStr && c.spot === null);
  };

  const isAvailableDay = (date: Date): boolean => {
    const day = date.getDay();
    return day === AVAILABLE_DAYS.WEDNESDAY || day === AVAILABLE_DAYS.SUNDAY;
  };

  const getDateString = (day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      onDatesChange([]);
    } else {
      onDatesChange([dateStr]);
    }
  };

  const getTimeSlot = (date: Date): string => {
    const day = date.getDay();
    if (day === AVAILABLE_DAYS.WEDNESDAY) return TIME_SLOTS.WEDNESDAY;
    if (day === AVAILABLE_DAYS.SUNDAY) return TIME_SLOTS.SUNDAY;
    return '';
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = getDateString(day);
    const available = isAvailableDay(date);
    const selected = selectedDates.includes(dateStr);
    const timeSlot = getTimeSlot(date);
    const todayStr = getTodayKST();
    const isPast = dateStr < todayStr;
    const closed = available && !isPast && isBookingClosed(dateStr);
    const dayClosed = isDateClosed(dateStr);
    const stats = dateStats[dateStr]?._total;
    const isDisabled = !available || isPast || closed || dayClosed;

    days.push(
      <button
        key={day}
        onClick={() => !isDisabled && toggleDate(dateStr)}
        disabled={isDisabled}
        className={`aspect-square p-1 sm:p-2 rounded-lg transition active:scale-95 ${
          selected
            ? 'bg-amber-600 text-white font-semibold shadow-md'
            : dayClosed
            ? 'bg-red-900/30 text-red-400 cursor-not-allowed border border-red-800/30'
            : closed
            ? 'bg-red-900/30 text-red-400 cursor-not-allowed border border-red-800/30'
            : available && !isPast
            ? 'bg-gray-700 hover:bg-gray-600 text-white hover:border-amber-500/30 border border-transparent'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <span className="text-sm sm:text-lg">{day}</span>
          {dayClosed && (
            <span className="text-[9px] sm:text-[10px] mt-0.5 text-red-400">휴무</span>
          )}
          {closed && !dayClosed && (
            <span className="text-[9px] sm:text-[10px] mt-0.5 text-red-400">마감</span>
          )}
          {available && !isPast && !closed && !dayClosed && (
            <>
              <span className="text-[10px] sm:text-xs mt-0.5 opacity-75">{timeSlot}</span>
              {stats && stats.total > 0 && (
                <span className="text-[8px] sm:text-[9px] mt-0.5 text-amber-300/80">{stats.total}명</span>
              )}
            </>
          )}
        </div>
      </button>
    );
  }

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="bg-gray-800/80 backdrop-blur rounded-xl p-4 sm:p-6 border border-amber-800/30 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-700 rounded-lg transition"
        >
          <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-amber-100">
          {year}년 {monthNames[month]}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-700 rounded-lg transition"
        >
          <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          수요일(20:00), 일요일(15:00)만 선택 가능합니다.
        </p>
        {selectedDates.length > 0 && (
          <p className="text-sm text-amber-400 mt-2 font-medium">
            📅 {selectedDates[0]} 선택됨
          </p>
        )}
      </div>

      {/* 멤버십 결제 안내 모달 */}
      {showMembershipAlert && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowMembershipAlert(false)}>
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4 border border-amber-700/30 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <div className="text-3xl">🌿</div>
              <h3 className="text-white font-bold text-lg">{alertMonth} 멤버십</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {alertMonth} 멤버십이 아직 활성화되지 않았어요.<br/>
                계속해서 타임오프를 즐기시려면<br/>멤버십을 결제해주세요!
              </p>
            </div>
            <div className="space-y-2">
              <a
                href="https://smartstore.naver.com/wellmoment"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-[#03C75A] hover:bg-[#02b351] text-white rounded-xl font-semibold text-center transition active:scale-95"
              >
                🛒 멤버십 결제하기
              </a>
              <button
                onClick={() => setShowMembershipAlert(false)}
                className="block w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
