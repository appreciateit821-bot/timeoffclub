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
  const router = useRouter();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-900 px-4 py-6 sm:py-12">
      <div className="w-full max-w-lg">
        <div className="bg-gray-800/80 backdrop-blur rounded-2xl shadow-2xl p-5 sm:p-8 border border-amber-700/30">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-amber-100 mb-2">타임오프클럽</h1>
            <p className="text-base sm:text-lg text-amber-200/90 font-medium mb-3 leading-relaxed">목적 없는 즐거움,<br/>다정한 디지털 로그아웃<br className="sm:hidden" /> 스몰토크를 제안합니다</p>
            <div className="mt-2 inline-block px-4 py-1.5 bg-amber-900/30 border border-amber-700/30 rounded-full">
              <p className="text-xs text-amber-300">🌿 3월, <strong className="text-amber-200">44명</strong>의 멤버와 함께하고 있습니다</p>
            </div>
          </div>

          {/* 클럽 규칙 소개 */}
          <div className="mb-8 p-4 sm:p-5 bg-gray-700/50 rounded-xl border border-gray-600">
            <h2 className="text-sm font-bold text-amber-300 mb-3 text-center">클럽 규칙</h2>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 font-bold flex-shrink-0">📵</span>
                <div>
                  <p className="font-semibold text-amber-100">Digital OFF</p>
                  <p className="text-xs text-gray-400 mt-0.5">입장하실 때 스마트폰을 보관합니다</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-amber-400 font-bold flex-shrink-0">🎯</span>
                <div>
                  <p className="font-semibold text-amber-100">Outcome OFF</p>
                  <p className="text-xs text-gray-400 mt-0.5">나이, 직업, 배경을 묻지 않습니다</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-amber-400 font-bold flex-shrink-0">💭</span>
                <div>
                  <p className="font-semibold text-amber-100">Resume OFF</p>
                  <p className="text-xs text-gray-400 mt-0.5">스몰토크 또는 혼자 사색,<br className="sm:hidden" /> 직접 선택할 수 있습니다</p>
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
              멤버 로그인
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
              운영자 로그인
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 멤버십 가입 */}
          <div className="mt-5 pt-5 border-t border-gray-700 text-center">
            <p className="text-gray-500 text-xs mb-2">아직 멤버가 아니신가요?</p>
            <a
              href="https://smartstore.naver.com/wellmoment"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-2 bg-[#03C75A] hover:bg-[#02b351] text-white rounded-lg text-sm font-medium transition active:scale-95"
            >
              🛒 멤버십 가입하기
            </a>
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
