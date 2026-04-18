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
  userName?: string;
  phoneLast4?: string;
  onRenewSuccess?: (newMonth: string) => void;
}

export default function Calendar({ selectedDates, onDatesChange, activeMonths, isTrial, userName, phoneLast4, onRenewSuccess }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    // 체험권은 4월부터 시작
    if (isTrial) return new Date(2026, 3, 1);
    // 활성월이 있으면 가장 가까운 활성월로 시작
    if (activeMonths) {
      const months = activeMonths.split(',').map(m => m.trim()).sort();
      const now = new Date();
      const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
      const curMonth = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}`;
      // 현재 월이 활성이면 현재 월, 아니면 다음 활성월
      const activeMonth = months.includes(curMonth) ? curMonth : months.find(m => m >= curMonth) || months[months.length - 1];
      if (activeMonth) {
        const [y, m] = activeMonth.split('-').map(Number);
        return new Date(y, m - 1, 1);
      }
    }
    return new Date();
  });
  const [showMembershipAlert, setShowMembershipAlert] = useState(false);
  const [alertMonth, setAlertMonth] = useState('');
  const [renewOrderId, setRenewOrderId] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState('');
  const [renewSuccess, setRenewSuccess] = useState('');
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
    // 체험권은 4월 이전으로 못 감
    if (isTrial && (year === 2026 && month <= 3)) return;
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
            ? 'bg-red-50 text-red-400 cursor-not-allowed border border-red-200'
            : closed
            ? 'bg-red-50 text-red-400 cursor-not-allowed border border-red-200'
            : available && !isPast
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:border-amber-500/30 border border-transparent'
            : 'bg-white text-gray-600 cursor-not-allowed'
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
            <span className="text-[10px] sm:text-xs mt-0.5 opacity-75">{timeSlot}</span>
          )}
        </div>
      </button>
    );
  }

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-300">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
        >
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-amber-800">
          {year}년 {monthNames[month]}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
        >
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-300">
        <p className="text-sm text-gray-500">
          수요일(20:00), 일요일(15:00)만 선택 가능합니다.
        </p>
        {selectedDates.length > 0 && (
          <p className="text-sm text-amber-600 mt-2 font-medium">
            📅 {selectedDates[0]} 선택됨
          </p>
        )}
      </div>

      {/* 멤버십 갱신 모달 */}
      {showMembershipAlert && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { if (!renewLoading) { setShowMembershipAlert(false); setRenewOrderId(''); setRenewError(''); setRenewSuccess(''); } }}>
          <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm space-y-4 border border-amber-200 animate-fade-in" onClick={e => e.stopPropagation()}>
            {renewSuccess ? (
              <div className="text-center space-y-3">
                <div className="text-4xl">🎉</div>
                <h3 className="text-gray-800 font-bold text-lg">{renewSuccess}</h3>
                <p className="text-gray-500 text-sm">이제 {alertMonth} 세션을 예약할 수 있어요.</p>
                <button
                  onClick={() => { setShowMembershipAlert(false); setRenewSuccess(''); setRenewOrderId(''); }}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold transition active:scale-95"
                >
                  예약하러 가기
                </button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="text-3xl">🌿</div>
                  <h3 className="text-gray-800 font-bold text-lg">{alertMonth} 멤버십</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {alertMonth} 멤버십이 아직 활성화되지 않았어요.
                  </p>
                </div>

                <a
                  href="https://smartstore.naver.com/wellmoment"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-[#03C75A] hover:bg-[#02b351] text-white rounded-xl font-semibold text-center transition active:scale-95"
                >
                  🛒 스마트스토어에서 결제하기
                </a>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-gray-700 text-sm font-medium mb-2">이미 결제하셨나요?</p>
                  <p className="text-gray-500 text-xs mb-3">스마트스토어 마이페이지 → 주문내역에서 주문번호를 확인해주세요.</p>
                  <input
                    value={renewOrderId}
                    onChange={e => setRenewOrderId(e.target.value)}
                    placeholder="주문번호 입력"
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 text-base font-mono focus:outline-none focus:border-amber-500 mb-3"
                  />
                  {renewError && (
                    <p className="text-red-600 text-xs mb-3 leading-relaxed">{renewError}</p>
                  )}
                  <button
                    onClick={async () => {
                      if (!renewOrderId.trim() || !userName || !phoneLast4) return;
                      setRenewLoading(true);
                      setRenewError('');
                      try {
                        const res = await fetch('/api/renew', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: userName, phoneLast4, smartstoreOrderId: renewOrderId.trim() }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setRenewError(data.error || '갱신 실패');
                          return;
                        }
                        setRenewSuccess(data.message);
                        if (onRenewSuccess) onRenewSuccess(data.month);
                      } catch {
                        setRenewError('네트워크 오류가 발생했습니다.');
                      } finally {
                        setRenewLoading(false);
                      }
                    }}
                    disabled={!renewOrderId.trim() || renewLoading}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition active:scale-95 ${
                      renewOrderId.trim() && !renewLoading
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {renewLoading ? '확인 중...' : '멤버십 활성화'}
                  </button>
                </div>

                <button
                  onClick={() => { setShowMembershipAlert(false); setRenewOrderId(''); setRenewError(''); }}
                  className="block w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition"
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
