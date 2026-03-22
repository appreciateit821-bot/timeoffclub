'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SpotOperatorPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [checkinList, setCheckinList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkin' | 'reservations' | 'logs'>('checkin');
  const [spotName, setSpotName] = useState('');
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (spotName) fetchCheckin();
  }, [checkinDate, spotName]);

  const fetchData = async () => {
    try {
      const [resRes, logsRes, userRes] = await Promise.all([
        fetch('/api/admin/spot/reservations'),
        fetch('/api/admin/spot/logs'),
        fetch('/api/auth/me')
      ]);

      if (!resRes.ok || !logsRes.ok || !userRes.ok) {
        router.push('/login');
        return;
      }

      const resData = await resRes.json();
      const logsData = await logsRes.json();
      const userData = await userRes.json();

      setReservations(resData.reservations);
      setLogs(logsData.logs);
      setSpotName(userData.user?.spotId || '');
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckin = async () => {
    try {
      const res = await fetch(`/api/admin/spot/checkin?date=${checkinDate}`);
      if (res.ok) {
        const data = await res.json();
        setCheckinList(data.reservations);
      }
    } catch (error) {
      console.error('Failed to fetch checkin:', error);
    }
  };

  const handleCheckin = async (reservationId: number, status: string) => {
    try {
      const res = await fetch('/api/admin/spot/checkin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, status })
      });
      if (res.ok) {
        fetchCheckin();
      }
    } catch (error) {
      console.error('Checkin failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const groupedReservations = reservations.reduce((acc, res) => {
    const key = res.date;
    if (!acc[key]) {
      acc[key] = { date: res.date, spot: res.spot, users: [] };
    }
    acc[key].users.push(res.user_name);
    return acc;
  }, {} as Record<string, { date: string; spot: string; users: string[] }>);

  const groupedArray = Object.values(groupedReservations).sort((a: any, b: any) => b.date.localeCompare(a.date));

  const attendedCount = checkinList.filter(r => r.check_in_status === 'attended').length;
  const noShowCount = checkinList.filter(r => r.check_in_status === 'no_show').length;
  const uncheckedCount = checkinList.filter(r => r.check_in_status === 'unchecked').length;
  const confirmedCount = checkinList.filter(r => r.confirmed).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">스팟 운영자 페이지</h1>
              <p className="text-sm text-gray-400 mt-1">{spotName}</p>
            </div>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm font-medium">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4">
            {(['checkin', 'reservations', 'logs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium transition border-b-2 ${
                  activeTab === tab
                    ? 'text-amber-400 border-amber-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                {tab === 'checkin' ? '✅ 참가자 체크' : tab === 'reservations' ? '예약 현황' : '변경/취소 로그'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 참가자 체크인 탭 */}
        {activeTab === 'checkin' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-white">참가자 체크</h2>
              <input
                type="date"
                value={checkinDate}
                onChange={(e) => setCheckinDate(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{attendedCount}</div>
                <div className="text-sm text-green-300">출석</div>
              </div>
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{noShowCount}</div>
                <div className="text-sm text-red-300">노쇼</div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-400">{uncheckedCount}</div>
                <div className="text-sm text-gray-400">미체크</div>
              </div>
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{confirmedCount}/{checkinList.length}</div>
                <div className="text-sm text-blue-300">참석확인</div>
              </div>
            </div>

            {/* 체크인 목록 */}
            <div className="space-y-3">
              {checkinList.map((reservation) => (
                <div
                  key={reservation.id}
                  className={`bg-gray-800 rounded-lg p-4 border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    reservation.check_in_status === 'attended'
                      ? 'border-green-700/50'
                      : reservation.check_in_status === 'no_show'
                      ? 'border-red-700/50'
                      : 'border-gray-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-lg">{reservation.user_name}</span>
                      {reservation.confirmed ? (
                        <span className="px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded text-[10px]">참석확인</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-[10px]">미확인</span>
                      )}
                    </div>
                    {reservation.checked_at && (
                      <span className="text-xs text-gray-400">
                        {new Date(reservation.checked_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 체크
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCheckin(reservation.id, reservation.check_in_status === 'attended' ? 'unchecked' : 'attended')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        reservation.check_in_status === 'attended'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-green-700 hover:text-white'
                      }`}
                    >
                      ✅ 출석
                    </button>
                    <button
                      onClick={() => handleCheckin(reservation.id, reservation.check_in_status === 'no_show' ? 'unchecked' : 'no_show')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        reservation.check_in_status === 'no_show'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-red-700 hover:text-white'
                      }`}
                    >
                      ❌ 노쇼
                    </button>
                  </div>
                </div>
              ))}

              {checkinList.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  해당 날짜에 예약이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 예약 현황 탭 */}
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">{spotName} 예약 현황 ({reservations.length}건)</h2>
            <div className="grid gap-4">
              {(groupedArray as any[]).map((group) => (
                <div key={group.date} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{group.date}</h3>
                      <p className="text-gray-400 text-sm mt-1">{group.spot}</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-900/50 text-amber-300 rounded-full text-sm font-medium">
                      {group.users.length}/10명
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.users.map((userName: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">{userName}</span>
                    ))}
                  </div>
                </div>
              ))}
              {groupedArray.length === 0 && <div className="text-center py-12 text-gray-400">아직 예약이 없습니다.</div>}
            </div>
          </div>
        )}

        {/* 로그 탭 */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">변경/취소 로그</h2>
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">일시</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">사용자</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">날짜</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 text-sm text-gray-300">{new Date(log.created_at).toLocaleString('ko-KR')}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{log.user_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{log.date}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.action === 'CREATE' ? 'bg-green-900/50 text-green-300' :
                            log.action === 'CANCEL' ? 'bg-red-900/50 text-red-300' :
                            'bg-yellow-900/50 text-yellow-300'
                          }`}>{log.action}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logs.length === 0 && <div className="text-center py-12 text-gray-400">아직 로그가 없습니다.</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
