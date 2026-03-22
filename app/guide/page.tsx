'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const GUIDE_CATEGORIES = [
  {
    emoji: '🫀',
    title: '몸이 먼저 반응하는 질문',
    subtitle: '머리를 쓰지 않고 오직 오감에만 집중해 봅니다.',
    questions: [
      '지금 이 공간에서 가장 먼저 눈에 들어온 건 뭔가요?',
      '오늘 하루 중 가장 맛있었던 한 입은?',
      '요즘 자주 듣는 소리가 있나요? (노래 말고)',
      '마지막으로 "와, 좋다" 하고 숨 쉰 순간은?',
      '지금 손에 닿는 것 중 가장 기분 좋은 촉감은?',
    ],
  },
  {
    emoji: '🎨',
    title: '쓸모없어서 더 소중한 취향',
    subtitle: "생산성이나 돈과는 전혀 상관없는, 오직 '나만 아는 즐거움'입니다.",
    questions: [
      '돈이 안 되지만 진심으로 즐기는 게 있나요?',
      '남들은 이해 못 하는 나만의 소소한 습관은?',
      '시간 가는 줄 모르고 빠져드는 게 뭔가요?',
      '최근에 "이거 나만 좋아하나?" 싶었던 건?',
      '아무 이유 없이 모으고 있는 게 있나요?',
    ],
  },
  {
    emoji: '📸',
    title: '눈에 띄어버린 찰나의 장면들',
    subtitle: "오늘 하루, 당신의 눈길이 잠시 머물렀던 '아무개'들의 조각입니다.",
    questions: [
      '오늘 길에서 눈에 띈 장면이 있나요?',
      '최근에 "사진 찍고 싶다" 싶었던 순간은?',
      '기억에 남는 하늘 색깔이 있나요?',
      '낯선 곳에서 발견한 익숙한 것은?',
      '누군가의 표정이 인상 깊었던 적은?',
    ],
  },
  {
    emoji: '🌀',
    title: '잠시 현실의 끈을 놓는 상상',
    subtitle: '대화에 불을 지피고 해방감을 주는 가벼운 상상입니다.',
    questions: [
      '내일 갑자기 일주일 쉬게 되면 뭘 할 거예요?',
      '세상에 나만 깨어 있는 하루가 온다면?',
      '과거로 돌아갈 수 있다면 어떤 순간으로?',
      '지금 여기가 아닌 곳에 있다면 어디?',
      '전혀 다른 직업을 가진다면 뭘 하고 싶어요?',
    ],
  },
  {
    emoji: '🎭',
    title: '가면을 살짝 들춰보는 순간',
    subtitle: '완벽한 어른인 척하기 지칠 때, 슬쩍 내비치는 귀여운 빈틈입니다.',
    questions: [
      '최근에 괜히 웃음이 난 순간은?',
      '아무도 모르는 나의 소소한 약점은?',
      '어른이 되어서도 못 고친 습관이 있나요?',
      '"이건 좀 부끄러운데..." 싶은 취미가 있나요?',
      '혼자 있을 때만 하는 행동이 있나요?',
    ],
  },
  {
    emoji: '🧩',
    title: '설명이 필요 없는 기억의 파편',
    subtitle: '서사가 아닌, 한 장의 스틸컷처럼 남아있는 기억입니다.',
    questions: [
      '이유 없이 자주 떠오르는 장면이 있나요?',
      '냄새로 소환되는 기억이 있나요?',
      '어릴 때 좋아했던 장소가 있나요?',
      '설명할 수 없지만 마음이 편해지는 것은?',
      '돌아갈 수 없지만 그리운 순간은?',
    ],
  },
  {
    emoji: '🌡️',
    title: '관계를 비껴가는 이야기',
    subtitle: "네트워킹이 아닌, 사람을 대하는 '나만의 온도'입니다.",
    questions: [
      '낯선 사람과 대화할 때 가장 편한 주제는?',
      '말없이 함께 있어도 편한 사이가 있나요?',
      '최근에 "이 사람 괜찮다" 느낀 순간은?',
      '대화에서 가장 중요하게 생각하는 건?',
      '누군가에게 받은 작지만 큰 친절은?',
    ],
  },
  {
    emoji: '🔤',
    title: '말들의 놀이터',
    subtitle: '단어의 발음이나 어감이 주는 재미에 집중해 봅니다.',
    questions: [
      '좋아하는 단어가 있나요? 발음이든 뜻이든.',
      '최근에 들은 말 중 인상 깊었던 한마디는?',
      '자주 쓰는 감탄사가 뭔가요?',
      '외국어 중 소리가 예쁘다고 느낀 단어는?',
      '누군가에게 해주고 싶은 말이 있나요?',
    ],
  },
];

