'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SPOT_DETAILS } from '@/lib/constants';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'member' | 'admin'>('member');
  const router = useRouter();
  const loginRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          loginMode === 'member'
            ? { name, phoneLast4 }
            : { name: name || undefined, password }
        )
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        return;
      }

      router.push(data.redirectUrl);
      router.refresh();
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ───── 히어로 ───── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* 배경 그라디언트 */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/30 via-gray-950 to-gray-950" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative text-center max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <p className="text-amber-400/80 text-sm tracking-[0.3em] uppercase">Digital Detox Smalltalk Club</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-amber-50 leading-tight">
              타임오프클럽
            </h1>
          </div>

          <p className="text-lg sm:text-xl text-gray-300 leading-relaxed font-light">
            스마트폰을 내려놓고,<br/>
            이름도 나이도 직업도 없는 공간에서<br/>
            <span className="text-amber-200 font-normal">목적 없는 대화</span>를 나눕니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <button
              onClick={scrollToLogin}
              className="px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full font-semibold transition active:scale-95 shadow-lg shadow-amber-900/30"
            >
              멤버 로그인
            </button>
            <a
              href="https://smartstore.naver.com/wellmoment"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 bg-transparent border border-amber-600/50 text-amber-200 hover:bg-amber-900/30 rounded-full font-semibold transition active:scale-95"
            >
              멤버십 가입하기
            </a>
          </div>

          {/* 스크롤 힌트 */}
          <div className="pt-12 animate-bounce">
            <svg className="w-5 h-5 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* ───── 세 가지 규칙 ───── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-amber-100 mb-4">세 가지를 끕니다</h2>
          <p className="text-center text-gray-400 text-sm mb-12">타임오프클럽에서는 평소의 자기소개가 필요 없습니다.</p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-900/80 rounded-2xl p-8 border border-gray-800 text-center space-y-4 hover:border-amber-800/40 transition">
              <div className="text-4xl">📵</div>
              <h3 className="text-lg font-bold text-amber-100">Digital OFF</h3>
              <p className="text-gray-400 text-sm leading-relaxed">입장할 때 스마트폰을 보관함에 맡깁니다. 2시간 동안 온전히 '지금 여기'에 집중합니다.</p>
            </div>
            <div className="bg-gray-900/80 rounded-2xl p-8 border border-gray-800 text-center space-y-4 hover:border-amber-800/40 transition">
              <div className="text-4xl">🎯</div>
              <h3 className="text-lg font-bold text-amber-100">Outcome OFF</h3>
              <p className="text-gray-400 text-sm leading-relaxed">나이, 직업, 배경을 묻지 않습니다. 목적 없는 대화가 만드는 가벼움을 경험합니다.</p>
            </div>
            <div className="bg-gray-900/80 rounded-2xl p-8 border border-gray-800 text-center space-y-4 hover:border-amber-800/40 transition">
              <div className="text-4xl">💭</div>
              <h3 className="text-lg font-bold text-amber-100">Resume OFF</h3>
              <p className="text-gray-400 text-sm leading-relaxed">스몰토크를 할지, 혼자 사색을 할지 스스로 정합니다. 아무것도 하지 않아도 괜찮습니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── 이용 흐름 ───── */}
      <section className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-amber-100 mb-12">이렇게 진행됩니다</h2>

          <div className="space-y-0">
            {[
              { step: '01', icon: '📅', title: '예약', desc: '원하는 날짜와 스팟을 선택합니다. 수요일 20:00 / 일요일 15:00' },
              { step: '02', icon: '📵', title: '스마트폰 보관', desc: '도착하면 스마트폰을 보관함에 맡기고, 온전한 나의 시간을 시작합니다.' },
              { step: '03', icon: '💬', title: '2시간 타임오프', desc: '스몰토크 또는 사색. 대화 카드와 함께 자연스럽게 흘러가는 시간.' },
              { step: '04', icon: '🌿', title: '마무리', desc: '종료 10분 전 안내 후, 스마트폰을 돌려받고 일상으로 돌아갑니다.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-5 items-start relative">
                {/* 연결선 */}
                {i < 3 && <div className="absolute left-[22px] top-[48px] w-px h-[calc(100%-8px)] bg-amber-800/30" />}
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-amber-600/20 border border-amber-600/40 flex items-center justify-center text-amber-300 text-sm font-bold z-10">
                  {item.step}
                </div>
                <div className="pb-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{item.icon}</span>
                    <h3 className="text-white font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── 스팟 소개 ───── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-amber-100 mb-4">공간을 고르세요</h2>
          <p className="text-center text-gray-400 text-sm mb-12">서울 4곳의 특별한 공간에서 타임오프를 경험합니다.</p>

          <div className="grid sm:grid-cols-2 gap-5">
            {SPOT_DETAILS.map((spot) => {
              const area = spot.id.split('_')[0];
              return (
                <a
                  key={spot.id}
                  href={spot.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-900/80 rounded-2xl p-6 border border-gray-800 hover:border-amber-700/50 transition group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs text-amber-400 tracking-wider">{area}</span>
                      <h3 className="text-white font-bold text-lg mt-0.5">{spot.id.split('_')[1]}</h3>
                    </div>
                    <span className="text-gray-600 group-hover:text-amber-400 transition text-sm">📍 지도</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3 leading-relaxed">{spot.features}</p>
                  <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg px-3 py-2">
                    <p className="text-amber-200 text-xs">☕ {spot.discount}</p>
                  </div>
                  <p className="text-gray-500 text-xs mt-3">📍 {spot.address}</p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── 멤버십 안내 ───── */}
      <section className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-100">멤버십 안내</h2>
          <p className="text-gray-400 leading-relaxed">
            타임오프클럽은 월 멤버십으로 운영됩니다.<br/>
            한 달 동안 횟수 제한 없이 원하는 스팟에서 참여할 수 있습니다.
          </p>

          <div className="bg-gray-800/80 rounded-2xl p-8 border border-amber-700/30 space-y-5">
            <div className="space-y-1">
              <p className="text-gray-400 text-sm">월 멤버십</p>
              <p className="text-4xl font-bold text-amber-100">₩29,900<span className="text-lg text-gray-400 font-normal">/월</span></p>
            </div>
            <ul className="text-sm text-gray-300 space-y-2 text-left max-w-xs mx-auto">
              <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> 횟수 무제한 참여</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> 서울 4개 스팟 자유 이용</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> 스팟별 음료 할인 혜택</li>
              <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> 스몰토크 / 사색 모드 선택</li>
            </ul>
            <a
              href="https://smartstore.naver.com/wellmoment"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3.5 bg-[#03C75A] hover:bg-[#02b351] text-white rounded-full font-semibold transition active:scale-95 shadow-lg"
            >
              네이버 스마트스토어에서 가입하기
            </a>
          </div>
        </div>
      </section>

      {/* ───── 로그인 ───── */}
      <section ref={loginRef} className="py-20 px-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-gray-800/80 backdrop-blur rounded-2xl shadow-2xl p-6 sm:p-8 border border-amber-700/30">
            <h2 className="text-2xl font-bold text-amber-100 text-center mb-2">로그인</h2>
            <p className="text-gray-400 text-sm text-center mb-6">이미 멤버라면 로그인하세요.</p>

            {/* 로그인 모드 선택 */}
            <div className="flex mb-6 bg-gray-700/50 rounded-lg p-1">
              <button
                type="button"
                onClick={() => { setLoginMode('member'); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition ${
                  loginMode === 'member'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                멤버
              </button>
              <button
                type="button"
                onClick={() => { setLoginMode('admin'); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition ${
                  loginMode === 'admin'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                운영자
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {loginMode === 'member' ? (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">이름</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      placeholder="이름을 입력하세요" required />
                  </div>
                  <div>
                    <label htmlFor="phoneLast4" className="block text-sm font-medium text-gray-300 mb-2">연락처 뒷 4자리 또는 체험권 코드</label>
                    <input type="text" id="phoneLast4" value={phoneLast4}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('T-') || val.startsWith('t-') || val.match(/[a-zA-Z]/)) {
                          setPhoneLast4(val.toUpperCase().slice(0, 8));
                        } else {
                          setPhoneLast4(val.replace(/\D/g, '').slice(0, 4));
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      placeholder="뒷4자리 또는 체험권 코드 (T-XXXX)" maxLength={8} required />
                    <p className="text-xs text-gray-500 mt-1">체험권이 있는 경우 T-로 시작하는 코드를 입력하세요</p>
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">비밀번호</label>
                  <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    placeholder="운영자 비밀번호를 입력하세요" required />
                </div>
              )}

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 shadow-lg active:scale-95">
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-700 text-center">
              <p className="text-gray-500 text-xs mb-2">아직 멤버가 아니신가요?</p>
              <a href="https://smartstore.naver.com/wellmoment" target="_blank" rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 text-sm font-medium transition">
                멤버십 가입하기 →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ───── 푸터 ───── */}
      <footer className="bg-gray-900/80 border-t border-gray-800 py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-amber-300 font-bold mb-3">타임오프클럽</h4>
              <p className="text-gray-400 text-sm leading-relaxed">목적 없는 즐거움,<br/>다정한 디지털 로그아웃<br/>스몰토크를 제안합니다.</p>
            </div>
            <div>
              <h4 className="text-amber-300 font-bold mb-3">문의</h4>
              <div className="space-y-2 text-sm">
                <a href="https://pf.kakao.com/_well__moment" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-amber-400 transition">
                  💬 카카오톡: well__moment
                </a>
                <a href="https://www.instagram.com/well__moment" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-amber-400 transition">
                  📸 인스타그램 DM
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-amber-300 font-bold mb-3">링크</h4>
              <div className="space-y-2 text-sm">
                <a href="https://smartstore.naver.com/wellmoment" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-amber-400 transition">
                  🛒 네이버 스마트스토어
                </a>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} 타임오프클럽 by 웰모먼트</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
