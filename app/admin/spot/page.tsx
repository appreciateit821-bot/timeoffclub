'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTodayKST } from '@/lib/constants';

export default function SpotOperatorPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [checkinList, setCheckinList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkin' | 'reservations' | 'logs' | 'notices'>('checkin');
  const [spotName, setSpotName] = useState('');
  const [checkinDate, setCheckinDate] = useState(getTodayKST());

  const router = useRouter();

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (spotName) fetchCheckin(); }, [checkinDate, spotName]);

  const fetchData = async () => {
    try {
      const [resRes, logsRes, userRes] = await Promise.all([
        fetch('/api/admin/spot/reservations'),
        fetch('/api/admin/spot/logs'),
        fetch('/api/auth/me')
      ]);
      if (!resRes.ok || !logsRes.ok || !userRes.ok) { router.push('/login'); return; }
      setReservations((await resRes.json()).reservations);
      setLogs((await logsRes.json()).logs);
      const userData = await userRes.json();
      setSpotName(userData.user?.spotId || '');

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchCheckin = async () => {
    try {
      const res = await fetch(`/api/admin/spot/checkin?date=${checkinDate}`);
      if (res.ok) setCheckinList((await res.json()).reservations);
    } catch (e) { console.error(e); }
  };

  const handleCheckin = async (reservationId: number, status: string) => {
    try {
      const res = await fetch('/api/admin/spot/checkin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, status })
      });
      if (res.ok) fetchCheckin();
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // 통계
  const attendedCount = checkinList.filter(r => r.check_in_status === 'attended').length;
  const noShowCount = checkinList.filter(r => r.check_in_status === 'no_show').length;
  const uncheckedCount = checkinList.filter(r => r.check_in_status === 'unchecked').length;

  // 뒷4자리 표시 (이름에서 추출 불가하므로 user_name 마스킹)
  const maskName = (name: string) => {
    // DB에 저장된 phone_last4가 없으면 이름 마스킹
    return name.length > 1 ? name[0] + '***' : name;
  };

  // 로그 작업명 한글화
  const actionLabel = (action: string) => {
    if (action === 'CREATE') return '예약';
    if (action === 'CANCEL') return '취소';
    if (action.startsWith('UPDATE')) return '변경';
    return action;
  };
  const actionColor = (action: string) => {
    if (action === 'CREATE') return 'bg-green-900/50 text-green-300';
    if (action === 'CANCEL') return 'bg-red-900/50 text-red-300';
    return 'bg-yellow-900/50 text-yellow-300';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="text-gray-400">로딩 중...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white">스팟 운영자</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">{spotName}</p>
          </div>
          <button onClick={handleLogout} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs sm:text-sm">로그아웃</button>
        </div>
      </header>

      <div className="border-b border-gray-800 overflow-x-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 sm:gap-4">
            {(['checkin', 'reservations', 'logs', 'notices'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-4 py-2 sm:py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                  activeTab === tab ? 'text-amber-400 border-amber-400' : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}>
                {tab === 'checkin' ? '✅ 참가자 체크' : tab === 'reservations' ? '예약 현황' : tab === 'logs' ? '로그' : '📢 공지'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 오늘 요약 */}
        <div className="bg-gradient-to-r from-amber-900/20 to-gray-800/80 rounded-xl p-4 border border-amber-700/30 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-400">오늘 ({getTodayKST()})</div>
              <div className="text-white font-bold text-lg mt-1">{spotName}</div>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-amber-400">
                  {checkinDate === getTodayKST() ? checkinList.length : '-'}
                </div>
                <div className="text-[10px] text-gray-400">예약</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {checkinDate === getTodayKST() 
                    ? checkinList.filter(r => r.mode !== 'reflection').length : '-'}
                </div>
                <div className="text-[10px] text-gray-400">스몰토크</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-violet-400">
                  {checkinDate === getTodayKST()
                    ? checkinList.filter(r => r.mode === 'reflection').length : '-'}
                </div>
                <div className="text-[10px] text-gray-400">사색</div>
              </div>
            </div>
          </div>
        </div>

        {/* 참가자 체크 */}
        {activeTab === 'checkin' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">참가자 체크</h2>
              <input type="date" value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-400">{attendedCount}</div>
                <div className="text-xs text-green-300">출석</div>
              </div>
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-400">{noShowCount}</div>
                <div className="text-xs text-red-300">노쇼</div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-400">{uncheckedCount}</div>
                <div className="text-xs text-gray-400">미체크</div>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">총 {checkinList.length}명 예약</div>

            <div className="space-y-2">
              {checkinList.map((r) => (
                <div key={r.id}
                  className={`bg-gray-800 rounded-lg p-4 border ${
                    r.check_in_status === 'attended' ? 'border-green-700/50' :
                    r.check_in_status === 'no_show' ? 'border-red-700/50' : 'border-gray-700'
                  }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono font-medium">****{r.user_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          r.mode === 'reflection' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'
                        }`}>{r.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}</span>
                      </div>
                      {r.memo && <p className="text-gray-400 text-xs mt-1 italic">"{r.memo}"</p>}
                      {r.checked_at && (
                        <span className="text-[10px] text-gray-500">
                          {new Date(r.checked_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 체크
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCheckin(r.id, r.check_in_status === 'attended' ? 'unchecked' : 'attended')}
                        className={`px-5 py-3 rounded-xl text-lg font-bold transition active:scale-90 ${
                          r.check_in_status === 'attended' ? 'bg-green-600 text-white shadow-lg shadow-green-900/30' : 'bg-gray-700 text-gray-300 hover:bg-green-700 hover:text-white'
                        }`}>✅</button>
                      <button
                        onClick={() => handleCheckin(r.id, r.check_in_status === 'no_show' ? 'unchecked' : 'no_show')}
                        className={`px-5 py-3 rounded-xl text-lg font-bold transition active:scale-90 ${
                          r.check_in_status === 'no_show' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'bg-gray-700 text-gray-300 hover:bg-red-700 hover:text-white'
                        }`}>❌</button>
                    </div>
                  </div>
                </div>
              ))}
              {checkinList.length === 0 && (
                <div className="text-center py-12 text-gray-400">해당 날짜에 예약이 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {/* 예약 현황 */}
        {activeTab === 'reservations' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">{spotName} 예약 ({reservations.length}건)</h2>
            {reservations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">예약이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {reservations.map((r: any) => (
                  <div key={r.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700 flex justify-between items-center">
                    <div>
                      <div className="text-white text-sm font-medium">{r.date}</div>
                      <div className="text-gray-400 text-xs">****{r.user_name} · {r.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      r.check_in_status === 'attended' ? 'bg-green-900/50 text-green-300' :
                      r.check_in_status === 'no_show' ? 'bg-red-900/50 text-red-300' :
                      'bg-gray-700 text-gray-400'
                    }`}>{r.check_in_status === 'attended' ? '출석' : r.check_in_status === 'no_show' ? '노쇼' : '예약'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 로그 */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">변경/취소 로그</h2>
            {logs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">로그가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700 flex justify-between items-center">
                    <div>
                      <div className="text-gray-300 text-sm">****{log.user_name} · {log.date}</div>
                      <div className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleString('ko-KR')}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${actionColor(log.action)}`}>
                      {actionLabel(log.action)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 공지 — 노션 임베드 */}
        {activeTab === 'notices' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">📢 웰모먼트 공지</h2>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
              <iframe
                src="https://adhesive-paperback-2d2.notion.site/spotowner?pvs=74"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
