'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SPOTS } from '@/lib/constants';

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<'feedback' | 'request' | 'reflection'>('feedback');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [serviceRating, setServiceRating] = useState(5);
  const [serviceFeedback, setServiceFeedback] = useState('');
  const [personIssue, setPersonIssue] = useState('');
  const [generalComment, setGeneralComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  // 사색 회고
  const [reflectionSessions, setReflectionSessions] = useState<any[]>([]);
  const [selectedReflection, setSelectedReflection] = useState<any>(null);
  const [refFeeling, setRefFeeling] = useState('');
  const [refInsight, setRefInsight] = useState('');
  const [refNextTime, setRefNextTime] = useState('');
  const [refSuccess, setRefSuccess] = useState('');
  const [myReflectionLogs, setMyReflectionLogs] = useState<any[]>([]);

  // 운영자에게 바라는 점
  const [reqCategory, setReqCategory] = useState('general');
  const [reqSpot, setReqSpot] = useState('');
  const [reqContent, setReqContent] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqSuccess, setReqSuccess] = useState('');
  const [myRequests, setMyRequests] = useState<any[]>([]);
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
    fetchMyRequests();
    fetchReflectionData();
  }, []);

  const fetchReflectionData = async () => {
    try {
      // 사색 모드로 참석한 세션
      const sessRes = await fetch('/api/feedback');
      if (sessRes.ok) {
        const data = await sessRes.json();
        setReflectionSessions((data.sessions || []).filter((s: any) => s.mode === 'reflection'));
      }
      // 내 회고 기록
      const logRes = await fetch('/api/reflection-log');
      if (logRes.ok) {
        setMyReflectionLogs((await logRes.json()).logs);
      }
    } catch (e) { console.error(e); }
  };

  const handleReflectionSubmit = async () => {
    if (!selectedReflection) return;
    try {
      const res = await fetch('/api/reflection-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedReflection.date,
          spot: selectedReflection.spot,
          activity: selectedReflection.memo || '',
          feeling: refFeeling,
          insight: refInsight,
          nextTime: refNextTime
        })
      });
      if (res.ok) {
        setRefSuccess('회고가 저장되었습니다 🌿');
        setSelectedReflection(null);
        setRefFeeling(''); setRefInsight(''); setRefNextTime('');
        fetchReflectionData();
      }
    } catch (e) { alert('저장 중 오류'); }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data.requests);
      }
    } catch (e) { console.error(e); }
  };

  const handleRequestSubmit = async () => {
    if (!reqContent.trim()) return;
    setReqSubmitting(true);
    setReqSuccess('');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: reqCategory, content: reqContent, spot: reqSpot || null })
      });
      if (res.ok) {
        setReqSuccess('요청이 전달되었습니다. 감사합니다! 💛');
        setReqContent('');
        setReqCategory('general');
        setReqSpot('');
        fetchMyRequests();
      }
    } catch (e) { alert('제출 중 오류'); }
    finally { setReqSubmitting(false); }
  };

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

  const shareToInstagram = async () => {
    try {
      const res = await fetch('/share-detox.png');
      const blob = await res.blob();
      const file = new File([blob], 'timeoffclub-detox.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Time-off Club Digital Detox' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timeoffclub-detox.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {}
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]"><div className="text-gray-500">로딩 중...</div></div>;
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-amber-800">피드백</h1>
          <button onClick={() => router.push('/calendar')} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">
            돌아가기
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 인스타 스토리 공유 배너 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 flex items-center gap-4">
          <img src="/share-detox.png" alt="Digital Detox" className="w-16 h-16 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-purple-700 text-sm font-medium">오늘의 디톡스를 공유해보세요</p>
            <p className="text-purple-500/70 text-xs mt-0.5">인스타 스토리에 올려보세요</p>
          </div>
          <button
            onClick={shareToInstagram}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium whitespace-nowrap hover:from-purple-700 hover:to-pink-700 transition active:scale-95"
          >
            공유
          </button>
        </div>

        {/* 탭 전환 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'feedback' ? 'bg-amber-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-200'
            }`}
          >💬 피드백</button>
          <button
            onClick={() => setActiveTab('reflection')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'reflection' ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-200'
            }`}
          >🧘 사색 회고</button>
          <button
            onClick={() => setActiveTab('request')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'request' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-200'
            }`}
          >📮 요청</button>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>
        )}

        {/* 사색 회고 탭 */}
        {activeTab === 'reflection' && (
          <div className="space-y-6">
            {refSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{refSuccess}</div>
            )}

            {!selectedReflection ? (
              <div className="space-y-4">
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <h3 className="text-violet-700 font-medium text-sm mb-1">🧘 사색 회고</h3>
                  <p className="text-gray-500 text-xs">사색 세션 후, 느낀 점과 다음에 하고 싶은 것을 기록해보세요. 나만의 사색 일지가 됩니다.</p>
                </div>

                {reflectionSessions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">사색으로 참석한 세션이 없습니다.</div>
                ) : (
                  reflectionSessions.map((s: any) => {
                    const hasLog = myReflectionLogs.some((l: any) => l.date === s.date && l.spot === s.spot);
                    return (
                      <button key={`${s.date}_${s.spot}`}
                        onClick={() => !hasLog && setSelectedReflection(s)}
                        disabled={hasLog}
                        className={`w-full text-left p-4 rounded-lg border transition ${
                          hasLog ? 'bg-white border-gray-300 opacity-60' : 'bg-white border-gray-300 hover:border-violet-600'
                        }`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-gray-800 font-medium">{s.date}</div>
                            <div className="text-gray-500 text-sm">{s.spot}</div>
                            {s.memo && <div className="text-gray-500 text-xs mt-1 italic">"{s.memo}"</div>}
                          </div>
                          {hasLog ? (
                            <span className="px-2 py-1 bg-violet-50 text-violet-600 rounded text-xs">작성완료</span>
                          ) : (
                            <span className="px-2 py-1 bg-violet-50 text-violet-600 rounded text-xs">회고 남기기</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}

                {/* 내 회고 기록 */}
                {myReflectionLogs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-3">📔 나의 사색 일지</h3>
                    <div className="space-y-2">
                      {myReflectionLogs.map((l: any) => (
                        <div key={l.id} className="bg-white/80 rounded-lg p-4 border border-violet-800/20">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-800 text-sm font-medium">{l.date}</span>
                            <span className="text-gray-500 text-xs">{l.spot}</span>
                          </div>
                          {l.activity && <p className="text-violet-600 text-xs mb-1">🧘 {l.activity}</p>}
                          {l.feeling && <p className="text-gray-600 text-sm">💭 {l.feeling}</p>}
                          {l.insight && <p className="text-amber-700/80 text-sm mt-1">💡 {l.insight}</p>}
                          {l.next_time && <p className="text-gray-500 text-xs mt-1">다음에는: {l.next_time}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-white rounded-lg shadow-sm p-4 border border-violet-700/30">
                  <div className="text-gray-800 font-medium">{selectedReflection.date}</div>
                  <div className="text-gray-500 text-sm">{selectedReflection.spot}</div>
                  {selectedReflection.memo && <div className="text-gray-500 text-xs mt-1 italic">"{selectedReflection.memo}"</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">💭 오늘 사색은 어땠나요?</label>
                  <textarea value={refFeeling} onChange={(e) => setRefFeeling(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px] resize-y"
                    placeholder="편안했다, 집중이 잘 됐다, 생각이 많았다..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">💡 떠오른 생각이나 깨달음</label>
                  <textarea value={refInsight} onChange={(e) => setRefInsight(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px] resize-y"
                    placeholder="사색 중 떠오른 생각, 결론, 아이디어..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🔄 다음 사색 때 하고 싶은 것</label>
                  <input type="text" value={refNextTime} onChange={(e) => setRefNextTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="다음에는 편지 써봐야지, 드로잉 해봐야지..." />
                </div>

                <div className="flex gap-3">
                  <button onClick={handleReflectionSubmit} disabled={!refFeeling.trim()}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 active:scale-95">
                    회고 저장하기
                  </button>
                  <button onClick={() => setSelectedReflection(null)}
                    className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg transition active:scale-95">
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 운영자에게 바라는 점 탭 */}
        {activeTab === 'request' && (
          <div className="space-y-6">
            {reqSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{reqSuccess}</div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-5 border border-emerald-800/30 space-y-4">
              <div>
                <h3 className="text-emerald-700 font-medium mb-1">📮 운영자에게 바라는 점</h3>
                <p className="text-gray-500 text-xs">타임오프클럽 운영에 대한 건의사항, 개선 요청 등을 자유롭게 남겨주세요.</p>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">카테고리</label>
                <select
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 text-sm"
                >
                  <option value="general">일반 건의</option>
                  <option value="space">공간 관련</option>
                  <option value="program">프로그램 관련</option>
                  <option value="service">서비스 개선</option>
                  <option value="etc">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">관련 스팟 (선택)</label>
                <select
                  value={reqSpot}
                  onChange={(e) => setReqSpot(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 text-sm"
                >
                  <option value="">전체 / 해당없음</option>
                  {SPOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">내용</label>
                <textarea
                  value={reqContent}
                  onChange={(e) => setReqContent(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] resize-y"
                  placeholder="운영자에게 전달하고 싶은 내용을 자유롭게 작성해주세요..."
                  maxLength={1000}
                />
              </div>

              <button
                onClick={handleRequestSubmit}
                disabled={reqSubmitting || !reqContent.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50 active:scale-95"
              >
                {reqSubmitting ? '전송 중...' : '요청 보내기'}
              </button>
            </div>

            {/* 내가 보낸 요청 목록 */}
            {myRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">📋 내가 보낸 요청</h3>
                <div className="space-y-2">
                  {myRequests.map((r: any) => (
                    <div key={r.id} className="bg-white/80 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          {{ general: '일반', space: '공간', program: '프로그램', service: '서비스', etc: '기타' }[r.category as string] || r.category}
                        </span>
                        {r.spot && <span className="text-xs text-gray-500">{r.spot}</span>}
                        <span className="text-xs text-gray-600 ml-auto">{r.created_at?.slice(0, 10)}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{r.content}</p>
                      {r.admin_reply && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <p className="text-xs text-amber-600">💬 운영자 답변</p>
                          <p className="text-gray-600 text-sm mt-1">{r.admin_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && <>
        {/* 오늘의 한마디 */}
        {!selectedSession && !momentSession && sessions.filter(s => !s.hasFeedback).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="text-amber-700 font-medium text-sm mb-3">✨ 오늘의 한마디 (익명)</h3>
            <p className="text-gray-500 text-xs mb-3">세션에서 가장 기억에 남는 순간을 한줄로 남겨주세요. 다른 멤버에게 공유됩니다.</p>
            {momentSuccess ? (
              <div className="text-green-600 text-sm">{momentSuccess}</div>
            ) : (
              <div className="space-y-3">
                <select
                  value={momentSession ? `${momentSession.date}_${momentSession.spot}` : ''}
                  onChange={(e) => {
                    const [d, ...s] = e.target.value.split('_');
                    const session = sessions.find(ss => ss.date === d && ss.spot === s.join('_'));
                    setMomentSession(session || null);
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 text-sm"
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
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm placeholder-gray-400"
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
            <p className="text-gray-700 text-sm">참석한 세션에 대해 피드백��� 남겨주세요.</p>
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">참석 확인된 세션이 없습니다.</div>
            ) : (
              sessions.map((s) => (
                <button
                  key={`${s.date}_${s.spot}`}
                  onClick={() => !s.hasFeedback && setSelectedSession(s)}
                  disabled={s.hasFeedback}
                  className={`w-full text-left p-4 rounded-lg border transition active:scale-[0.98] ${
                    s.hasFeedback
                      ? 'bg-white border-gray-300 opacity-60'
                      : 'bg-white border-gray-300 hover:border-amber-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-800 font-medium">{s.date}</div>
                      <div className="text-gray-500 text-sm">{s.spot}</div>
                    </div>
                    {s.hasFeedback ? (
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs">제출완료</span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">피드백 남기기</span>
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
            <div className="bg-white rounded-lg shadow-sm p-4 border border-amber-200">
              <div className="text-gray-800 font-medium">{selectedSession.date}</div>
              <div className="text-gray-500 text-sm">{selectedSession.spot}</div>
            </div>

            {/* 만족도 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">전반적인 만족도</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setServiceRating(n)}
                    className={`flex-1 py-3 rounded-lg text-lg transition ${
                      n <= serviceRating ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {n <= serviceRating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* 서비스 개선 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                서비스 운영 개선에 대한 의견
              </label>
              <textarea
                value={serviceFeedback}
                onChange={(e) => setServiceFeedback(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px] resize-y"
                placeholder="공간, 시간, 운영 방식 등에 대한 의견을 자유롭게 남겨주세요"
              />
            </div>

            {/* 불편사항 (민감) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔒 불편했던 점 <span className="text-gray-500">(선택사항, 관리자만 확인)</span>
              </label>
              <textarea
                value={personIssue}
                onChange={(e) => setPersonIssue(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-red-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px] resize-y"
                placeholder="특정 참가자로 인해 불편했던 점이 있다면 알려주세요. 비밀이 보장됩니다."
              />
              <p className="text-xs text-gray-500 mt-1">이 내용은 슈퍼관리자만 확인할 수 있으며, 안전한 공간을 위해 활용됩니다.</p>
            </div>

            {/* 기타 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">기타 의견</label>
              <textarea
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] resize-y"
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
                className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg transition active:scale-95"
              >
                취소
              </button>
            </div>
          </form>
        )}
        </>}
      </main>
    </div>
  );
}
