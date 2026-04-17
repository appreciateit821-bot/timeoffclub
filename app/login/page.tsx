'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'member' | 'admin'>('member');
  const [newUserPrompt, setNewUserPrompt] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNewUserPrompt(false);
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

      // 첫 가입자 → 확인 프롬프트 표시 (자동 이동 X)
      if (data.isNewUser) {
        setNewUserPrompt(true);
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

  const goToOnboarding = () => {
    const params = new URLSearchParams({ name, phoneLast4 });
    router.push(`/onboarding?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-900 px-4 py-6 sm:py-12">
      <div className="w-full max-w-lg">
        <div className="bg-gray-800/80 backdrop-blur rounded-2xl shadow-2xl p-5 sm:p-8 border border-amber-700/30">
          <div className="text-center mb-6">
            {/* 5. 히어로 배지 */}
            <div className="inline-block px-4 py-1.5 bg-amber-900/30 border border-amber-700/30 rounded-full mb-3">
              <p className="text-xs text-amber-300">🌿 누적 <strong className="text-amber-200">85명</strong>이 타임오프를 경험했습니다</p>
            </div>
            <h1 className="text-3xl font-bold text-amber-100 mb-2">타임오프클럽</h1>
            <p className="text-base sm:text-lg text-amber-200/90 font-medium mb-3 leading-relaxed">목적 없는 즐거움,<br/>다정한 디지털 로그아웃<br className="sm:hidden" /> 스몰토크를 제안합니다</p>
          </div>

          {/* 클럽 규칙 */}
          <div className="mb-6 p-4 sm:p-5 bg-gray-700/40 rounded-xl border border-gray-600/50">
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 flex-shrink-0 text-lg">📵</span>
                <div>
                  <p className="font-semibold text-amber-100">Digital OFF</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">2시간만 세상과 연결을 끊어보세요.<br/>대신 당신과 연결돼요.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-amber-400 flex-shrink-0 text-lg">🎯</span>
                <div>
                  <p className="font-semibold text-amber-100">Outcome OFF</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">이름 대신 이야기, 스펙 대신 감정.<br/>여기선 당신이 누군지 안 물어요.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-amber-400 flex-shrink-0 text-lg">💭</span>
                <div>
                  <p className="font-semibold text-amber-100">Resume OFF</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">누군가와 나누든, 나와 마주하든.<br/>오늘의 휴식은 당신이 고르세요.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 루틴 안내 */}
          <div className="mb-8 text-center">
            <p className="text-amber-200/80 text-sm font-medium">매주 수요일 저녁 8시, 일요일 오후 3시</p>
            <p className="text-gray-400 text-xs mt-1">일주일에 한 번 운동하듯, 나를 위한 정기적인 OFF를 루틴으로 만들어보세요</p>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-6">
            {loginMode === 'member' ? (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    이름
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    placeholder="이름을 입력하세요"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phoneLast4" className="block text-sm font-medium text-gray-300 mb-2">
                    본인 확인 코드
                  </label>
                  <input
                    type="text"
                    id="phoneLast4"
                    value={phoneLast4}
                    onChange={(e) => {
                      const val = e.target.value;
                      // 체험권 코드 (T-로 시작) 또는 숫자 뒷4자리
                      if (val.startsWith('T-') || val.startsWith('t-') || val.match(/[a-zA-Z]/)) {
                        setPhoneLast4(val.toUpperCase().slice(0, 8));
                      } else {
                        setPhoneLast4(val.replace(/\D/g, '').slice(0, 4));
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    placeholder="연락처 뒷4자리 또는 체험권 코드"
                    maxLength={8}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">가입 시 등록한 연락처 뒷 4자리 · 체험권은 T-로 시작하는 코드</p>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  placeholder="운영자 비밀번호를 입력하세요"
                  required
                />
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {newUserPrompt && (
              <div className="bg-amber-900/20 border border-amber-600/40 rounded-xl p-5 space-y-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">👋</div>
                  <p className="text-amber-100 font-semibold text-base mb-1">처음 오셨나요?</p>
                  <p className="text-amber-200/80 text-xs leading-relaxed">
                    입력하신 이름과 뒷 4자리가 DB에 없어요.
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={goToOnboarding}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition active:scale-95">
                    처음이에요, 가입할게요 →
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewUserPrompt(false); setError(''); }}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition">
                    이미 멤버예요 — 다시 확인할게요
                  </button>
                </div>
                <div className="text-[11px] text-amber-300/70 leading-relaxed text-center pt-2 border-t border-amber-800/30">
                  💡 기존 멤버이신데 로그인이 안 되면<br/>
                  <strong>연락처 뒷 4자리</strong>(번호 마지막 숫자 4개)를 정확히 입력했는지 확인해주세요.<br/>
                  그래도 안 되면 카카오톡 <span className="text-amber-200">well__moment</span>로 연락주세요.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3.5 px-4 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base active:scale-95"
            >
              {loading ? '입장 중...' : '입장하기'}
            </button>
          </form>

          {/* 멤버십 가입 & 갱신 */}
          <div className="mt-5 pt-5 border-t border-gray-700 space-y-3">
            <p className="text-gray-400 text-xs text-center">아직 멤버가 아니신가요?</p>
            <a
              href="https://smartstore.naver.com/wellmoment"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-[#03C75A] hover:bg-[#02b351] text-white rounded-xl text-sm font-semibold text-center transition active:scale-95 shadow-lg"
            >
              🛒 멤버십 가입하기
            </a>
            <button
              type="button"
              onClick={() => router.push('/renew')}
              className="block w-full py-3 bg-gray-700 hover:bg-gray-600 text-amber-200 rounded-xl text-sm font-medium text-center transition active:scale-95"
            >
              🔄 이미 멤버예요 · 다음 달 멤버십 갱신
            </button>
          </div>
        </div>

        {/* 하단 푸터 */}
        <div className="mt-6 flex justify-center gap-6 text-sm">
          <span className="text-gray-500">💬 카카오톡 well__moment</span>
          <a href="https://www.instagram.com/well__moment" target="_blank" rel="noopener noreferrer"
            className="text-gray-500 hover:text-amber-400 transition">📸 인스타그램</a>
        </div>
        <p className="text-center text-xs text-gray-600 mt-3">© 2026 타임오프클럽 by 웰모먼트</p>
      </div>
    </div>
  );
}
