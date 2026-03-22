'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyHistoryPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [moments, setMoments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resRes, meRes, momRes] = await Promise.all([
        fetch('/api/reservations'),
        fetch('/api/auth/me'),
        fetch('/api/moments')
      ]);
      
      if (!resRes.ok || !meRes.ok) { router.push('/login'); return; }
      
      const resData = await resRes.json();
      const meData = await meRes.json();
      const momData = momRes.ok ? await momRes.json() : { moments: [] };
      
      setReservations(resData.reservations);
      setUserName(meData.user?.name || '');
      setMoments(momData.moments);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const attendedSessions = reservations.filter(r => r.check_in_status === 'attended');
  const upcomingSessions = reservations.filter(r => r.date >= new Date().toISOString().split('T')[0] && r.check_in_status !== 'attended');
  const uniqueSpots = [...new Set(attendedSessions.map(r => r.spot))];
  
  const energyLabel = (e: string) => e === 'bright' ? '☀️' : e === 'quiet' ? '🌙' : '🌤️';

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="text-gray-400">로딩 중...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <header className="bg-gray-900/80 backdrop-blur border-b border-amber-800/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-amber-100">나의 쉼의 기록</h1>
          <button onClick={() => router.push('/calendar')} className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs">돌아가기</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 요약 카드 */}
        <div className="bg-gradient-to-br from-amber-900/30 to-gray-800/80 rounded-xl p-6 border border-amber-700/30">
          <div className="text-center mb-4">
            <div className="text-amber-100 text-lg font-medium">{userName}님의 타임오프</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-400">{attendedSessions.length}</div>
              <div className="text-xs text-gray-400 mt-1">참석한 세션</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{uniqueSpots.length}</div>
              <div className="text-xs text-gray-400 mt-1">방문한 스팟</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-violet-400">{upcomingSessions.length}</div>
              <div className="text-xs text-gray-400 mt-1">예정된 세션</div>
            </div>
          </div>
        </div>

        {/* 다가오는 세션 */}
        {upcomingSessions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">📅 다가오는 세션</h3>
            <div className="space-y-2">
              {upcomingSessions.map(r => (
                <div key={r.id} className="bg-gray-800/60 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="text-white font-medium">{r.date}</div>
                    <div className="text-gray-400 text-sm">{r.spot}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{energyLabel(r.energy)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      r.mode === 'reflection' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'
                    }`}>{r.mode === 'reflection' ? '사색' : '스몰토크'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 쉼의 기록 타임라인 */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">🌿 쉼의 기록</h3>
          {attendedSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">아직 참석한 세션이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {attendedSessions.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
                <div key={r.id} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-amber-200 text-sm font-medium">{r.date}</div>
                      <div className="text-gray-300 text-sm">{r.spot}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{energyLabel(r.energy)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        r.mode === 'reflection' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'
                      }`}>{r.mode === 'reflection' ? '사색' : '스몰토크'}</span>
                    </div>
                  </div>
                  {r.memo && (
                    <p className="text-gray-400 text-sm mt-2 italic">💭 "{r.memo}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 오늘의 한마디들 */}
        {moments.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">✨ 멤버들의 한마디</h3>
            <div className="space-y-2">
              {moments.slice(0, 10).map((m, idx) => (
                <div key={idx} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                  <p className="text-gray-200 text-sm italic">"{m.moment_text}"</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-500 text-xs">{m.display_name}</span>
                    <span className="text-gray-500 text-xs">{m.date} · {m.spot}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
