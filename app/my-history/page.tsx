'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTodayKST } from '@/lib/constants';

export default function MyHistoryPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [noShowCount, setNoShowCount] = useState(0);
  const [attendedCount, setAttendedCount] = useState(0);
  const [moments, setMoments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportSession, setReportSession] = useState<any>(null);
  const [reportDesc, setReportDesc] = useState('');
  const [reportPerson, setReportPerson] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [activeView, setActiveView] = useState<'dashboard' | 'history'>('dashboard');
  const router = useRouter();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [resRes, meRes, momRes] = await Promise.all([
        fetch('/api/reservations'), fetch('/api/auth/me'), fetch('/api/moments')
      ]);
      if (!resRes.ok || !meRes.ok) { router.push('/login'); return; }
      const resData = await resRes.json();
      const meData = await meRes.json();
      const momData = momRes.ok ? await momRes.json() : { moments: [] };
      setReservations(resData.reservations);
      setNoShowCount(resData.noShowCount || 0);
      setAttendedCount(resData.attendedCount || 0);
      setUserName(meData.user?.name || '');
      setMoments(momData.moments);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleReport = async () => {
    if (!reportSession || !reportDesc.trim()) return;
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: reportSession.date, spot: reportSession.spot,
          description: reportDesc, personDescription: reportPerson
        })
      });
      if (res.ok) {
        setReportSuccess('신고가 접수되었습니다.');
        setReportDesc(''); setReportPerson(''); setReportSession(null);
      }
    } catch { }
  };

  const attended = reservations.filter(r => r.check_in_status === 'attended');
  const upcoming = reservations.filter(r => r.date >= getTodayKST() && r.check_in_status !== 'attended');
  const uniqueSpots = [...new Set(attended.map(r => r.spot))];
  const detoxHours = attendedCount * 2;

  // 연속 참석 스트릭 계산
  const calcStreak = () => {
    const dates = attended.map(r => r.date).sort().reverse();
    if (dates.length === 0) return 0;
    let streak = 1;
    // 주 단위로 연속 체크 (수/일 기준)
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 7) streak++;
      else break;
    }
    return streak;
  };
  const streak = calcStreak();

  // 레벨 시스템
  const getLevel = () => {
    if (detoxHours >= 40) return { name: '디톡스 마스터', emoji: '🏆', color: 'from-amber-400 to-yellow-500' };
    if (detoxHours >= 20) return { name: '디톡스 러너', emoji: '🌳', color: 'from-emerald-400 to-green-500' };
    if (detoxHours >= 10) return { name: '디톡스 탐험가', emoji: '🌿', color: 'from-teal-400 to-cyan-500' };
    if (detoxHours >= 4) return { name: '디톡스 새싹', emoji: '🌱', color: 'from-lime-400 to-green-400' };
    return { name: '시작하는 중', emoji: '✨', color: 'from-gray-400 to-gray-500' };
  };
  const level = getLevel();

  // 프로그레스 (다음 레벨까지)
  const milestones = [4, 10, 20, 40];
  const nextMilestone = milestones.find(m => m > detoxHours) || 40;
  const prevMilestone = milestones.filter(m => m <= detoxHours).pop() || 0;
  const progress = nextMilestone > prevMilestone ? ((detoxHours - prevMilestone) / (nextMilestone - prevMilestone)) * 100 : 100;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="text-gray-400">로딩 중...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900/80 backdrop-blur border-b border-amber-800/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-amber-100">🧘 나의 타임오프</h1>
          <button onClick={() => router.push('/calendar')} className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs">돌아가기</button>
        </div>
      </header>

      {/* 탭 전환 */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2">
          <button onClick={() => setActiveView('dashboard')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeView === 'dashboard' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}>📊 대시보드</button>
          <button onClick={() => setActiveView('history')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeView === 'history' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}>📋 기록</button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {activeView === 'dashboard' && (
          <>
            {/* ========== 메인 디톡스 카드 (공유용) ========== */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-700/30">
              {/* 배경 그라디언트 */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-amber-950/40" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
              
              <div className="relative p-6 space-y-5">
                {/* 레벨 + 이름 */}
                <div className="text-center">
                  <div className="text-4xl mb-2">{level.emoji}</div>
                  <p className={`text-sm font-bold bg-gradient-to-r ${level.color} bg-clip-text text-transparent`}>{level.name}</p>
                  <p className="text-gray-500 text-xs mt-1">타임오프클럽 by 웰모먼트</p>
                </div>

                {/* 디톡스 시간 — 메인 */}
                <div className="text-center">
                  <div className="text-6xl font-black text-amber-100 tracking-tight">{detoxHours}<span className="text-2xl text-amber-300 font-medium ml-1">h</span></div>
                  <p className="text-gray-400 text-sm mt-1">디지털 디톡스 시간</p>
                </div>

                {/* 프로그레스 바 */}
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>{prevMilestone}h</span>
                    <span>{nextMilestone}h</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${level.color} transition-all duration-1000`} style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </div>

                {/* 통계 그리드 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-800/60 rounded-xl p-3 text-center border border-gray-700/50">
                    <div className="text-2xl font-bold text-amber-300">{attendedCount}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">세션</div>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-3 text-center border border-gray-700/50">
                    {streak > 0 ? (
                      <>
                        <div className="text-2xl font-bold text-orange-400">🔥{streak}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">주 연속</div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-gray-500">-</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">스트릭</div>
                      </>
                    )}
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-3 text-center border border-gray-700/50">
                    <div className="text-2xl font-bold text-violet-400">{uniqueSpots.length}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">스팟</div>
                  </div>
                </div>

                {/* 방문 스팟 */}
                {uniqueSpots.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {uniqueSpots.map(spot => (
                      <span key={spot} className="px-2.5 py-1 bg-gray-800/80 border border-gray-700/50 rounded-full text-[10px] text-amber-200/80">
                        {spot.split('_')[1] || spot}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 다가오는 세션 */}
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">📅 다가오는 세션</h3>
                <div className="space-y-2">
                  {upcoming.map(r => (
                    <div key={r.id} className="bg-gray-800/60 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <div className="text-white text-sm font-medium">{r.date}</div>
                        <div className="text-gray-400 text-xs">{r.spot.split('_')[1] || r.spot}</div>
                      </div>
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        r.mode === 'reflection' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>{r.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 멤버들의 한마디 */}
            {moments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">✨ 멤버들의 한마디</h3>
                <div className="space-y-2">
                  {moments.slice(0, 5).map((m: any, idx: number) => (
                    <div key={idx} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                      <p className="text-gray-200 text-sm italic">"{m.moment_text}"</p>
                      <span className="text-gray-500 text-xs">{m.display_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {noShowCount > 0 && (
              <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                <p className="text-red-300 text-xs">⚠️ 노쇼 {noShowCount}회 — 참석이 어려우면 미리 취소해주세요</p>
              </div>
            )}
          </>
        )}

        {activeView === 'history' && (
          <>
            {/* 쉼의 기록 */}
            {attended.length > 0 ? (
              <div className="space-y-2">
                {attended.sort((a: any, b: any) => b.date.localeCompare(a.date)).map(r => (
                  <div key={r.id} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-amber-200 text-sm font-medium">{r.date}</div>
                        <div className="text-gray-400 text-xs">{r.spot.split('_')[1] || r.spot}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                          r.mode === 'reflection' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>{r.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}</span>
                        <button onClick={() => { setReportSession(r); setShowReport(true); }}
                          className="text-[10px] text-gray-500 hover:text-red-400">🚨</button>
                      </div>
                    </div>
                    {r.memo && <p className="text-gray-400 text-xs mt-2 italic">💭 "{r.memo}"</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🌱</div>
                <p>아직 참석한 세션이 없어요</p>
                <p className="text-xs mt-1 text-gray-500">첫 타임오프를 예약해보세요!</p>
              </div>
            )}
          </>
        )}

        {/* 신고 모달 */}
        {showReport && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4 animate-fade-in">
              <h3 className="text-white font-medium">🚨 불편 신고</h3>
              <p className="text-gray-400 text-xs">이 내용은 웰모먼트만 확인하며, 신고자 정보는 비공개입니다.</p>
              {reportSession && <div className="text-xs text-gray-500">{reportSession.date} · {reportSession.spot}</div>}
              <div>
                <label className="text-xs text-gray-300 mb-1 block">어떤 상황이었나요?</label>
                <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm min-h-[80px] resize-y placeholder-gray-500"
                  placeholder="불편했던 상황을 설명해주세요" />
              </div>
              <div>
                <label className="text-xs text-gray-300 mb-1 block">해당 참가자 특징 (선택)</label>
                <input type="text" value={reportPerson} onChange={(e) => setReportPerson(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500"
                  placeholder="예: 안경 쓴 분, 창가에 앉은 분 등" />
              </div>
              {reportSuccess && <p className="text-green-300 text-sm">{reportSuccess}</p>}
              <div className="flex gap-2">
                <button onClick={handleReport} disabled={!reportDesc.trim()}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">신고</button>
                <button onClick={() => { setShowReport(false); setReportSuccess(''); }}
                  className="flex-1 py-2.5 bg-gray-700 text-white rounded-lg text-sm">닫기</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
