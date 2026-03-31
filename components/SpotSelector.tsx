'use client';

import { useState, useEffect, useMemo } from 'react';
import { SPOTS, MAX_CAPACITY, SPOT_DETAILS, getSessionStartTime, getSessionEndTime } from '@/lib/constants';

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

const REFLECTION_ACTIVITIES = [
  { id: 'journal', emoji: '✍️', label: '일기 쓰기', guide: '펜과 노트를 가져오세요. 오늘의 감정, 생각을 자유롭게 적어보는 시간입니다.' },
  { id: 'reading', emoji: '📖', label: '책 읽기', guide: '읽고 싶은 책을 한 권 가져오세요. 폰 없이 오롯이 책에 빠져드는 시간입니다.' },
  { id: 'letter', emoji: '✉️', label: '편지 쓰기', guide: '편지지나 노트를 준비해주세요. 누군가에게, 또는 미래의 나에게 쓰는 편지.' },
  { id: 'drawing', emoji: '🎨', label: '드로잉 / 낙서', guide: '스케치북이나 종이를 가져오세요. 잘 그릴 필요 없어요. 손이 가는 대로.' },
  { id: 'thinking', emoji: '💭', label: '생각 정리', guide: '메모할 펜과 종이만 있으면 돼요. 머릿속 생각을 꺼내서 정리하는 시간.' },
  { id: 'rest', emoji: '🌙', label: '그냥 쉬기', guide: '아무것도 준비하지 않아도 됩니다. 공간에서 멍하니 쉬는 것 자체가 사색이에요.' },
];

const REFLECTION_PLACEHOLDERS = REFLECTION_ACTIVITIES.map(a => a.label);

interface SpotSelectorProps {
  selectedDates: string[];
  userName: string;
  isTrial?: boolean;
  onComplete: () => void;
}

