'use client';

import { useState } from 'react';
import { AVAILABLE_DAYS, TIME_SLOTS, isBookingClosed } from '@/lib/constants';

interface CalendarProps {
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
}

export default function Calendar({ selectedDates, onDatesChange }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
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
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    const closed = available && !isPast && isBookingClosed(dateStr);

    days.push(
      <button
        key={day}
        onClick={() => available && !isPast && !closed && toggleDate(dateStr)}
        disabled={!available || isPast || closed}
        className={`aspect-square p-1 sm:p-2 rounded-lg transition active:scale-95 ${
          selected
            ? 'bg-amber-600 text-white font-semibold shadow-md'
            : closed
            ? 'bg-red-900/30 text-red-400 cursor-not-allowed border border-red-800/30'
            : available && !isPast
            ? 'bg-gray-700 hover:bg-gray-600 text-white hover:border-amber-500/30 border border-transparent'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <span className="text-sm sm:text-lg">{day}</span>
          {closed && (
            <span className="text-[9px] sm:text-[10px] mt-0.5 text-red-400">마감</span>
          )}
          {available && !isPast && !closed && (
            <span className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 opacity-75">{timeSlot}</span>
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
    </div>
  );
}
