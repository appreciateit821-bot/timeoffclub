'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSessionEndTime } from '@/lib/constants';

function SessionReadyContent() {
  const [reservation, setReservation] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [randomQuestion, setRandomQuestion] = useState('');
  const [reflectionCard, setReflectionCard] = useState('');
  const [recentMoments, setRecentMoments] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rulesChecked, setRulesChecked] = useState({ smalltalk: false, reflection: false });
  const [ruleSlide, setRuleSlide] = useState(0);
  const [starRating, setStarRating] = useState(0);
  const [starSubmitted, setStarSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [selectedCard, setSelectedCard] = useState(0);
  const [isTrial, setIsTrial] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get('date');
  const spot = searchParams.get('spot');

  useEffect(() => {
    if (date && spot) {
      fetchData();
      fetchRecentMoments();
    }
    fetchRandomQuestion();
  }, [date, spot]);

  const fetchRecentMoments = async () => {
    try {
      const res = await fetch(`/api/moments?spot=${encodeURIComponent(spot!)}`);
      if (res.ok) {
        const data = await res.json();
        setRecentMoments((data.moments || []).slice(0, 5));
      }
    } catch (e) {}
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/reservations?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        const spotReservations = data.reservations.filter((r: any) => r.spot === spot);
        setParticipants(spotReservations);
        
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          const myRes = spotReservations.find((r: any) => r.user_name === meData.user?.name);
          setReservation(myRes);
          if (meData.user?.phoneLast4?.startsWith('T-')) setIsTrial(true);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchRandomQuestion = async () => {
    try {
      const res = await fetch('/api/guide/random');
      if (res.ok) {
        const data = await res.json();
        setRandomQuestion(data.question);
      }
    } catch (e) {}
  };

  const REFLECTION_CARDS = [
    { emoji: '📖', title: '읽기 명상', desc: '가져온 책이나 비치된 책을 펼치세요. 한 문장을 읽고, 그 문장이 떠올리는 기억에 잠시 머물러보세요.' },
    { emoji: '✍️', title: '자유 글쓰기', desc: '3분 타이머를 마음속으로 세고, 머릿속에 떠오르는 것을 아무거나 써보세요. 문장이 안 되어도 괜찮아요.' },
    { emoji: '🎵', title: '소리 관찰', desc: '눈을 감고 1분간 이 공간의 소리에 집중해보세요. 몇 가지 소리가 들리나요?' },
    { emoji: '💭', title: '감사 리스트', desc: '오늘 감사한 것 3가지를 떠올려보세요. 아주 작은 것도 좋아요. 마음속으로 또는 종이에.' },
    { emoji: '🌊', title: '호흡 관찰', desc: '5번의 깊은 호흡. 들숨에 배가 부풀고, 날숨에 어깨가 내려가는 걸 느껴보세요.' },
    { emoji: '🪞', title: '오늘의 나', desc: '오늘 아침의 나와 지금의 나, 어떤 감정이 다른가요? 변한 게 있다면 왜일까요?' },
    { emoji: '🌳', title: '창밖 관찰', desc: '창밖이나 주변을 천천히 둘러보세요. 평소에 지나쳤던 디테일이 보이나요?' },
    { emoji: '✉️', title: '미래의 나에게', desc: '한 달 뒤의 나에게 짧은 편지를 마음속으로 써보세요. 뭘 말해주고 싶나요?' },
    { emoji: '🎨', title: '낙서 타임', desc: '종이에 아무거나 그려보세요. 의미 없는 선도, 동그라미도 좋아요. 손이 움직이는 대로.' },
    { emoji: '🌙', title: '멍 때리기', desc: '아무것도 안 해도 됩니다. 정말로. 그냥 앉아서 시간이 흐르는 걸 느껴보세요.' },
  ];

  const pickReflectionCard = () => {
    setReflectionCard(JSON.stringify(REFLECTION_CARDS[Math.floor(Math.random() * REFLECTION_CARDS.length)]));
  };

  useEffect(() => { pickReflectionCard(); }, []);

  // 세션 종료 감지
  useEffect(() => {
    if (!date) return;
    const check = () => {
      const endTime = getSessionEndTime(date);
      setSessionEnded(Date.now() >= endTime.getTime());
    };
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [date]);

  const submitStarRating = async (rating: number) => {
    if (submittingRating || !date || !spot) return;
    setSubmittingRating(true);
    setStarRating(rating);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, spot, serviceRating: rating })
      });
      if (res.ok) {
        setStarSubmitted(true);
      }
    } catch (e) {}
    finally { setSubmittingRating(false); }
  };

  const shareCards = [
    { src: '/share-detox.png', label: '집중모드', desc: 'iOS 집중모드' },
    { src: '/share-receipt.png', label: '뇌파 영수증', desc: 'The Flatline' },
    { src: '/share-prescription.png', label: '처방전', desc: 'Niksen Rx' },
    { src: '/share-ticket.png', label: '티켓', desc: 'Ticket to Nowhere' },
  ];

  const shareToInstagram = async () => {
    try {
      const card = shareCards[selectedCard];
      const res = await fetch(card.src);
      const blob = await res.blob();
      const file = new File([blob], `timeoffclub-${card.label}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Time-off Club Digital Detox' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timeoffclub-${card.label}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {}
  };

  const currentReflectionCard = reflectionCard ? JSON.parse(reflectionCard) : REFLECTION_CARDS[0];
  const myMode = reservation?.mode || 'smalltalk';

  const energyEmoji = (e: string) => e === 'bright' ? '☀️' : e === 'quiet' ? '🌙' : '🌤️';
  const modeLabel = (m: string) => m === 'reflection' ? '🧘 사색' : '💬 스몰토크';
  const smalltalkCount = participants.filter(p => p.mode !== 'reflection').length;
  const reflectionCount = participants.filter(p => p.mode === 'reflection').length;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]"><div className="text-gray-500">로딩 중...</div></div>;
  }

  // 세션 종료 후 화면
  if (ready && sessionEnded) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <div className="max-w-sm mx-auto px-6 py-12 space-y-8 animate-fade-in">

          {/* 디톡스 완료 + 카드 선택 공유 */}
          <div className="text-center space-y-4">
            <div className="text-5xl">✨</div>
            <h1 className="text-2xl font-light text-amber-800 leading-relaxed">
              오늘도 <span className="font-medium">디지털 디톡스</span> 완료!
            </h1>
            <p className="text-gray-500 text-sm">
              마음에 드는 카드를 골라<br/>인스타 스토리로 공유해보세요.
            </p>

            {/* 카드 미리보기 */}
            <div className="pt-2">
              <img
                src={shareCards[selectedCard].src}
                alt={shareCards[selectedCard].label}
                className="w-52 mx-auto rounded-2xl shadow-lg shadow-gray-300/50 transition-all"
              />
            </div>

            {/* 카드 선택 썸네일 */}
            <div className="flex justify-center gap-2 pt-1">
              {shareCards.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCard(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedCard === idx
                      ? 'border-purple-500 scale-105 shadow-lg shadow-purple-200/50'
                      : 'border-gray-300 opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={card.src} alt={card.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs">{shareCards[selectedCard].desc}</p>

            <button
              onClick={shareToInstagram}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition active:scale-95 shadow-lg"
            >
              Instagram 스토리에 공유하기
            </button>
          </div>

          <div className="w-12 h-px bg-gray-300 mx-auto" />

          {/* 별점 섹션 */}
          <div className="bg-white/80 border border-amber-200 rounded-2xl p-5 text-center space-y-4">
            <div>
              <p className="text-amber-800 text-base font-medium">오늘 세션은 어떠셨나요?</p>
              <p className="text-gray-500 text-xs mt-1">별점으로 만족도를 남겨주세요</p>
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => !starSubmitted && setStarRating(n)}
                  disabled={starSubmitted || submittingRating}
                  className={`text-4xl transition-transform ${!starSubmitted ? 'hover:scale-110 active:scale-95' : ''} ${
                    n <= starRating ? 'grayscale-0' : 'grayscale opacity-40'
                  }`}
                  aria-label={`${n}점`}
                >
                  ⭐
                </button>
              ))}
            </div>

            {/* 2점 이하 피드백 요청 */}
            {!starSubmitted && starRating > 0 && starRating <= 2 && (
              <div className="bg-orange-50 border border-orange-700/30 rounded-xl p-3">
                <p className="text-orange-700 text-xs leading-relaxed">
                  아쉬운 경험이 있으셨군요. 😔<br/>
                  저장 후 <strong>"스몰토크/사색 피드백 남기기"</strong>에서<br/>
                  무엇이 불편했는지 남겨주시면 큰 도움이 돼요.
                </p>
              </div>
            )}

            {!starSubmitted ? (
              <button
                onClick={() => submitStarRating(starRating)}
                disabled={starRating === 0 || submittingRating}
                className={`w-full py-3 rounded-xl font-medium transition active:scale-95 ${
                  starRating === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {submittingRating ? '저장 중...' : '별점 저장하기'}
              </button>
            ) : (
              <p className="text-emerald-600 text-sm">별점이 저장되었어요 💛</p>
            )}
          </div>

          {/* 피드백 섹션 */}
          <div className="space-y-3">
            <p className="text-center text-gray-600 text-sm">더 자세한 이야기를 남기고 싶다면</p>

            <button
              onClick={() => router.push('/feedback')}
              className="w-full bg-white border border-gray-200 shadow-sm/50 rounded-xl p-4 text-left hover:bg-white transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div>
                  <p className="text-amber-800 text-sm font-medium">스몰토크 피드백 남기기</p>
                  <p className="text-gray-500 text-xs mt-0.5">오늘 경험에 대한 솔직한 이야기를 들려주세요</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/feedback?tab=reflection')}
              className="w-full bg-white border border-gray-200 shadow-sm/50 rounded-xl p-4 text-left hover:bg-white transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧘</span>
                <div>
                  <p className="text-violet-700 text-sm font-medium">사색 피드백 남기기</p>
                  <p className="text-gray-500 text-xs mt-0.5">오늘의 사색 시간을 되돌아보세요</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/my-history')}
              className="w-full bg-white border border-gray-200 shadow-sm/50 rounded-xl p-4 text-left hover:bg-white transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚨</span>
                <div>
                  <p className="text-red-600 text-sm font-medium">불편한 경험 신고하기</p>
                  <p className="text-gray-500 text-xs mt-0.5">불편하게 한 멤버가 있었다면 알려주세요</p>
                </div>
              </div>
            </button>
          </div>

          {/* 체험권 사용자 전환 CTA */}
          {isTrial && (
            <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/10 border border-amber-200 rounded-2xl p-6 space-y-5">
              <div className="text-center">
                <p className="text-amber-800 text-lg font-medium">오늘의 경험, 어떠셨나요?</p>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  이 고요한 시간이 좋으셨다면,<br/>다음 주에도 만나요.
                </p>
              </div>

              {/* 체험권 재구매 */}
              <a
                href="https://smartstore.naver.com/wellmoment/products/13210795609"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-white border border-gray-200 shadow-sm/50 rounded-xl p-4 hover:bg-white transition active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎟️</span>
                  <div className="flex-1">
                    <p className="text-amber-800 text-sm font-medium">체험권 한 번 더</p>
                    <p className="text-gray-500 text-xs mt-0.5">부담 없이 1회 더 참여하기</p>
                  </div>
                  <span className="text-gray-500 text-xs">→</span>
                </div>
              </a>

              {/* 멤버십 전환 */}
              <a
                href="https://smartstore.naver.com/wellmoment/products/13132932761"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl p-4 hover:from-amber-700 hover:to-amber-800 transition active:scale-[0.98] shadow-lg shadow-amber-200/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌿</span>
                  <div className="flex-1">
                    <p className="text-gray-800 text-sm font-semibold">정기 멤버십 가입하기</p>
                    <p className="text-amber-700/80 text-xs mt-0.5">한 달 무제한 참여 · 매달 마지막 주 구매 가능</p>
                  </div>
                  <span className="text-amber-700/60 text-xs">→</span>
                </div>
              </a>

              <p className="text-center text-gray-500 text-[11px] leading-relaxed">
                멤버십은 매달 마지막 주에 구매할 수 있으며<br/>다음 달 한 달간 무제한으로 참여할 수 있습니다.
              </p>
            </div>
          )}

          {/* 홈으로 */}
          <button
            onClick={() => router.push('/calendar')}
            className="w-full py-3 text-gray-500 text-sm hover:text-gray-600 transition"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 스마트폰 내려놓기 화면
  if (ready) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-8 animate-fade-in">
          <div className="text-6xl">🌿</div>
          <h1 className="text-2xl font-light text-amber-800 leading-relaxed">
            스마트폰을 내려놓고<br/>
            <span className="font-medium">온전한 당신의 시간</span>을<br/>
            시작하세요
          </h1>
          <p className="text-gray-500 text-sm">
            이 문을 나서는 순간 사라지는 연기 같아도 좋습니다.<br/>
            남는 게 없어서 비로소 가벼워지는 시간을 즐겨주세요.
          </p>
          <div className="pt-8">
            <div className="w-16 h-0.5 bg-amber-400/50 mx-auto rounded-full" />
          </div>
        </div>
        <div className="mt-auto pb-12 pt-8 w-full max-w-sm">
          <button
            onClick={() => setSessionEnded(true)}
            className="w-full py-3 text-gray-500 text-sm border border-gray-200 rounded-xl hover:text-gray-600 hover:border-gray-300 transition"
          >
            타임오프클럽 세션 종료
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-amber-800">오늘의 타임오프</h1>
          <button onClick={() => router.push('/calendar')} className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-xs">돌아가기</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* 세션 정보 */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-amber-200 text-center">
          <div className="text-amber-600 text-sm">{date}</div>
          <div className="text-gray-800 text-xl font-bold mt-1">{spot}</div>
          <div className="flex justify-center gap-4 mt-3">
            <span className="text-sm text-blue-600">💬 스몰토크 {smalltalkCount}명</span>
            <span className="text-sm text-violet-600">🧘 사색 {reflectionCount}명</span>
          </div>
        </div>

        {/* 오늘의 참가자 */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">오늘의 참가자</h3>
          {participants.map((p, idx) => {
            const isMe = reservation && p.user_name === reservation.user_name;
            return (
              <div key={idx} className={`bg-white/80 rounded-lg p-3 ${isMe ? 'border border-amber-700/40' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-gray-800 text-sm font-medium">{isMe ? '나' : `멤버 ${idx + 1}`}</span>
                  <span className="text-xs">{energyEmoji(p.energy || 'normal')}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    p.mode === 'reflection' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'
                  }`}>{modeLabel(p.mode || 'smalltalk')}</span>
                </div>
                {p.memo && (
                  <p className="text-gray-500 text-xs mt-1 italic">"{p.memo}"</p>
                )}
              </div>
            );
          })}
        </div>

        {/* 모드별 카드 */}
        {myMode === 'reflection' ? (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 text-center">
            <div className="text-xs text-violet-600 mb-2">🧘 오늘의 사색 카드</div>
            <div className="text-3xl mb-2">{currentReflectionCard.emoji}</div>
            <p className="text-violet-700 text-lg font-medium">{currentReflectionCard.title}</p>
            <p className="text-violet-700/70 text-sm mt-2 leading-relaxed">{currentReflectionCard.desc}</p>
            <button onClick={pickReflectionCard} className="mt-3 text-xs text-violet-500 hover:text-violet-700 underline transition">
              다른 카드 뽑기
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
            <div className="text-xs text-amber-600 mb-2">🗨️ 오늘의 대화 카드</div>
            <p className="text-amber-800 text-lg font-medium leading-relaxed">"{randomQuestion}"</p>
            <button onClick={fetchRandomQuestion} className="mt-3 text-xs text-amber-600/70 hover:text-amber-700 underline transition">
              다른 질문 뽑기
            </button>
          </div>
        )}

        {/* 이 스팟의 최근 한마디 */}
        {recentMoments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs text-gray-500">💬 이 스팟의 최근 한마디</h3>
            {recentMoments.map((m: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200/30">
                <p className="text-gray-600 text-sm italic">"{m.moment_text}"</p>
                <p className="text-gray-500 text-[10px] mt-1">{m.display_name} · {m.date}</p>
              </div>
            ))}
          </div>
        )}

        {/* 타임오프클럽 룰 - 슬라이드 카드 (모드별) */}
        {(() => {
          const isReflectionMode = myMode === 'reflection';
          const slides = isReflectionMode ? [
            { emoji: '💬', label: '사색 약속', text: '오롯이 나만을 위한\n시간입니다.\n\n떠오르는 생각들을 있는 그대로\n흘려보내도 괜찮습니다.' },
            { emoji: '💬', label: '사색 약속', text: '자유롭게 몰입하세요.\n\n일기를 쓰거나 책을 읽으며\n나만의 사색을\n충분히 누려보세요.' },
            { emoji: '💬', label: '사색 약속', text: '언제든 대화가\n그리워지면\n\n스몰토크에\n합류하셔도 좋아요.' },
          ] : [
            { emoji: '🗣️', label: '스몰토크 약속', text: '나이, 직업, 배경은\n잠시 내려놓아요.\n\n있는 그대로의 모습으로\n편안하게 대화합니다.' },
            { emoji: '🗣️', label: '스몰토크 약속', text: '대화는 탁구처럼\n주고받아요.\n\n모두가 돌아가며 이야기할 수\n있도록 배려해 주세요.' },
            { emoji: '🗣️', label: '스몰토크 약속', text: '침묵도 대화의\n일부입니다.\n\n듣고만 계시는 분들의\n시간도 존중해 줍니다.' },
            { emoji: '🗣️', label: '스몰토크 약속', text: '언제든 마음이 바뀌면\n조용히 사색의 시간으로\n넘어가셔도 좋아요.' },
          ];
          const totalSlides = slides.length + 1; // 마지막 + 확인 화면
          const isCheck = ruleSlide >= slides.length;
          const accentColor = isReflectionMode ? 'violet' : 'blue';
          const modeKey = isReflectionMode ? 'reflection' : 'smalltalk';

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
              <div className="px-5 pt-5 pb-2 text-center">
                <p className="text-gray-500 text-xs">
                  {isReflectionMode ? '🧘 사색을 신청한 멤버를 위한' : '🗣️ 스몰토크를 신청한 멤버를 위한'} 약속
                </p>
              </div>

              <div className="px-5 pb-5">
                <div className="min-h-[250px] flex flex-col items-center justify-center text-center py-6">
                  {!isCheck ? (
                    <>
                      <div className="text-4xl mb-3">{slides[ruleSlide].emoji}</div>
                      <p className={`text-xs font-medium mb-4 ${isReflectionMode ? 'text-violet-600' : 'text-blue-600'}`}>{slides[ruleSlide].label}</p>
                      <p className="text-gray-700 text-lg leading-loose whitespace-pre-line font-medium">
                        {slides[ruleSlide].text}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-4">{isReflectionMode ? '💬' : '🗣️'}</div>
                      <p className="text-gray-700 text-lg font-medium mb-6">
                        {isReflectionMode ? '사색' : '스몰토크'} 약속을<br/>확인하셨나요?
                      </p>
                      <button
                        onClick={() => {
                          setRulesChecked(prev => ({ ...prev, smalltalk: true, reflection: true, [modeKey]: true }));
                        }}
                        className={`px-8 py-3.5 rounded-xl font-medium text-base transition active:scale-95 ${
                          rulesChecked[modeKey]
                            ? `${isReflectionMode ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`
                            : `${isReflectionMode ? 'bg-violet-600 text-white' : 'bg-blue-600 text-white'}`
                        }`}
                      >
                        {rulesChecked[modeKey] ? '✓ 확인했어요' : '네, 확인했어요'}
                      </button>
                    </>
                  )}
                </div>

                {/* 인디케이터 */}
                <div className="flex justify-center gap-1.5 mb-4">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === ruleSlide ? `w-6 ${isReflectionMode ? 'bg-violet-400' : 'bg-blue-400'}` : 'w-1.5 bg-gray-300'}`} />
                  ))}
                </div>

                {/* 네비게이션 */}
                <div className="flex gap-3">
                  {ruleSlide > 0 && (
                    <button
                      onClick={() => setRuleSlide(prev => prev - 1)}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm transition hover:bg-gray-200"
                    >
                      이전
                    </button>
                  )}
                  {!isCheck && (
                    <button
                      onClick={() => setRuleSlide(prev => prev + 1)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition active:scale-95 ${
                        isReflectionMode ? 'bg-violet-600/80 text-white hover:bg-violet-600' : 'bg-blue-600/80 text-white hover:bg-blue-600'
                      }`}
                    >
                      다음
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 인스타 스토리 공유 */}
        <div className="bg-white rounded-xl p-5 border border-purple-200 shadow-sm">
          <div className="flex items-center gap-4">
            <img src="/share-detox.png" alt="Digital Detox" className="w-20 h-20 rounded-xl object-cover shadow-md" />
            <div className="flex-1">
              <p className="text-purple-700 text-sm font-medium">스마트폰 내려놓기 전,<br/>디톡스 시작을 공유해보세요</p>
              <p className="text-gray-500 text-xs mt-1">인스타 스토리에 올리기</p>
            </div>
          </div>
          <button
            onClick={shareToInstagram}
            className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition active:scale-95"
          >
            Instagram 스토리에 공유하기
          </button>
        </div>

        {/* 안내사항 */}
        <div className="bg-white/80 rounded-xl p-4 border border-gray-200 space-y-2.5">
          <div className="flex items-start gap-2">
            <span className="text-base">📵</span>
            <p className="text-gray-600 text-sm">입장 시 스마트폰을 <strong className="text-amber-700">보관함에 맡겨주세요.</strong> 세션 종료 후 돌려드립니다.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">⏰</span>
            <p className="text-gray-600 text-sm">세션은 <strong className="text-amber-700">정시에 시작</strong>합니다. 시간에 맞춰 도착해주세요!</p>
          </div>
        </div>

        {/* 스마트폰 내려놓기 */}
        {(() => {
          const allChecked = rulesChecked.smalltalk && rulesChecked.reflection;
          return (
            <button
              onClick={() => allChecked && setReady(true)}
              disabled={!allChecked}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition shadow-lg ${allChecked
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white active:scale-95 shadow-amber-200/50'
                : 'bg-white text-gray-500 cursor-not-allowed shadow-none'}`}
            >
              {allChecked ? '📵 스마트폰을 내려놓을 준비가 되었습니다' : '위의 약속을 모두 확인해주세요'}
            </button>
          );
        })()}
      </main>
    </div>
  );
}

export default function SessionReadyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]"><div className="text-gray-500">로딩 중...</div></div>}>
      <SessionReadyContent />
    </Suspense>
  );
}