export default function GuidePage() {
  const [openCategory, setOpenCategory] = useState<number | null>(null);
  const [randomQ, setRandomQ] = useState('');
  const [showRandom, setShowRandom] = useState(false);
  const router = useRouter();

  const fetchRandom = async () => {
    try {
      const res = await fetch('/api/guide/random');
      if (res.ok) { const d = await res.json(); setRandomQ(d.question); setShowRandom(true); }
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <header className="bg-gray-900/80 backdrop-blur border-b border-amber-800/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg sm:text-xl font-bold text-amber-100">스몰토크 가이드</h1>
          <button onClick={() => router.push('/calendar')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs sm:text-sm">
            돌아가기
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 인트로 */}
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-5">
          <p className="text-amber-200 text-sm leading-relaxed">
            💚 나를 전혀 모르는 낯설지만 안전한 사람들 사이에서, 일상의 무게를 덜어내는 엉뚱한 상상과 사소한 관찰을 나눠보세요.
          </p>
          <p className="text-amber-200/80 text-sm leading-relaxed mt-3">
            🧡 오늘 우리가 나눈 대화는 이 문을 나서는 순간 사라지는 연기 같아도 좋습니다. 남는 게 없어서 비로소 가벼워지는 시간을 즐겨주세요.
          </p>
        </div>

        {/* 랜덤 카드 */}
        <button
          onClick={fetchRandom}
          className="w-full py-4 bg-gradient-to-r from-amber-600/80 to-amber-700/80 hover:from-amber-600 hover:to-amber-700 rounded-xl text-white font-medium transition active:scale-95 shadow-lg"
        >
          🎲 오늘의 대화 카드 뽑기
        </button>
        
        {showRandom && randomQ && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-6 text-center animate-fade-in">
            <p className="text-amber-100 text-lg font-medium leading-relaxed">"{randomQ}"</p>
            <button onClick={fetchRandom} className="mt-3 text-xs text-amber-300/70 hover:text-amber-200 underline">다시 뽑기</button>
          </div>
        )}

        <p className="text-gray-400 text-xs text-center">스마트폰 반납 전에 한번 훑어보세요 ☕</p>

        {/* 카테고리 토글 */}
        {GUIDE_CATEGORIES.map((cat, idx) => (
          <div key={idx} className="bg-gray-800/80 border border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenCategory(openCategory === idx ? null : idx)}
              className="w-full px-4 py-4 flex items-center justify-between text-left active:bg-gray-700/50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.emoji}</span>
                <div>
                  <div className="text-white font-medium text-sm">{cat.title}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{cat.subtitle}</div>
                </div>
              </div>
              <span className={`text-gray-400 transition-transform ${openCategory === idx ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {openCategory === idx && (
              <div className="px-4 pb-4 space-y-2">
                {cat.questions.map((q, qIdx) => (
                  <div key={qIdx} className="flex items-start gap-2 py-2 px-3 bg-gray-700/50 rounded-lg">
                    <span className="text-amber-400 text-sm mt-0.5">•</span>
                    <span className="text-gray-200 text-sm">{q}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 팁 */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 mt-6">
          <h3 className="text-amber-300 font-medium text-sm mb-3">💡 스몰토크 팁</h3>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li className="flex items-start gap-2"><span className="text-amber-400">•</span>정답은 없어요. 떠오르는 대로 말해보세요.</li>
            <li className="flex items-start gap-2"><span className="text-amber-400">•</span>침묵이 흘러도 괜찮아요. 그것도 대화의 일부입니다.</li>
            <li className="flex items-start gap-2"><span className="text-amber-400">•</span>상대의 이야기에 "왜?"보다 "어떤 느낌이었어요?"가 좋아요.</li>
            <li className="flex items-start gap-2"><span className="text-amber-400">•</span>나이, 직업, 배경은 물어보지 않아요.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
