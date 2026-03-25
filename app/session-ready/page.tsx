'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SessionReadyContent() {
  const [reservation, setReservation] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [randomQuestion, setRandomQuestion] = useState('');
  const [reflectionCard, setReflectionCard] = useState('');
  const [recentMoments, setRecentMoments] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const currentReflectionCard = reflectionCard ? JSON.parse(reflectionCard) : REFLECTION_CARDS[0];
  const myMode = reservation?.mode || 'smalltalk';

  const energyEmoji = (e: string) => e === 'bright' ? '☀️' : e === 'quiet' ? '🌙' : '🌤️';
  const modeLabel = (m: string) => m === 'reflection' ? '🧘 사색' : '💬 스몰토크';
  const smalltalkCount = participants.filter(p => p.mode !== 'reflection').length;
  const reflectionCount = participants.filter(p => p.mode === 'reflection').length;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="text-gray-400">로딩 중...</div></div>;
  }

  // 스마트폰 내려놓기 화면
  if (ready) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-6">
        <div className="text-center space-y-8 animate-fade-in">
          <div className="text-6xl">🌿</div>
          <h1 className="text-2xl font-light text-amber-100 leading-relaxed">
            스마트폰을 내려놓고<br/>
            <span className="font-medium">온전한 당신의 시간</span>을<br/>
            시작하세요
          </h1>
          <p className="text-gray-400 text-sm">
            이 문을 나서는 순간 사라지는 연기 같아도 좋습니다.<br/>
            남는 게 없어서 비로소 가벼워지는 시간을 즐겨주세요.
          </p>
          <div className="pt-8">
            <div className="w-16 h-0.5 bg-amber-600/50 mx-auto rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <header className="bg-gray-900/80 backdrop-blur border-b border-amber-800/30 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-amber-100">오늘의 타임오프</h1>
          <button onClick={() => router.push('/calendar')} className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs">돌아가기</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* 세션 정보 */}
        <div className="bg-gray-800/80 rounded-xl p-5 border border-amber-700/30 text-center">
          <div className="text-amber-300 text-sm">{date}</div>
          <div className="text-white text-xl font-bold mt-1">{spot}</div>
          <div className="flex justify-center gap-4 mt-3">
            <span className="text-sm text-blue-300">💬 스몰토크 {smalltalkCount}명</span>
            <span className="text-sm text-violet-300">🧘 사색 {reflectionCount}명</span>
          </div>
        </div>

        {/* 오늘의 참가자 */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">오늘의 참가자</h3>
          {participants.map((p, idx) => {
            const isMe = reservation && p.user_name === reservation.user_name;
            return (
              <div key={idx} className={`bg-gray-800/60 rounded-lg p-3 ${isMe ? 'border border-amber-700/40' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{isMe ? '나' : `멤버 ${idx + 1}`}</span>
                  <span className="text-xs">{energyEmoji(p.energy || 'normal')}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    p.mode === 'reflection' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'
                  }`}>{modeLabel(p.mode || 'smalltalk')}</span>
                </div>
                {p.memo && (
                  <p className="text-gray-400 text-xs mt-1 italic">"{p.memo}"</p>
                )}
              </div>
            );
          })}
        </div>

        {/* 모드별 카드 */}
        {myMode === 'reflection' ? (
          <div className="bg-violet-900/20 border border-violet-700/30 rounded-xl p-5 text-center">
            <div className="text-xs text-violet-400 mb-2">🧘 오늘의 사색 카드</div>
            <div className="text-3xl mb-2">{currentReflectionCard.emoji}</div>
            <p className="text-violet-100 text-lg font-medium">{currentReflectionCard.title}</p>
            <p className="text-violet-200/70 text-sm mt-2 leading-relaxed">{currentReflectionCard.desc}</p>
            <button onClick={pickReflectionCard} className="mt-3 text-xs text-violet-300/70 hover:text-violet-200 underline transition">
              다른 카드 뽑기
            </button>
          </div>
        ) : (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-5 text-center">
            <div className="text-xs text-amber-400 mb-2">🗨️ 오늘의 대화 카드</div>
            <p className="text-amber-100 text-lg font-medium leading-relaxed">"{randomQuestion}"</p>
            <button onClick={fetchRandomQuestion} className="mt-3 text-xs text-amber-300/70 hover:text-amber-200 underline transition">
              다른 질문 뽑기
            </button>
          </div>
        )}

        {/* 이 스팟의 최근 한마디 */}
        {recentMoments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs text-gray-400">💬 이 스팟의 최근 한마디</h3>
            {recentMoments.map((m: any, i: number) => (
              <div key={i} className="bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-700/30">
                <p className="text-gray-300 text-sm italic">"{m.moment_text}"</p>
                <p className="text-gray-500 text-[10px] mt-1">{m.display_name} · {m.date}</p>
              </div>
            ))}
          </div>
        )}

        {/* 안내사항 */}
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 space-y-2.5">
          <div className="flex items-start gap-2">
            <span className="text-base">📵</span>
            <p className="text-gray-300 text-sm">입장 시 스마트폰을 <strong className="text-amber-200">보관함에 맡겨주세요.</strong> 세션 종료 후 돌려드립니다.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">⏰</span>
            <p className="text-gray-300 text-sm">세션은 <strong className="text-amber-200">정시에 시작</strong>합니다. 시간에 맞춰 도착해주세요!</p>
          </div>
        </div>

        {/* 스마트폰 내려놓기 */}
        <button
          onClick={() => setReady(true)}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-semibold text-lg transition active:scale-95 shadow-lg shadow-amber-900/30"
        >
          📵 스마트폰을 내려놓을 준비가 되었습니다
        </button>
      </main>
    </div>
  );
}

export default function SessionReadyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="text-gray-400">로딩 중...</div></div>}>
      <SessionReadyContent />
    </Suspense>
  );
}
