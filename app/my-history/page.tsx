'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyHistoryPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [noShowCount, setNoShowCount] = useState(0);
  const [attendedCount, setAttendedCount] = useState(0);
  const [moments, setMoments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  // 신고
  const [showReport, setShowReport] = useState(false);
  const [reportSession, setReportSession] = useState<any>(null);
  const [reportDesc, setReportDesc] = useState('');
  const [reportPerson, setReportPerson] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
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
        setReportSuccess('신고가 접수되었습니다. 웰모먼트에서 확인 후 조치하겠습니다.');
        setReportDesc(''); setReportPerson(''); setReportSession(null);
      }
    } catch { }
  };

  const attended = reservations.filter(r => r.check_in_status === 'attended');
  const upcoming = reservations.filter(r => r.date >= new Date().toISOString().split('T')[0] && r.check_in_status !== 'attended');
  const uniqueSpots = [...new Set(attended.map(r => r.spot))];

  // 동기부여 메시지
  const getMessage = () => {
    if (attendedCount === 0) return '첫 타임오프를 기다리고 있어요 🌱';
    if (attendedCount < 3) return '쉼의 첫 걸음을 내딛었어요 🌿';
    if (attendedCount < 6) return '당신만의 쉼의 리듬이 만들어지고 있어요 🍃';
    if (attendedCount < 10) return '이미 훌륭한 쉼의 여행자예요 🌳';
    return '당신은 진정한 타임오프 마스터 ✨';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="text-gray-400">로딩 중...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <header className="bg-gray-900/80 backdrop-blur border-b border-amber-800/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-amber-100">나의 타임오프</h1>
          <button onClick={() => router.push('/calendar')} className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs">돌아가기</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 메인 대시보드 카드 */}
        <div className="bg-gradient-to-br from-amber-900/30 to-gray-800/80 rounded-2xl p-6 border border-amber-700/30 text-center">
          <div className="text-4xl mb-3">🌿</div>
          <p className="text-amber-200 text-sm mb-4">{getMessage()}</p>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold text-amber-400">{attendedCount}</div>
              <div className="text-[10px] text-gray-400 mt-1">참석한 세션</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">{uniqueSpots.length}</div>
              <div className="text-[10px] text-gray-400 mt-1">방문한 스팟</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-violet-400">{attendedCount * 2}h</div>
              <div className="text-[10px] text-gray-400 mt-1">쉼의 시간</div>
            </div>
          </div>

          {noShowCount > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-700/20">
              <p className="text-red-300 text-xs">⚠️ 노쇼 {noShowCount}회 — 다른 멤버를 위해 참석이 어려우면 미리 취소해주세요</p>
            </div>
          )}
        </div>

        {/* 방문한 스팟 */}
        {uniqueSpots.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">📍 방문한 스팟</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueSpots.map(spot => (
                <span key={spot} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-amber-200">{spot}</span>
              ))}
            </div>
          </div>
        )}

        {/* 다가오는 세션 */}
        {upcoming.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">📅 다가오는 세션</h3>
            <div className="space-y-2">
              {upcoming.map(r => (
                <div key={r.id} className="bg-gray-800/60 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <div className="text-white text-sm font-medium">{r.date}</div>
                    <div className="text-gray-400 text-xs">{r.spot}</div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    r.mode === 'reflection' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'
                  }`}>{r.mode === 'reflection' ? '사색' : '스몰토크'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 쉼의 기록 */}
        {attended.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">🌿 쉼의 기록</h3>
            <div className="space-y-2">
              {attended.sort((a: any, b: any) => b.date.localeCompare(a.date)).map(r => (
                <div key={r.id} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-amber-200 text-sm font-medium">{r.date}</div>
                      <div className="text-gray-400 text-xs">{r.spot}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        r.mode === 'reflection' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'
                      }`}>{r.mode === 'reflection' ? '사색' : '스몰토크'}</span>
                      <button onClick={() => { setReportSession(r); setShowReport(true); }}
                        className="text-[10px] text-gray-500 hover:text-red-400">🚨</button>
                    </div>
                  </div>
                  {r.memo && <p className="text-gray-400 text-xs mt-2 italic">💭 "{r.memo}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 신고 모달 */}
        {showReport && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4 animate-fade-in">
              <h3 className="text-white font-medium">🚨 불편 신고</h3>
              <p className="text-gray-400 text-xs">이 내용은 웰모먼트만 확인하며, 신고자 정보는 비공개입니다.</p>
              
              {reportSession && (
                <div className="text-xs text-gray-500">{reportSession.date} · {reportSession.spot}</div>
              )}

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
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  신고하기
                </button>
                <button onClick={() => { setShowReport(false); setReportSuccess(''); }}
                  className="flex-1 py-2.5 bg-gray-700 text-white rounded-lg text-sm">
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 멤버들의 한마디 */}
        {moments.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">✨ 멤버들의 한마디</h3>
            <div className="space-y-2">
              {moments.slice(0, 10).map((m: any, idx: number) => (
                <div key={idx} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                  <p className="text-gray-200 text-sm italic">"{m.moment_text}"</p>
                  <span className="text-gray-500 text-xs">{m.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