export default function SpotSelector({ selectedDates, userName, isTrial = false, onComplete }: SpotSelectorProps) {
  const [selectedSpot, setSelectedSpot] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [memo, setMemo] = useState('');
  const [availability, setAvailability] = useState<{ [spot: string]: number }>({});
  const [modeStats, setModeStats] = useState<{ [spot: string]: { smalltalk: number; reflection: number } }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reflectionActivity, setReflectionActivity] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ date: string; spot: string; mode: string; warning?: string } | null>(null);
  const [waitlistStatus, setWaitlistStatus] = useState<{ [key: string]: number }>({});
  const [closedSpots, setClosedSpots] = useState<Set<string>>(new Set());
  const [spotNotices, setSpotNotices] = useState<{ [spot: string]: string }>({});

  const [maxCapacity, setMaxCapacity] = useState(MAX_CAPACITY);
  const [spotCapacities, setSpotCapacities] = useState<{ [spot: string]: number }>({});
  const [spotDefaultCaps, setSpotDefaultCaps] = useState<{ [spot: string]: number }>({});
  const date = selectedDates[0];

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => { if (d.maxCapacity) setMaxCapacity(d.maxCapacity); }).catch(() => {});
    fetch('/api/admin/spot-notices').then(r => r.json()).then(d => {
      const map: { [s: string]: string } = {};
      (d.notices || []).forEach((n: any) => { map[n.spot] = n.notice; });
      setSpotNotices(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (date) {
      fetch(`/api/admin/capacity?date=${date}`).then(r => r.json()).then(d => {
        const caps: { [spot: string]: number } = {};
        (d.capacities || []).forEach((c: any) => { caps[c.spot] = c.max_capacity; });
        setSpotCapacities(caps);
        if (d.defaultCapacity) setMaxCapacity(d.defaultCapacity);
        if (d.spotDefaults) setSpotDefaultCaps(d.spotDefaults);
      }).catch(() => {});
    }
  }, [date]);

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
    if (date) {
      fetchAvailability();
      fetchClosedSpots();
    }
  }, [date]);

  const fetchClosedSpots = async () => {
    try {
      const month = date.slice(0, 7);
      const res = await fetch(`/api/reservations/stats?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        const closed = new Set<string>();
        for (const c of (data.closed || [])) {
          if (c.date === date) {
            if (!c.spot) { SPOTS.forEach(s => closed.add(s)); } // 전체 닫기
            else { closed.add(c.spot); }
          }
        }
        setClosedSpots(closed);
      }
    } catch (e) { console.error(e); }
  };

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
    if (!selectedMode) { setError('참여 방식(스몰토크/사색)을 선택해주세요.'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, spot: selectedSpot, mode: selectedMode, memo: selectedMode === 'reflection' && reflectionActivity ? `[${REFLECTION_ACTIVITIES.find(a => a.id === reflectionActivity)?.label}] ${memo}`.trim() : memo })
      });

      if (res.ok) {
        const data = await res.json();
        const spotInfo = SPOT_DETAILS.find(s => s.id === selectedSpot);
        setSuccessInfo({ date, spot: spotInfo?.name || selectedSpot, mode: selectedMode, warning: data.warning });
        setShowSuccess(true);
        setSelectedSpot('');
        setSelectedMode('');
        setMemo('');
        onComplete();
      } else {
        const data = await res.json();
        setError(data.error || '예약 실패');
      }
    } catch { setError('예약 중 오류'); }
    finally { setLoading(false); }
  };

  // 스팟별 인원 제한
  const getCapForSpot = (spotId: string) => spotCapacities[spotId] || spotDefaultCaps[spotId] || maxCapacity;

  // 소인원 넛지
  const getLowestSpot = () => {
    let min = Infinity, minSpot = '';
    SPOTS.forEach(spot => {
      const count = availability[spot] || 0;
      if (count < min && count < getCapForSpot(spot)) { min = count; minSpot = spot; }
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
        {successInfo.warning && (
          <div className="bg-orange-900/30 border border-orange-700/30 rounded-lg p-3 text-sm text-orange-200">
            ⚠️ {successInfo.warning} 다른 스팟으로 변경을 고려해보세요.
          </div>
        )}

        {/* 캘린더 등록 유도 (메인 CTA) */}
        {(() => {
          const spotId = SPOT_DETAILS.find(s => s.name === successInfo.spot || s.id === successInfo.spot)?.id || successInfo.spot;
          const spotInfo = SPOT_DETAILS.find(s => s.id === spotId);
          const start = getSessionStartTime(successInfo.date);
          const end = getSessionEndTime(successInfo.date);
          const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
          const icsUrl = `/api/reservations/ics?date=${successInfo.date}&spot=${encodeURIComponent(spotId)}`;
          const noticeText = spotNotices[spotId] ? ` | ℹ️ ${spotNotices[spotId]}` : '';
          const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('타임오프클럽 - ' + (spotInfo?.name || spotId))}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(spotInfo?.address || '')}&details=${encodeURIComponent('📵 스마트폰 보관 | ☕ 1인 1음료' + noticeText)}`;
          return (
            <div className="bg-gradient-to-b from-blue-900/30 to-blue-900/10 border border-blue-600/30 rounded-xl p-5 space-y-3">
              <div className="text-center">
                <p className="text-blue-100 font-semibold">📅 캘린더에 등록해주세요!</p>
                <p className="text-blue-300/70 text-xs mt-1">세션 당일 알림을 받을 수 있어요</p>
              </div>
              <a href={icsUrl}
                className="block w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm text-center transition active:scale-95 font-medium border border-gray-600">
                🍎 아이폰 캘린더에 추가
              </a>
              <a href={googleUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm text-center transition active:scale-95 font-medium">
                📅 구글 캘린더에 추가 (안드로이드)
              </a>
              <p className="text-center text-gray-500 text-[10px]">아이폰: 다운로드된 파일을 열면 캘린더에 자동 추가됩니다</p>
            </div>
          );
        })()}

        <div className="text-sm text-gray-400 space-y-1">
          <p>📍 현장에서 1인 1음료 주문을 부탁드려요</p>
          <p>📵 입장 시 스마트폰을 보관합니다</p>
          <p>⏰ 변경/취소는 2시간 전까지 가능해요</p>
        </div>
        <button onClick={() => setShowSuccess(false)}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition active:scale-95">
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
          const isClosed = closedSpots.has(spotInfo.id);
          const isFull = !isClosed && count >= getCapForSpot(spotInfo.id);
          const isSelected = selectedSpot === spotInfo.id;
          const stats = modeStats[spotInfo.id];

          return (
            <button
              key={spotInfo.id}
              onClick={() => !isFull && !isClosed && setSelectedSpot(spotInfo.id)}
              disabled={isFull || isClosed}
              className={`p-3 sm:p-4 rounded-lg transition text-left active:scale-[0.98] ${
                isSelected
                  ? 'bg-amber-600 text-white border-2 border-amber-500'
                  : isClosed
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700 opacity-60'
                  : isFull
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
                  : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 hover:border-amber-500/50'
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-base">{spotInfo.name}</span>
                  <div className="text-right">
                    {isClosed ? (
                      <span className="text-sm font-medium px-2 py-1 rounded bg-gray-700 text-gray-500">휴무</span>
                    ) : (
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      isFull ? 'bg-red-900/50 text-red-300'
                      : isSelected ? 'bg-amber-700 text-amber-100'
                      : 'bg-gray-600 text-gray-300'
                    }`}>
                      {count}/{getCapForSpot(spotInfo.id)}명
                    </span>
                    )}
                    {!isFull && count >= getCapForSpot(spotInfo.id) * 0.8 && (
                      <div className="text-[10px] text-orange-400 mt-0.5">🔥 마감 임박</div>
                    )}
                    {count > 0 && count <= 3 && !isFull && (
                      <div className="text-[10px] text-purple-300 mt-0.5">✨ 소규모</div>
                    )}
                  </div>
                </div>

                <div className={`text-sm space-y-1.5 ${isSelected ? 'text-amber-50' : 'text-gray-300'}`}>
                  <p className="flex items-start gap-2"><span className="text-xs mt-0.5">📍</span><span>{spotInfo.address}</span></p>
                  <p className="flex items-start gap-2"><span className="text-xs mt-0.5">🎫</span><span>{spotInfo.discount}</span></p>
                  <p className={`flex items-start gap-2 ${isSelected ? 'text-amber-100' : 'text-gray-400'}`}>
                    <span className="text-xs mt-0.5">✨</span><span className="text-xs leading-relaxed">{spotInfo.features}</span>
                  </p>
                </div>

                {/* 스팟 안내 (수요일만 표시되는 안내 고려) */}
                {spotNotices[spotInfo.id] && !isClosed && (() => {
                  // 선택한 날짜의 요일 확인 (수요일=3)
                  const selectedDay = new Date(date + 'T00:00:00+09:00').getDay();
                  const notice = spotNotices[spotInfo.id];
                  // "수요일" 키워드가 포함된 안내는 수요일에만 표시
                  if (notice.includes('수요일') && selectedDay !== 3) return null;
                  // "일요일" 키워드가 포함된 안내는 일요일에만 표시
                  if (notice.includes('일요일') && selectedDay !== 0) return null;
                  return (
                    <div className={`text-xs px-2.5 py-1.5 rounded-lg ${isSelected ? 'bg-amber-700/50 text-amber-100' : 'bg-amber-900/30 text-amber-300/80'} border border-amber-700/20`}>
                      ℹ️ {notice}
                    </div>
                  );
                })()}

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
            <div className="text-xs text-gray-400 mb-2">참여 방식 <span className="text-red-400">*</span></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedMode('smalltalk')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition active:scale-95 border-2 ${
                  selectedMode === 'smalltalk' ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 border-transparent'
                }`}>💬 스몰토크</button>
              <button type="button" onClick={() => setSelectedMode('reflection')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition active:scale-95 border-2 ${
                  selectedMode === 'reflection' ? 'bg-violet-600 text-white border-violet-500' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 border-transparent'
                }`}>🧘 사색</button>
            </div>
            {!selectedMode && <p className="text-[10px] text-amber-300 mt-1">스몰토크 또는 사색을 선택해주세요</p>}
          </div>

          {/* 사색 활동 선택 */}
          {selectedMode === 'reflection' && (
            <div>
              <div className="text-xs text-gray-400 mb-2">🧘 오늘의 사색 활동 <span className="text-gray-500">(선택)</span></div>
              <div className="grid grid-cols-2 gap-2">
                {REFLECTION_ACTIVITIES.map(a => (
                  <button key={a.id} type="button"
                    onClick={() => setReflectionActivity(reflectionActivity === a.id ? '' : a.id)}
                    className={`p-2.5 rounded-lg text-left transition text-sm ${
                      reflectionActivity === a.id
                        ? 'bg-violet-600/30 border-2 border-violet-500 text-violet-100'
                        : 'bg-gray-700/60 border border-gray-600 text-gray-300 hover:border-violet-500/30'
                    }`}>
                    <span className="text-base">{a.emoji}</span>
                    <span className="ml-1.5">{a.label}</span>
                  </button>
                ))}
              </div>
              {reflectionActivity && (
                <div className="mt-2 p-3 bg-violet-900/20 border border-violet-700/30 rounded-lg">
                  <p className="text-xs text-violet-300">
                    📋 {REFLECTION_ACTIVITIES.find(a => a.id === reflectionActivity)?.guide}
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-xs text-gray-400 mb-2">
              {selectedMode === 'reflection' ? '💭 메모 (선택)' : selectedMode === 'smalltalk' ? '💭 오늘 나누고 싶은 대화 (선택)' : '💭 참여 방식을 먼저 선택해주세요'}
            </div>
            <input
              type="text" value={memo} onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-700/80 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder={selectedMode === 'smalltalk' ? `예: ${smalltalkPlaceholder}` : reflectionActivity ? `${REFLECTION_ACTIVITIES.find(a => a.id === reflectionActivity)?.label}에 대한 메모...` : '사색 키워드나 메모'}
              maxLength={100}
            />
          </div>
        </div>
      )}

      {/* 안내 문구 */}
      {selectedSpot && (
        <div className="p-4 bg-amber-900/15 border border-amber-700/20 rounded-lg space-y-2">
          <p className="text-sm text-amber-200 font-medium">📋 예약 안내</p>
          {isTrial ? (
            <ul className="text-xs text-amber-200/80 space-y-1.5">
              <li>• 체험권은 <strong>1회만 예약</strong> 가능합니다</li>
              <li>• 예약 후 <strong>노쇼 시에도 체험권이 소진</strong>됩니다</li>
              <li>• 예약 변경·취소는 <strong>세션 2시간 전까지</strong> 가능해요</li>
              <li>• 현장에서 전용 할인 적용, <strong>1인 1음료</strong> 주문 원칙</li>
              <li>• 입장 시 <strong>스마트폰 보관함</strong>에 스마트폰을 맡겨주세요 📵</li>
            </ul>
          ) : (
            <ul className="text-xs text-amber-200/80 space-y-1.5">
              <li>• 원하는 일정과 스팟에 <strong>횟수 제한 없이</strong> 참여 가능해요</li>
              <li>• 예약 신청·변경·취소는 <strong>세션 2시간 전까지</strong> 가능해요</li>
              <li>• 노쇼 시 <strong>패널티가 부과</strong>됩니다. 참석이 어려우면 꼭 취소해주세요 🙏</li>
              <li>• 현장에서 전용 할인 적용, <strong>1인 1음료</strong> 주문 원칙</li>
              <li>• 입장 시 <strong>스마트폰 보관함</strong>에 스마트폰을 맡겨주세요 📵</li>
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !selectedSpot || !selectedMode}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
      >
        {loading ? '예약 중...' : '예약하기'}
      </button>
    </div>
  );
}
