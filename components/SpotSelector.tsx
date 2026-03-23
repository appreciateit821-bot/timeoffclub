'use client';

import { useState, useEffect, useMemo } from 'react';
import { SPOTS, MAX_CAPACITY, SPOT_DETAILS } from '@/lib/constants';

const SMALLTALK_PLACEHOLDERS = [
  '지금 이 공간에서 가장 먼저 눈에 들어온 건 뭔가요?',
  '오늘 하루 중 가장 맛있었던 한 입은?',
  '마지막으로 "와, 좋다" 하고 숨 쉰 순간은?',
  '돈이 안 되지만 진심으로 즐기는 게 있나요?',
  '시간 가는 줄 모르고 빠져드는 게 뭔가요?',
  '오늘 길에서 눈에 띈 장면이 있나요?',
  '내일 갑자기 일주일 쉬게 되면 뭘 할 거예요?',
  '최근에 괜히 웃음이 난 순간은?',
  '혼자 있을 때만 하는 행동이 있나요?',
  '냄새로 소환되는 기억이 있나요?',
  '좋아하는 단어가 있나요? 발음이든 뜻이든.',
  '누군가에게 받은 작지만 큰 친절은?',
];

const REFLECTION_PLACEHOLDERS = [
  '책 읽기',
  '생각 정리하기',
  '일기 쓰기',
  '마음 속 감정 들여다보기',
  '좋아하는 음악 떠올리기',
  '창밖 바라보기',
  '오늘 하루 되돌아보기',
  '아무것도 안 하기',
  '손글씨로 편지 쓰기',
  '고마운 사람 떠올리기',
];

interface SpotSelectorProps {
  selectedDates: string[];
  userName: string;
  onComplete: () => void;
}

