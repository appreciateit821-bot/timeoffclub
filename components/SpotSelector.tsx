'use client';

import { useState, useEffect } from 'react';
import { SPOTS, MAX_CAPACITY, MIN_CAPACITY, SPOT_DETAILS } from '@/lib/constants';

interface SpotSelectorProps {
  selectedDates: string[];
  userName: string;
  onComplete: () => void;
}

interface SpotAvailability {
  [date: string]: {
    [spot: string]: number;
  };
}

export default function SpotSelector({ selectedDates, userName, onComplete }: SpotSelectorProps) {
  const [selectedSpots, setSelectedSpots] = useState<{ [date: string]: string }>({});
  const [selectedModes, setSelectedModes] = useState<{ [date: string]: string }>({});
  const [selectedMemos, setSelectedMemos] = useState<{ [date: string]: string }>({});
  const [selectedEnergy, setSelectedEnergy] = useState<{ [date: string]: string }>({});
  const [availability, setAvailability] = useState<SpotAvailability>({});
  const [modeStats, setModeStats] = useState<{ [dateSpot: string]: { smalltalk: number; reflection: number } }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<{ [key: string]: number }>({});

  const handleWaitlist = async (date: string, spot: string) => {
    try {
      const res = await fetch('/api/reservations/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, spot })
      });
      const data = await res.json();
      if (res.ok) {
        setWaitlistStatus(prev => ({ ...prev, [`${date}_${spot}`]: data.position }));
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('대기 등록 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedDates]);

  const fetchAvailability = async () => {
    const availabilityData: SpotAvailability = {};

    const newModeStats: typeof modeStats = {};

    for (const date of selectedDates) {
      const res = await fetch(`/api/reservations?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        availabilityData[date] = {};

        SPOTS.forEach(spot => {
          const count = data.reservations.filter((r: any) => r.spot === spot).length;
          availabilityData[date][spot] = count;

          const smalltalkCount = data.reservations.filter((r: any) => r.spot === spot && r.mode === 'smalltalk').length;
          const reflectionCount = data.reservations.filter((r: any) => r.spot === spot && r.mode === 'reflection').length;
          newModeStats[`${date}_${spot}`] = { smalltalk: smalltalkCount, reflection: reflectionCount };
        });
      }
    }

    setAvailability(availabilityData);
    setModeStats(newModeStats);
  };

  const handleSpotSelect = (date: string, spot: string) => {
    setSelectedSpots(prev => ({ ...prev, [date]: spot }));
    if (!selectedModes[date]) {
      setSelectedModes(prev => ({ ...prev, [date]: 'smalltalk' }));
    }
  };

  const handleModeSelect = (date: string, mode: string) => {
    setSelectedModes(prev => ({ ...prev, [date]: mode }));
  };

  // 소인원 스팟 넛지: 가장 적은 스팟 찾기
  const getLowestSpot = (date: string) => {
    let min = Infinity;
    let minSpot = '';
    SPOTS.forEach(spot => {
      const count = availability[date]?.[spot] || 0;
      if (count < min && count < MAX_CAPACITY) {
        min = count;
        minSpot = spot;
      }
    });
    return { spot: minSpot, count: min };
  };

  const handleSubmit = async () => {
    setError('');

    // 모든 날짜에 대해 스팟이 선택되었는지 확인
    const missingDates = selectedDates.filter(date => !selectedSpots[date]);
    if (missingDates.length > 0) {
      setError('모든 날짜에 대해 스팟을 선택해주세요.');
      return;
    }

    setLoading(true);

    try {
      const promises = selectedDates.map(date =>
        fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            spot: selectedSpots[date],
            mode: selectedModes[date] || 'smalltalk',
            memo: selectedMemos[date] || '',
            energy: selectedEnergy[date] || 'normal'
          })
        })
      );

      const results = await Promise.all(promises);
      const errors = [];

      for (let i = 0; i < results.length; i++) {
        if (!results[i].ok) {
          const data = await results[i].json();
          errors.push(`${selectedDates[i]}: ${data.error}`);
        }
      }

      if (errors.length > 0) {
        setError(errors.join('\n'));
      } else {
        setSelectedSpots({});
        onComplete();
      }
    } catch (err) {
      setError('예약 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur rounded-xl p-4 sm:p-6 border border-amber-800/30 shadow-lg">
      <h2 className="text-xl font-bold text-amber-100 mb-4">스팟 선택</h2>

      <div className="space-y-6">
        {selectedDates.map(date => (
          <div key={date} className="space-y-3">
            <h3 className="font-semibold text-gray-200">{date}</h3>

            {/* 소인원 스팟 넛지 */}
            {(() => {
              const lowest = getLowestSpot(date);
              const allCounts = SPOTS.map(s => availability[date]?.[s] || 0);
              const max = Math.max(...allCounts);
              const diff = max - lowest.count;
              if (diff >= 3 && lowest.count < 4 && lowest.spot) {
                const spotInfo = SPOT_DETAILS.find(s => s.id === lowest.spot);
                return (
                  <div className="p-3 bg-purple-900/20 border border-purple-700/30 rounded-lg">
                    <p className="text-sm text-purple-200">
                      💜 <strong>{spotInfo?.name}</strong>에서 소규모로 더 깊은 대화를 나눠보는 건 어떨까요?
                    </p>
                    <p className="text-xs text-purple-300/70 mt-1">적은 인원만의 특별한 시간이 될 수 있어요</p>
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid gap-3">
              {SPOT_DETAILS.map(spotInfo => {
                const count = availability[date]?.[spotInfo.id] || 0;
                const isFull = count >= MAX_CAPACITY;
                const isSelected = selectedSpots[date] === spotInfo.id;

                return (
                  <button
                    key={spotInfo.id}
                    onClick={() => !isFull && handleSpotSelect(date, spotInfo.id)}
                    disabled={isFull}
                    className={`p-3 sm:p-4 rounded-lg transition text-left active:scale-[0.98] ${
                      isSelected
                        ? 'bg-amber-600 text-white border-2 border-amber-500'
                        : isFull
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
                        : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-base">{spotInfo.name}</span>
                        <div className="text-right">
                          <span className={`text-sm font-medium px-2 py-1 rounded ${
                            isFull
                              ? 'bg-red-900/50 text-red-300'
                              : count < MIN_CAPACITY
                              ? 'bg-yellow-900/50 text-yellow-300'
                              : isSelected
                              ? 'bg-amber-700 text-amber-100'
                              : 'bg-gray-600 text-gray-300'
                          }`}>
                            {count}/{MAX_CAPACITY}명
                          </span>
                          {count < MIN_CAPACITY && count > 0 && !isFull && (
                            <div className="text-[10px] text-yellow-400 mt-1">최소 {MIN_CAPACITY}명 필요</div>
                          )}
                        </div>
                      </div>

                      <div className={`text-sm space-y-1.5 ${isSelected ? 'text-amber-50' : 'text-gray-300'}`}>
                        <p className="flex items-start gap-2">
                          <span className="text-xs mt-0.5">📍</span>
                          <span>{spotInfo.address}</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-xs mt-0.5">🎫</span>
                          <span>{spotInfo.discount}</span>
                        </p>
                        <p className={`flex items-start gap-2 ${isSelected ? 'text-amber-100' : 'text-gray-400'}`}>
                          <span className="text-xs mt-0.5">✨</span>
                          <span className="text-xs leading-relaxed">{spotInfo.features}</span>
                        </p>
                        {/* 모드별 인원 표시 */}
                        {count > 0 && (
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded">
                              💬 스몰토크 {modeStats[`${date}_${spotInfo.id}`]?.smalltalk || 0}명
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-violet-900/40 text-violet-300 rounded">
                              🧘 사색 {modeStats[`${date}_${spotInfo.id}`]?.reflection || 0}명
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2">
                          <a
                            href={spotInfo.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`flex items-center gap-1 text-xs underline ${
                              isSelected ? 'text-amber-200 hover:text-amber-100' : 'text-blue-400 hover:text-blue-300'
                            }`}
                          >
                            <span>🗺️</span>
                            <span>지도</span>
                          </a>
                          {isFull && !waitlistStatus[`${date}_${spotInfo.id}`] && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleWaitlist(date, spotInfo.id); }}
                              className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                            >
                              대기 등록
                            </button>
                          )}
                          {waitlistStatus[`${date}_${spotInfo.id}`] && (
                            <span className="text-xs text-yellow-300">대기 {waitlistStatus[`${date}_${spotInfo.id}`]}번</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm whitespace-pre-line">
          {error}
        </div>
      )}

      {/* 모드 + 메모 + 에너지 선택 */}
      {selectedDates.filter(d => selectedSpots[d]).length > 0 && (
        <div className="mt-4 space-y-4">
          {selectedDates.filter(d => selectedSpots[d]).map(date => (
            <div key={`options-${date}`} className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50 space-y-4">
              <div className="text-sm text-amber-200 font-medium">{date}</div>
              
              {/* 참여 방식 */}
              <div>
                <div className="text-xs text-gray-400 mb-2">참여 방식</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleModeSelect(date, 'smalltalk')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition active:scale-95 ${
                      (selectedModes[date] || 'smalltalk') === 'smalltalk' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}>💬 스몰토크</button>
                  <button type="button" onClick={() => handleModeSelect(date, 'reflection')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition active:scale-95 ${
                      selectedModes[date] === 'reflection' ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}>🧘 사색</button>
                </div>
              </div>

              {/* 오늘의 에너지 */}
              <div>
                <div className="text-xs text-gray-400 mb-2">오늘의 에너지</div>
                <div className="flex gap-2">
                  {[
                    { key: 'bright', emoji: '☀️', label: '활발' },
                    { key: 'normal', emoji: '🌤️', label: '보통' },
                    { key: 'quiet', emoji: '🌙', label: '조용히' },
                  ].map(e => (
                    <button key={e.key} type="button"
                      onClick={() => setSelectedEnergy(prev => ({ ...prev, [date]: e.key }))}
                      className={`flex-1 py-2 rounded-lg text-sm transition active:scale-95 ${
                        (selectedEnergy[date] || 'normal') === e.key
                          ? 'bg-amber-600/80 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}>
                      {e.emoji} {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 한줄 메모 */}
              <div>
                <div className="text-xs text-gray-400 mb-2">
                  {(selectedModes[date] || 'smalltalk') === 'smalltalk'
                    ? '💭 오늘 나누고 싶은 대화 (선택)'
                    : '💭 오늘의 사색 키워드 (선택)'}
                </div>
                <input
                  type="text"
                  value={selectedMemos[date] || ''}
                  onChange={(e) => setSelectedMemos(prev => ({ ...prev, [date]: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-700/80 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder={(selectedModes[date] || 'smalltalk') === 'smalltalk'
                    ? '예: 요즘 좋아하는 냄새에 대해...'
                    : '예: 고요함, 걷고 싶은 마음...'}
                  maxLength={100}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(selectedSpots).length > 0 && (
        <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <p className="text-sm text-amber-200 text-center">
            🤝 다른 멤버와 스팟 운영자가 당신을 기다립니다.
          </p>
          <p className="text-xs text-amber-300/70 text-center mt-1">
            참석이 어려우시면 3시간 전까지 취소 부탁드려요.
          </p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || Object.keys(selectedSpots).length === 0}
        className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
      >
        {loading ? '예약 중...' : '예약하기'}
      </button>
    </div>
  );
}
