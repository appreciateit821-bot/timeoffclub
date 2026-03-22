'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeedbackPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [serviceRating, setServiceRating] = useState(5);
  const [serviceFeedback, setServiceFeedback] = useState('');
  const [personIssue, setPersonIssue] = useState('');
  const [generalComment, setGeneralComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [momentText, setMomentText] = useState('');
  const [momentSession, setMomentSession] = useState<any>(null);
  const [momentSuccess, setMomentSuccess] = useState('');
  const router = useRouter();

  const handleMomentSubmit = async () => {
    if (!momentSession || !momentText.trim()) return;
    try {
      const res = await fetch('/api/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: momentSession.date,
          spot: momentSession.spot,
          momentText: momentText.trim(),
          isAnonymous: true
        })
      });
      if (res.ok) {
        setMomentSuccess('한마디가 기록되었습니다 ✨');
        setMomentText('');
        setMomentSession(null);
      }
    } catch (e) { alert('저장 중 오류'); }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/feedback');
      if (!res.ok) { router.push('/login'); return; }
      const data = await res.json();
      setSessions(data.sessions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setSubmitting(true);
    setSuccess('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedSession.date,
          spot: selectedSession.spot,
          serviceRating,
          serviceFeedback,
          personIssue,
          generalComment
        })
      });

      if (res.ok) {
        setSuccess('피드백이 제출되었습니다. 감사합니다! 💛');
        setSelectedSession(null);
        setServiceRating(5);
        setServiceFeedback('');
        setPersonIssue('');
        setGeneralComment('');
        fetchSessions();
      }
    } catch (error) {
      alert('제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="text-gray-400">로딩 중...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <header className="bg-gray-900/80 backdrop-blur border-b border-amber-800/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-amber-100">피드백</h1>
          <button onClick={() => router.push('/calendar')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
            돌아가기
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {success && (
          <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg">{success}</div>
        )}

        {/* 오늘의 한마디 */}
        {!selectedSession && !momentSession && sessions.filter(s => !s.hasFeedback).length > 0 && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-5">
            <h3 className="text-amber-200 font-medium text-sm mb-3">✨ 오늘의 한마디 (익명)</h3>
            <p className="text-gray-400 text-xs mb-3">세션에서 가장 기억에 남는 순간을 한줄로 남겨주세요. 다른 멤버에게 공유됩니다.</p>
            {momentSuccess ? (
              <div className="text-green-300 text-sm">{momentSuccess}</div>
            ) : (
              <div className="space-y-3">
                <select
                  value={momentSession ? `${momentSession.date}_${momentSession.spot}` : ''}
                  onChange={(e) => {
                    const [d, ...s] = e.target.value.split('_');
                    const session = sessions.find(ss => ss.date === d && ss.spot === s.join('_'));
                    setMomentSession(session || null);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="">세션 선택</option>
                  {sessions.filter(s => !s.hasFeedback).map(s => (
                    <option key={`${s.date}_${s.spot}`} value={`${s.date}_${s.spot}`}>{s.date} · {s.spot}</option>
                  ))}
                </select>
                {momentSession && (
                  <>
                    <input
                      type="text"
                      value={momentText}
                      onChange={(e) => setMomentText(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500"
                      placeholder="오늘 가장 기억에 남는 순간..."
                      maxLength={200}
                    />
                    <button
                      onClick={handleMomentSubmit}
                      disabled={!momentText.trim()}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                    >
                      남기기
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 세션 선택 */}
        {!selectedSession && (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">참석한 세션에 대해 피드백을 남겨주세요.</p>
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">참석 확인된 세션이 없습니다.</div>
            ) : (
              sessions.map((s) => (
                <button
                  key={`${s.date}_${s.spot}`}
                  onClick={() => !s.hasFeedback && setSelectedSession(s)}
                  disabled={s.hasFeedback}
                  className={`w-full text-left p-4 rounded-lg border transition active:scale-[0.98] ${
                    s.hasFeedback
                      ? 'bg-gray-800 border-gray-700 opacity-60'
                      : 'bg-gray-800 border-gray-700 hover:border-amber-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">{s.date}</div>
                      <div className="text-gray-400 text-sm">{s.spot}</div>
                    </div>
                    {s.hasFeedback ? (
                      <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded text-xs">제출완료</span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-900/50 text-amber-300 rounded text-xs">피드백 남기기</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* 피드백 폼 */}
        {selectedSession && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-amber-700/30">
              <div className="text-white font-medium">{selectedSession.date}</div>
              <div className="text-gray-400 text-sm">{selectedSession.spot}</div>
            </div>

            {/* 만족도 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">전반적인 만족도</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setServiceRating(n)}
                    className={`flex-1 py-3 rounded-lg text-lg transition ${
                      n <= serviceRating ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {n <= serviceRating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* 서비스 개선 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                서비스 운영 개선에 대한 의견
              </label>
              <textarea
                value={serviceFeedback}
                onChange={(e) => setServiceFeedback(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px] resize-y"
                placeholder="공간, 시간, 운영 방식 등에 대한 의견을 자유롭게 남겨주세요"
              />
            </div>

            {/* 불편사항 (민감) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🔒 불편했던 점 <span className="text-gray-500">(선택사항, 관리자만 확인)</span>
              </label>
              <textarea
                value={personIssue}
                onChange={(e) => setPersonIssue(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-red-900/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px] resize-y"
                placeholder="특정 참가자로 인해 불편했던 점이 있다면 알려주세요. 비밀이 보장됩니다."
              />
              <p className="text-xs text-gray-500 mt-1">이 내용은 슈퍼관리자만 확인할 수 있으며, 안전한 공간을 위해 활용됩니다.</p>
            </div>

            {/* 기타 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">기타 의견</label>
              <textarea
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] resize-y"
                placeholder="자유롭게 남겨주세요 :)"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 active:scale-95"
              >
                {submitting ? '제출 중...' : '피드백 제출'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition active:scale-95"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