export default function SpotSelector({ selectedDates, userName, onComplete }: SpotSelectorProps) {
  const [selectedSpot, setSelectedSpot] = useState('');
  const [selectedMode, setSelectedMode] = useState('smalltalk');
  const [memo, setMemo] = useState('');
  const [availability, setAvailability] = useState<{ [spot: string]: number }>({});
  const [modeStats, setModeStats] = useState<{ [spot: string]: { smalltalk: number; reflection: number } }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ date: string; spot: string; mode: string } | null>(null);
  const [waitlistStatus, setWaitlistStatus] = useState<{ [key: string]: number }>({});

  const [maxCapacity, setMaxCapacity] = useState(MAX_CAPACITY);
  const date = selectedDates[0];

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => { if (d.maxCapacity) setMaxCapacity(d.maxCapacity); }).catch(() => {});
  }, []);

  // 랜덤 placeholder
  const smalltalkPlaceholder = useMemo(() =>
    SMALLTALK_PLACEHOLDERS[Math.floor(Math.random() * SMALLTALK_PLACEHOLDERS.length)], [date]);
  const reflectionPlaceholder = useMemo(() =>
    REFLECTION_PLACEHOLDERS[Math.floor(Math.random() * REFLECTION_PLACEHOLDERS.length)], [date]);

  // 스팟 순서 랜덤화
  const shuffledSpots = useMemo(() => {
    const spots = [...SPOT_DETAILS];
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    return spots;
  }, [date]);

  useEffect(() => {
    if (date) fetchAvailability();
  }, [date]);

  const fetchAvailability = async () => {
    const res = await fetch(`/api/reservations?date=${date}`);
    if (res.ok) {
      const data = await res.json();
      const avail: { [spot: string]: number } = {};
      const modes: typeof modeStats = {};

      SPOTS.forEach(spot => {
        avail[spot] = data.reservations.filter((r: any) => r.spot === spot).length;
        modes[spot] = {
          smalltalk: data.reservations.filter((r: any) => r.spot === spot && r.mode !== 'reflection').length,
          reflection: data.reservations.filter((r: any) => r.spot === spot && r.mode === 'reflection').length,
        };
      });

      setAvailability(avail);
      setModeStats(modes);
    }
  };

  const handleWaitlist = async (spot: string) => {
    try {
      const res = await fetch('/api/reservations/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, spot })
      });
      const data = await res.json();
      if (res.ok) setWaitlistStatus(prev => ({ ...prev, [spot]: data.position }));
      else setError(data.error);
    } catch { setError('대기 등록 중 오류'); }
  };

  const handleSubmit = async () => {
    if (!selectedSpot) { setError('스팟을 선택해주세요.'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, spot: selectedSpot, mode: selectedMode, memo })
      });

      if (res.ok) {
        const spotInfo = SPOT_DETAILS.find(s => s.id === selectedSpot);
        setSuccessInfo({ date, spot: spotInfo?.name || selectedSpot, mode: selectedMode });
        setShowSuccess(true);
        setSelectedSpot('');
        setSelectedMode('smalltalk');
        setMemo('');
        onComplete();
      } else {
        const data = await res.json();
        setError(data.error || '예약 실패');
      }
    } catch { setError('예약 중 오류'); }
    finally { setLoading(false); }
  };

  // 소인원 넛지
  const getLowestSpot = () => {
    let min = Infinity, minSpot = '';
    SPOTS.forEach(spot => {
      const count = availability[spot] || 0;
      if (count < min && count < maxCapacity) { min = count; minSpot = spot; }
    });
    return { spot: minSpot, count: min };
  };

  const lowest = getLowestSpot();
  const allCounts = SPOTS.map(s => availability[s] || 0);
  const maxCount = Math.max(...allCounts);
  const showNudge = maxCount - lowest.count >= 3 && lowest.count < 4 && lowest.spot;

  if (showSuccess && successInfo) {
    return (
      <div className="bg-gray-800/80 backdrop-blur rounded-xl p-6 border border-amber-800/30 shadow-lg text-center space-y-5 animate-fade-in">
        <div className="text-5xl">✨</div>
        <h2 className="text-xl font-bold text-amber-100">예약이 완료되었습니다!</h2>
        <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
          <div className="text-amber-200 font-medium">{successInfo.date}</div>
          <div className="text-white text-lg font-semibold">{successInfo.spot}</div>
          <div className={`inline-block text-xs px-2 py-1 rounded ${
            successInfo.mode === 'reflection' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'
          }`}>{successInfo.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}</div>
        </div>
        <div className="text-sm text-gray-400 space-y-1">
          <p>📍 현장에서 1인 1음료 주문을 부탁드려요</p>
          <p>📵 입장 시 스마트폰을 보관합니다</p>
          <p>⏰ 변경/취소는 2시간 전까지 가능해요</p>
        </div>
        <button onClick={() => setShowSuccess(false)}
          className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition active:scale-95">
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur rounded-xl p-4 sm:p-6 border border-amber-800/30 shadow-lg space-y-5">
      <h2 className="text-xl font-bold text-amber-100">스팟 선택</h2>
      <p className="text-xs text-gray-400">{date}</p>

      {/* 소인원 넛지 */}
      {showNudge && (() => {
        const spotInfo = SPOT_DETAILS.find(s => s.id === lowest.spot);
        return (
          <div className="p-3 bg-purple-900/20 border border-purple-700/30 rounded-lg">
            <p className="text-sm text-purple-200">
              💜 <strong>{spotInfo?.name}</strong>에서 소규모로 더 깊은 대화를 나눠보는 건 어떨까요?
            </p>
            <p className="text-xs text-purple-300/70 mt-1">적은 인원만의 특별한 시간이 될 수 있어요</p>
          </div>
        );
      })()}

      {/* 스팟 목록 (랜덤 순서) */}
      <div className="grid gap-3">
        {shuffledSpots.map(spotInfo => {
          const count = availability[spotInfo.id] || 0;
          const isFull = count >= maxCapacity;
          const isSelected = selectedSpot === spotInfo.id;
          const stats = modeStats[spotInfo.id];

          return (
            <button
              key={spotInfo.id}
              onClick={() => !isFull && setSelectedSpot(spotInfo.id)}
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
                      isFull ? 'bg-red-900/50 text-red-300'
                      : isSelected ? 'bg-amber-700 text-amber-100'
                      : 'bg-gray-600 text-gray-300'
                    }`}>{count}/{maxCapacity}명</span>
                  </div>
                </div>

                <div className={`text-sm space-y-1.5 ${isSelected ? 'text-amber-50' : 'text-gray-300'}`}>
                  <p className="flex items-start gap-2"><span className="text-xs mt-0.5">📍</span><span>{spotInfo.address}</span></p>
                  <p className="flex items-start gap-2"><span className="text-xs mt-0.5">🎫</span><span>{spotInfo.discount}</span></p>
                  <p className={`flex items-start gap-2 ${isSelected ? 'text-amber-100' : 'text-gray-400'}`}>
                    <span className="text-xs mt-0.5">✨</span><span className="text-xs leading-relaxed">{spotInfo.features}</span>
                  </p>
                </div>

                {/* 모드별 인원 */}
                {count > 0 && stats && (
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded">💬 스몰토크 {stats.smalltalk}명</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-violet-900/40 text-violet-300 rounded">🧘 사색 {stats.reflection}명</span>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <a href={spotInfo.mapUrl} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1 text-xs underline ${isSelected ? 'text-amber-200' : 'text-blue-400'}`}>
                    🗺️ 지도
                  </a>
                  {isFull && !waitlistStatus[spotInfo.id] && (
                    <button onClick={(e) => { e.stopPropagation(); handleWaitlist(spotInfo.id); }}
                      className="text-xs text-yellow-400 hover:text-yellow-300 underline">대기 등록</button>
                  )}
                  {waitlistStatus[spotInfo.id] && (
                    <span className="text-xs text-yellow-300">대기 {waitlistStatus[spotInfo.id]}번</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 참여 방식 + 메모 */}
      {selectedSpot && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <div className="text-xs text-gray-400 mb-2">참여 방식</div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedMode('smalltalk')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition active:scale-95 ${
                  selectedMode === 'smalltalk' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}>💬 스몰토크</button>
              <button type="button" onClick={() => setSelectedMode('reflection')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition active:scale-95 ${
                  selectedMode === 'reflection' ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}>🧘 사색</button>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-2">
              {selectedMode === 'smalltalk' ? '💭 오늘 나누고 싶은 대화 (선택)' : '💭 오늘의 사색 키워드 (선택)'}
            </div>
            <input
              type="text" value={memo} onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-700/80 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder={selectedMode === 'smalltalk' ? `예: ${smalltalkPlaceholder}` : `예: ${reflectionPlaceholder}`}
              maxLength={100}
            />
          </div>
        </div>
      )}

      {/* 안내 문구 */}
      {selectedSpot && (
        <div className="p-4 bg-amber-900/15 border border-amber-700/20 rounded-lg space-y-2">
          <p className="text-sm text-amber-200 font-medium">📋 예약 안내</p>
          <ul className="text-xs text-amber-200/80 space-y-1.5">
            <li>• 멤버십 기간 동안 <strong>횟수 제한 없이</strong> 자유롭게 예약할 수 있어요</li>
            <li>• 스팟당 인원이 제한되어 있어, <strong>참석이 어려우시면 꼭 취소</strong> 부탁드려요</li>
            <li>• 예약 변경/취소는 <strong>세션 2시간 전까지</strong> 가능해요</li>
            <li>• 노쇼가 반복되면 다른 멤버의 기회가 줄어들어요 🙏</li>
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !selectedSpot}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
      >
        {loading ? '예약 중...' : '예약하기'}
      </button>
    </div>
  );
}
