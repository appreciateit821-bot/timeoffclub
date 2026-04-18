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
  const [spotMemos, setSpotMemos] = useState<{ [spot: string]: string[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reflectionActivity, setReflectionActivity] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ date: string; spot: string; mode: string; warning?: string; smalltalkCount?: number } | null>(null);
  
  // 대화 열기 관련 상태
  const [conversationTopics, setConversationTopics] = useState<{ [spot: string]: string }>({});
  const [eligibleSpots, setEligibleSpots] = useState<string[]>([]);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [selectedTopicSpot, setSelectedTopicSpot] = useState('');
  const [topicSuggestions, setTopicSuggestions] = useState<{ [category: string]: string[] }>({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [topicLoading, setTopicLoading] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<{ [key: string]: number }>({});
  const [closedSpots, setClosedSpots] = useState<Set<string>>(new Set());
  const [inactiveSpots, setInactiveSpots] = useState<Set<string>>(new Set());
  const [spotNotices, setSpotNotices] = useState<{ [spot: string]: string }>({});
  const [visitedSpots, setVisitedSpots] = useState<Set<string>>(new Set());

  const [maxCapacity, setMaxCapacity] = useState(MAX_CAPACITY);
  const [spotCapacities, setSpotCapacities] = useState<{ [spot: string]: number }>({});
  const [spotDefaultCaps, setSpotDefaultCaps] = useState<{ [spot: string]: number }>({});
  const date = selectedDates[0];

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => { if (d.maxCapacity) setMaxCapacity(d.maxCapacity); }).catch(() => {});
    // 방문 기록 가져오기
    fetch('/api/reservations').then(r => r.json()).then(d => {
      const spots = new Set<string>();
      (d.reservations || []).filter((r: any) => r.check_in_status === 'attended').forEach((r: any) => spots.add(r.spot));
      setVisitedSpots(spots);
    }).catch(() => {});
    fetch('/api/admin/spot-notices').then(r => r.json()).then(d => {
      const map: { [s: string]: string } = {};
      (d.notices || []).forEach((n: any) => { map[n.spot] = n.notice; });
      setSpotNotices(map);
    }).catch(() => {});
    
    // 대화 주제 추천 데이터 미리 로드
    loadTopicSuggestions();
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
      
      // 대화 주제 로드
      loadConversationTopics(date);
    }
  }, [date]);
  
  // 대화 주제 로드 함수
  const loadConversationTopics = async (selectedDate: string) => {
    try {
      const response = await fetch(`/api/conversation-topics?date=${selectedDate}`);
      const data = await response.json();
      
      // 주제 데이터를 spot 기준으로 매핑
      const topicMap: { [spot: string]: string } = {};
      (data.topics || []).forEach((topic: any) => {
        topicMap[topic.spot] = topic.topic;
      });
      
      setConversationTopics(topicMap);
      setEligibleSpots(data.eligible_spots || []);
    } catch (error) {
      console.error('Failed to load conversation topics:', error);
    }
  };
  
  // 대화 주제 추천 로드
  const loadTopicSuggestions = async () => {
    // 이미 로드된 경우 스킵
    if (Object.keys(topicSuggestions).length > 0) {
      console.log('✅ Topic suggestions already loaded, skipping API call');
      return;
    }
    
    try {
      console.log('🔄 Loading topic suggestions...');
      const response = await fetch('/api/conversation-topics/suggestions');
      const data = await response.json();
      console.log('📋 Topic suggestions loaded:', Object.keys(data.suggestions || {}));
      
      setTopicSuggestions(data.suggestions || {});
    } catch (error) {
      console.error('❌ Failed to load topic suggestions:', error);
      // 백업 데이터
      setTopicSuggestions({
        '일상 수다': ['요즘 빠져있는 넷플릭스/유튜브 추천', '인생 최애 카페 or 단골집 자랑'],
        '취미와 취향': ['남들한테 말하면 의외라는 나의 취미', '시간 가는 줄 모르고 빠져드는 것'],
        '여행과 장소': ['혼자 여행에서 생긴 에피소드', '다시 가고 싶은 장소와 그 이유']
      });
    }
  };

  // 랜덤 placeholder
  const smalltalkPlaceholder = useMemo(() =>
    SMALLTALK_PLACEHOLDERS[Math.floor(Math.random() * SMALLTALK_PLACEHOLDERS.length)], [date]);
  const reflectionPlaceholder = useMemo(() =>
    REFLECTION_PLACEHOLDERS[Math.floor(Math.random() * REFLECTION_PLACEHOLDERS.length)], [date]);

  // 스팟 순서 랜덤화
  const shuffledSpots = useMemo(() => {
    const spots = [...SPOT_DETAILS].filter(s => !inactiveSpots.has(s.id));
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    return spots;
  }, [date, inactiveSpots]);

  useEffect(() => {
    if (date) {
      fetchAvailability();
      fetchClosedSpots();
    }
  }, [date]);

  useEffect(() => {
    console.log('🔄 topicSuggestions state changed:', topicSuggestions);
    console.log('🔄 Keys count:', Object.keys(topicSuggestions).length);
  }, [topicSuggestions]);

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
        // 비활성 스팟은 별도 — 아예 렌더링에서 제외
        setInactiveSpots(new Set(data.inactiveSpots || []));
      }
    } catch (e) { console.error(e); }
  };
  
  // 대화 주제 생성 함수
  const createConversationTopic = async (spot: string, topic: string, category?: string) => {
    setTopicLoading(true);
    try {
      const response = await fetch('/api/conversation-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          spot,
          topic,
          category
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || '대화 주제 생성에 실패했습니다.');
        return false;
      }
      
      // 상태 업데이트
      setConversationTopics(prev => ({
        ...prev,
        [spot]: topic
      }));
      
      // 이 스팟을 선택하고 예약 계속 진행
      setSelectedSpot(spot);
      setShowTopicModal(false);
      setSelectedTopicSpot('');
      setCustomTopic('');
      setSelectedCategory('');
      
      return true;
    } catch (error) {
      console.error('Create topic error:', error);
      setError('대화 주제 생성 중 오류가 발생했습니다.');
      return false;
    } finally {
      setTopicLoading(false);
    }
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

      // 스팟별 메모 수집 (스몰토크 모드만)
      const memos: { [spot: string]: string[] } = {};
      SPOTS.forEach(spot => {
        memos[spot] = data.reservations
          .filter((r: any) => r.spot === spot && r.mode !== 'reflection' && r.memo?.trim())
          .map((r: any) => r.memo.trim());
      });

      setAvailability(avail);
      setModeStats(modes);
      setSpotMemos(memos);
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
        const currentSmalltalk = (modeStats[selectedSpot]?.smalltalk || 0) + (selectedMode === 'smalltalk' ? 1 : 0);
        setSuccessInfo({ date, spot: spotInfo?.name || selectedSpot, mode: selectedMode, warning: data.warning, smalltalkCount: currentSmalltalk });
        setShowSuccess(true);

        // 자동 캘린더 다운로드 (아이폰: 열면 "캘린더에 추가" 팝업)
        try {
          const icsUrl = `/api/reservations/ics?date=${date}&spot=${encodeURIComponent(selectedSpot)}`;
          const link = document.createElement('a');
          link.href = icsUrl;
          link.download = `timeoffclub-${date}.ics`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) { /* 실패해도 예약은 완료 */ }

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
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-300 shadow-lg text-center space-y-5 animate-fade-in">
        <div className="text-5xl">✨</div>
        <h2 className="text-xl font-bold text-amber-800">예약이 완료되었습니다!</h2>
        <div className="bg-gray-100 rounded-lg p-4 space-y-2">
          <div className="text-amber-700 font-medium">{successInfo.date}</div>
          <div className="text-gray-800 text-lg font-semibold">{successInfo.spot}</div>
          <div className={`inline-block text-xs px-2 py-1 rounded ${
            successInfo.mode === 'reflection' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'
          }`}>{successInfo.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}</div>
        </div>
        {successInfo.warning && (
          <div className="bg-orange-900/30 border border-orange-700/30 rounded-lg p-3 text-sm text-orange-700">
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
          const bensonNote = spotId === '압구정로데오_벤슨 테이스팅 라운지' ? ' | 🏢 엘리베이터 타고 2층으로 올라와주세요' : '';
          const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('타임오프클럽 - ' + (spotInfo?.name || spotId))}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(spotInfo?.address || '')}&details=${encodeURIComponent('📵 스마트폰 보관 | ☕ 1인 1음료' + bensonNote + noticeText)}`;
          return (
            <div className="bg-gradient-to-b from-blue-900/30 to-blue-900/10 border border-blue-600/30 rounded-xl p-5 space-y-3">
              <div className="text-center">
                <p className="text-blue-100 font-semibold">📵 잊지 않게 알림 받기</p>
                <p className="text-blue-600/70 text-xs mt-1">세션 5시간 전에 알림이 울려요. 놓치지 마세요!</p>
              </div>
              <a href={icsUrl}
                className="block w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm text-center transition active:scale-95 font-medium border border-gray-200">
                🍎 아이폰 알림 등록
              </a>
              <a href={googleUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm text-center transition active:scale-95 font-medium">
                📅 안드로이드 알림 등록
              </a>
              <p className="text-center text-gray-500 text-[10px]">다운로드된 파일을 열면 알림이 자동 등록돼요</p>
            </div>
          );
        })()}

        <div className="text-sm text-gray-500 space-y-1">
          <p>📍 현장에서 1인 1음료 주문을 부탁드려요</p>
          <p>📵 입장 시 스마트폰을 보관합니다</p>
          <p>⏰ 변경/취소는 2시간 전까지 가능해요</p>
        </div>
        <button onClick={() => setShowSuccess(false)}
          className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg font-medium transition active:scale-95">
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-300 shadow-lg space-y-5">
      <h2 className="text-xl font-bold text-amber-800">스팟 선택</h2>
      <p className="text-xs text-gray-500">{date}</p>

      {/* 다음 달 예약 D-7 안내 */}
      {(() => {
        const now = new Date();
        const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60 * 1000);
        const currentMonth = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}`;
        const dateMonth = date.slice(0, 7);
        if (dateMonth > currentMonth) {
          const [ry, rm] = dateMonth.split('-').map(Number);
          const firstDay = new Date(Date.UTC(ry, rm - 1, 1));
          const bookingOpens = new Date(firstDay.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (now.getTime() < bookingOpens.getTime()) {
            const opensStr = bookingOpens.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-amber-700 text-sm font-medium">📅 {dateMonth.replace('-', '년 ')}월 예약 안내</p>
                <p className="text-amber-600/80 text-xs mt-1">{opensStr}부터 예약 가능합니다</p>
              </div>
            );
          }
        }
        return null;
      })()}

      {/* 인원 적은 스팟 대화 주제 배너 */}
      {(() => {
        // 인원 가장 적은 스팟 찾기 (스몰톡 기준)
        let minSpot = '';
        let minCount = Infinity;
        SPOTS.forEach(spot => {
          if (closedSpots.has(spot)) return;
          const count = availability[spot] || 0;
          if (count < getCapForSpot(spot) && count < minCount) {
            minCount = count;
            minSpot = spot;
          }
        });
        if (!minSpot || minCount >= 4) return null;
        const spotInfo = SPOT_DETAILS.find(s => s.id === minSpot);
        if (!spotInfo) return null;
        // 메모가 있으면 메모, 없으면 랜덤 질문
        const memos = (spotMemos[minSpot] || []).filter(m => m.trim());
        const question = memos.length > 0
//         );
      })()}

      {/* 스팟 목록 (랜덤 순서) */}
      <div className="grid gap-3">
        {shuffledSpots.filter(s => !closedSpots.has(s.id)).map(spotInfo => {
          const count = availability[spotInfo.id] || 0;
          const isFull = count >= getCapForSpot(spotInfo.id);
          const isSelected = selectedSpot === spotInfo.id;
          const stats = modeStats[spotInfo.id];

          return (
            <button
              key={spotInfo.id}
              onClick={() => {
                if (isFull) return;
                // 대화 주제가 이미 있는 스팟이면 바로 선택
                if (conversationTopics[spotInfo.id]) {
                  setSelectedSpot(spotInfo.id);
                } else if (eligibleSpots.includes(spotInfo.id)) {
                  // eligible 스팟이면 대화 주제 먼저 선택
                  setSelectedTopicSpot(spotInfo.id);
                  setShowTopicModal(true);
                } else {
                  // 일반 스팟은 바로 선택
                  setSelectedSpot(spotInfo.id);
                }
              }}
              disabled={isFull}
              className={`p-3 sm:p-4 rounded-lg transition text-left active:scale-[0.98] ${
                isSelected
                  ? 'bg-amber-600 text-white border-2 border-amber-500'
                  : isFull
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 hover:border-amber-500/50'
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{spotInfo.name.split('_')[1] || spotInfo.name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      isFull ? 'bg-red-50 text-red-600'
                      : isSelected ? 'bg-amber-700 text-amber-800'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}/{getCapForSpot(spotInfo.id)}명
                    </span>

                    {!isFull && count >= getCapForSpot(spotInfo.id) * 0.8 && (
                      <div className="text-[10px] text-orange-500 mt-0.5">🔥 마감 임박</div>
                    )}
                    {/* 프라이빗 세션 라벨 비활성화
                    count >= 0 && count <= 2 && !isFull && (
                      <div className="text-[10px] text-emerald-600 mt-0.5">🌿 프라이빗 세션</div>
                    )
                    */}
                    {count === 3 && !isFull && (
                      <div className="text-[10px] text-blue-600 mt-0.5">✨ 소규모</div>
                    )}
                  </div>
                </div>

                {!visitedSpots.has(spotInfo.id) && visitedSpots.size > 0 && (
                  <div className={`text-xs px-2.5 py-1.5 rounded-lg ${isSelected ? 'bg-violet-700/40 text-violet-100' : 'bg-violet-50 text-violet-600'} border border-violet-200`}>
                    아직 가보지 않은 스팟이에요. 새로운 공간에서 색다른 타임오프를 경험해보세요!
                  </div>
                )}

                <div className={`text-sm space-y-1.5 ${isSelected ? 'text-amber-50' : 'text-gray-600'}`}>
                  <p className="flex items-start gap-2"><span className="text-xs mt-0.5">📍</span><span>{spotInfo.address}</span></p>
                  <p className="flex items-start gap-2"><span className="text-xs mt-0.5">🎫</span><span>{spotInfo.discount}</span></p>
                  <p className={`flex items-start gap-2 ${isSelected ? 'text-amber-800' : 'text-gray-500'}`}>
                    <span className="text-xs mt-0.5">✨</span><span className="text-xs leading-relaxed">{spotInfo.features}</span>
                  </p>
                </div>

                {/* 스팟 안내 (수요일만 표시되는 안내 고려) */}
                {spotNotices[spotInfo.id] && (() => {
                  // 선택한 날짜의 요일 확인 (수요일=3)
                  const selectedDay = new Date(date + 'T00:00:00+09:00').getDay();
                  const notice = spotNotices[spotInfo.id];
                  // "수요일" 키워드가 포함된 안내는 수요일에만 표시
                  if (notice.includes('수요일') && selectedDay !== 3) return null;
                  // "일요일" 키워드가 포함된 안내는 일요일에만 표시
                  if (notice.includes('일요일') && selectedDay !== 0) return null;
                  return (
                    <div className={`text-xs px-2.5 py-1.5 rounded-lg ${isSelected ? 'bg-amber-700/50 text-amber-800' : 'bg-amber-50 text-amber-600/80'} border border-amber-200`}>
                      ℹ️ {notice}
                    </div>
                  );
                })()}

                {/* 인원별 넛지 메시지 */}
                {/* 대화 열기 기능 */}
                {(() => {
                  const hasTopic = conversationTopics[spotInfo.id];
                  // 스몰토크 인원만 체크 (사색 제외)
                  const smalltalkCount = stats ? stats.smalltalk : 0;
                  const canOpenTopic = !isFull && smalltalkCount <= 1 && eligibleSpots.includes(spotInfo.id);
                  const hasLonelyMember = !isFull && smalltalkCount === 1 && !hasTopic; // 혼자 대기 중인 멤버
                  
                  if (hasTopic) {
                    // 이미 주제가 있는 경우
                    return (
                      <div className={`text-xs px-2.5 py-1.5 rounded-lg ${isSelected ? "bg-blue-700/50 text-blue-100" : "bg-blue-50 text-blue-600"} border border-blue-200`}>
                        💬 "{hasTopic}" 주제로 함께 이야기 나누고 싶어요
                      </div>
                    );
                  } else if (hasLonelyMember) {
                    // 혼자 대기 중인 멤버가 있는 경우
                    return (
                      <div className={`w-full text-xs px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 border border-purple-200`}>
                        💭 특별한 대화를 나눌 누군가를 기다리고 있어요
                      </div>
                    );
                  } else if (canOpenTopic) {
                    // 대화 열기 가능한 경우
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTopicSpot(spotInfo.id);
                          setShowTopicModal(true);
                          // 모달 열 때 추천 주제 로드 (캐시됨)
                          loadTopicSuggestions();
                        }}
                        className={`w-full text-xs px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-900/30 to-blue-900/30 text-emerald-600 border border-emerald-700/30 hover:bg-emerald-800/40 transition`}
                      >
                        ✨ 첫 번째로 예약하고, 나누고 싶은 대화를 열어보세요
                      </button>
                    );
                  }
                  
                  return null;
                })()}
                {/* 모드별 인원 */}
                {count > 0 && stats && (
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">💬 스몰토크 {stats.smalltalk}명</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded">🧘 사색 {stats.reflection}명</span>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <a href={spotInfo.mapUrl} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1 text-xs underline ${isSelected ? 'text-amber-700' : 'text-blue-400'}`}>
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
            <div className="text-xs text-gray-500 mb-2">참여 방식 <span className="text-red-400">*</span></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedMode('smalltalk')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition active:scale-95 border-2 ${
                  selectedMode === 'smalltalk' ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-transparent'
                }`}>💬 스몰토크</button>
              <button type="button" onClick={() => {
                // 대화 주제가 있을 때 사색 선택 시 확인
                if (conversationTopics[selectedSpot]) {
                  if (confirm('이 스팟에는 ""+conversationTopics[selectedSpot]+""라는 대화 주제가 설정되어 있어요. 대화 없이 사색으로 예약하시겠어요? (사색 예약 시 다른 멤버가 대화 주제를 새로 등록할 수 있습니다.)')) {
                    setSelectedMode('reflection');
                  }
                } else {
                  setSelectedMode('reflection');
                }
              }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition active:scale-95 border-2 ${
                  selectedMode === 'reflection' ? 'bg-violet-600 text-white border-violet-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-transparent'
                }`}>🧘 사색</button>
            </div>
            {!selectedMode && <p className="text-[10px] text-amber-600 mt-1">스몰토크 또는 사색을 선택해주세요</p>}
          </div>

          {/* 사색 활동 선택 */}
          {selectedMode === 'reflection' && (
            <div>
              <div className="text-xs text-gray-500 mb-2">🧘 오늘의 사색 활동 <span className="text-gray-500">(선택)</span></div>
              <div className="grid grid-cols-2 gap-2">
                {REFLECTION_ACTIVITIES.map(a => (
                  <button key={a.id} type="button"
                    onClick={() => setReflectionActivity(reflectionActivity === a.id ? '' : a.id)}
                    className={`p-2.5 rounded-lg text-left transition text-sm ${
                      reflectionActivity === a.id
                        ? 'bg-violet-50 border-2 border-violet-500 text-violet-700'
                        : 'bg-gray-100 border border-gray-200 text-gray-600 hover:border-violet-500/30'
                    }`}>
                    <span className="text-base">{a.emoji}</span>
                    <span className="ml-1.5">{a.label}</span>
                  </button>
                ))}
              </div>
              {reflectionActivity && (
                <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                  <p className="text-xs text-violet-600">
                    📋 {REFLECTION_ACTIVITIES.find(a => a.id === reflectionActivity)?.guide}
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-xs text-gray-500 mb-2">
              {selectedMode === 'reflection' ? '💭 메모 (선택)' : selectedMode === 'smalltalk' ? '💭 오늘 나누고 싶은 대화 (선택)' : '💭 참여 방식을 먼저 선택해주세요'}
            </div>
            <input
              type="text" value={memo} onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder={selectedMode === 'smalltalk' ? `예: ${smalltalkPlaceholder}` : reflectionActivity ? `${REFLECTION_ACTIVITIES.find(a => a.id === reflectionActivity)?.label}에 대한 메모...` : '사색 키워드나 메모'}
              maxLength={100}
            />
          </div>
        </div>
      )}

      {/* 안내 문구 */}
      {selectedSpot && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <p className="text-sm text-amber-700 font-medium">📋 예약 안내</p>
          {isTrial ? (
            <ul className="text-xs text-amber-700/80 space-y-1.5">
              <li>• 체험권은 <strong>1회만 예약</strong> 가능합니다</li>
              <li>• 예약 후 <strong>노쇼 시에도 체험권이 소진</strong>됩니다</li>
              <li>• 예약 변경·취소는 <strong>세션 2시간 전까지</strong> 가능해요</li>
              <li>• 현장에서 전용 할인 적용, <strong>1인 1음료</strong> 주문 원칙</li>
              <li>• 입장 시 <strong>스마트폰 보관함</strong>에 스마트폰을 맡겨주세요 📵</li>
            </ul>
          ) : (
            <ul className="text-xs text-amber-700/80 space-y-1.5">
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !selectedSpot || !selectedMode}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
      >
        {loading ? '예약 중...' : '예약하기'}
      </button>
      
      {/* 대화 주제 입력 모달 */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-sm p-6 w-full max-w-md max-h-[80vh] overflow-y-auto border border-gray-300">

            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold text-amber-800 mb-2">어떤 이야기를 해보고 싶나요?</h3>
                <p className="text-sm text-gray-600">같은 이야기를 나누고 싶은 멤버들이 이 주제를 보고 모일 수 있어요</p>
              </div>
              
              {/* 카테고리 탭 */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  {(() => {
                    console.log('🎨 Rendering categories. topicSuggestions:', topicSuggestions);
                    console.log('🎨 Object.keys(topicSuggestions):', Object.keys(topicSuggestions));
                    console.log('🎨 typeof topicSuggestions:', typeof topicSuggestions);
                    return Object.keys(topicSuggestions).map(category => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(selectedCategory === category ? '' : category);
                        setCustomTopic('');
                      }}
                      className={`px-3 py-1.5 rounded-full transition ${
                        selectedCategory === category
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {category}
                    </button>
                    ));
                  })()} 
                  <button
                    onClick={() => {
                      setSelectedCategory('직접 작성');
                      setCustomTopic('');
                    }}
                    className={`px-3 py-1.5 rounded-full transition ${
                      selectedCategory === '직접 작성'
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    직접 작성하기
                  </button>
                </div>
                
                {/* 선택된 카테고리의 주제 목록 */}
                {selectedCategory && selectedCategory !== '직접 작성' && topicSuggestions[selectedCategory] && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {topicSuggestions[selectedCategory].map((topic, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCustomTopic(topic)}
                        className={`w-full text-left p-3 rounded-lg text-sm transition ${
                          customTopic === topic
                            ? 'bg-amber-700/50 text-amber-800 border border-amber-600'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300 border border-gray-200'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* 직접 작성 */}
                {selectedCategory === '직접 작성' && (
                  <div>
                    <input
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="나누고 싶은 주제를 입력하세요 (최대 30자)"
                      maxLength={30}
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {customTopic.length}/30
                    </div>
                  </div>
                )}
              </div>
              
              {/* 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowTopicModal(false);
                    setSelectedTopicSpot('');
                    setSelectedCategory('');
                    setCustomTopic('');
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-500 transition"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    if (!customTopic.trim()) {
                      setError('주제를 선택하거나 입력해주세요.');
                      return;
                    }
                    
                    const success = await createConversationTopic(
                      selectedTopicSpot,
                      customTopic.trim(),
                      selectedCategory !== '직접 작성' ? selectedCategory : undefined
                    );
                    
                    if (success) {
                      // 주제 생성 후 데이터 새로고침
                      loadConversationTopics(date);
                      // 대화 주제를 설정했으므로 자동으로 스몰토크 모드로 설정
                      setSelectedMode('smalltalk');
                    }
                  }}
                  disabled={!customTopic.trim() || topicLoading}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {topicLoading ? '생성 중...' : '이 주제로 대화 열기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
