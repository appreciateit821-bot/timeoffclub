'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTodayKST, formatKST } from '@/lib/constants';

export default function SpotOperatorPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [checkinList, setCheckinList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkin' | 'reservations' | 'logs' | 'notices' | 'requests'>('checkin');
  const [notices, setNotices] = useState<any[]>([]);
  const [spotName, setSpotName] = useState('');
  const [spotRequests, setSpotRequests] = useState<any[]>([]);
  const [reqCategory, setReqCategory] = useState('general');
  const [reqContent, setReqContent] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqSuccess, setReqSuccess] = useState('');
  const [editingCapDate, setEditingCapDate] = useState('');
  const [editingCapValue, setEditingCapValue] = useState('');
  const [sessionCapacities, setSessionCapacities] = useState<{ [date: string]: { capacity: number; isCustom: boolean } }>({});
  const [checkinDate, setCheckinDate] = useState(() => {
    // 가장 가까운 세션 날짜 (수요일/일요일)로 자동 설정
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kst = new Date(now.getTime() + kstOffset + now.getTimezoneOffset() * 60 * 1000);
    for (let i = 0; i < 7; i++) {
      const d = new Date(kst);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      if (dow === 3 || dow === 0) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    return getTodayKST();
  });

  const router = useRouter();

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (spotName) { fetchCheckin(); fetchSessionCapacity(checkinDate); } }, [checkinDate, spotName]);

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
      try { const nr = await fetch('/api/admin/notices'); if (nr.ok) setNotices((await nr.json()).notices); } catch {}
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

  const fetchSessionCapacity = async (date: string) => {
    try {
      const res = await fetch(`/api/admin/spot/capacity?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setSessionCapacities(prev => ({ ...prev, [date]: { capacity: data.capacity, isCustom: data.isCustom } }));
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveCapacity = async (date: string, value: number) => {
    try {
      await fetch('/api/admin/spot/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, maxCapacity: value })
      });
      setEditingCapDate('');
      fetchSessionCapacity(date);
    } catch (e) { console.error(e); }
  };

  const handleResetCapacity = async (date: string) => {
    try {
      await fetch(`/api/admin/spot/capacity?date=${date}`, { method: 'DELETE' });
      setEditingCapDate('');
      fetchSessionCapacity(date);
    } catch (e) { console.error(e); }
  };

  const fetchSpotRequests = async () => {
    try {
      const res = await fetch('/api/admin/spot/requests');
      if (res.ok) setSpotRequests((await res.json()).requests);
    } catch (e) { console.error(e); }
  };

  const handleSpotRequestSubmit = async () => {
    if (!reqContent.trim()) return;
    setReqSubmitting(true);
    setReqSuccess('');
    try {
      const res = await fetch('/api/admin/spot/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: reqCategory, content: reqContent })
      });
      if (res.ok) {
        setReqSuccess('요청이 전달되었습니다 💛');
        setReqContent('');
        setReqCategory('general');
        fetchSpotRequests();
      }
    } catch (e) { alert('제출 중 오류'); }
    finally { setReqSubmitting(false); }
  };

  // 통계
  const attendedCount = checkinList.filter(r => r.check_in_status === 'attended').length;
  const noShowCount = checkinList.filter(r => r.check_in_status === 'no_show').length;
  const uncheckedCount = checkinList.filter(r => r.check_in_status === 'unchecked').length;

  // 다음 세션 날짜 계산 (수요일=3, 일요일=0)
  const getUpcomingSessions = () => {
    const today = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(today.getTime() + kstOffset + today.getTimezoneOffset() * 60 * 1000);
    const sessions: { date: string; day: string; time: string; isToday: boolean }[] = [];
    const todayStr = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, '0')}-${String(kstNow.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 35; i++) {
      const d = new Date(kstNow);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      if (dow === 3 || dow === 0) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        sessions.push({
          date: dateStr,
          day: dow === 3 ? '수' : '일',
          time: dow === 3 ? '20:00' : '15:00',
          isToday: dateStr === todayStr
        });
      }
      if (sessions.length >= 8) break;
    }
    return sessions;
  };

  const [upcomingData, setUpcomingData] = useState<{ [date: string]: { total: number; smalltalk: number; reflection: number } }>({});

  useEffect(() => {
    const fetchUpcoming = async () => {
      const sessions = getUpcomingSessions();
      const data: typeof upcomingData = {};
      for (const s of sessions) {
        try {
          const res = await fetch(`/api/admin/spot/checkin?date=${s.date}`);
          if (res.ok) {
            const d = await res.json();
            const rs = d.reservations || [];
            data[s.date] = {
              total: rs.length,
              smalltalk: rs.filter((r: any) => r.mode !== 'reflection').length,
              reflection: rs.filter((r: any) => r.mode === 'reflection').length
            };
          }
        } catch {}
      }
      setUpcomingData(data);
    };
    if (spotName) {
      fetchUpcoming();
      // 다가오는 세션 인원 조회
      const sessions = getUpcomingSessions();
      sessions.forEach(s => fetchSessionCapacity(s.date));
    }
  }, [spotName]);

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
            <p className="text-xs sm:text-sm text-gray-400 mt-1">{spotName.split('_')[1] || spotName}</p>
          </div>
          <button onClick={handleLogout} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs sm:text-sm">로그아웃</button>
        </div>
      </header>

      <div className="border-b border-gray-800 overflow-x-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex gap-0">
            {(['checkin', 'reservations', 'logs', 'notices', 'requests'] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'requests') fetchSpotRequests(); }}
                className={`px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition border-b-2 whitespace-nowrap ${
                  activeTab === tab ? 'text-amber-400 border-amber-400' : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}>
                {tab === 'checkin' ? '✅ 체크' : tab === 'reservations' ? '📋 예약' : tab === 'logs' ? '📝 로그' : tab === 'notices' ? '📢 공지' : '📮 요청'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* 참가자 체크 */}
        {activeTab === 'checkin' && (
          <div className="space-y-4">

        {/* 한 달 세션 요약 */}
        <div className="bg-gradient-to-r from-amber-900/20 to-gray-800/80 rounded-xl p-4 border border-amber-700/30 mb-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-white font-bold">{spotName.split('_')[1] || spotName}</div>
              <div className="text-xs text-gray-400">{spotName.split('_')[0]} · 한 달 세션</div>
            </div>
          </div>
          <div className="space-y-2">
            {getUpcomingSessions().map(s => {
              const data = upcomingData[s.date];
              const cap = sessionCapacities[s.date];
              const isEditing = editingCapDate === s.date;
              return (
                <div key={s.date}
                  className={`rounded-xl p-3 transition ${
                    s.isToday ? 'bg-emerald-900/20 border border-emerald-600/40' :
                    checkinDate === s.date ? 'bg-amber-900/20 border border-amber-600/40' : 'bg-gray-800/80 border border-gray-700'
                  }`}>
                  <div className="flex items-center justify-between" onClick={() => setCheckinDate(s.date)}>
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[48px]">
                        {s.isToday && <div className="text-[9px] text-emerald-400 font-bold">오늘</div>}
                        <div className={`text-[10px] ${s.isToday ? 'text-emerald-300' : 'text-gray-400'}`}>{s.day}</div>
                        <div className={`text-sm font-bold ${s.isToday ? 'text-emerald-200' : 'text-white'}`}>{s.date.slice(5)}</div>
                        <div className="text-[10px] text-gray-500">{s.time}</div>
                      </div>
                      <div>
                        {cap?.capacity === 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-bold text-sm">🚫 세션 닫힘</span>
                          </div>
                        ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 font-bold text-lg">{data?.total ?? 0}</span>
                          <span className="text-gray-500 text-xs">명 예약</span>
                          {cap && <span className="text-gray-600 text-[10px]">/ {cap.capacity}명</span>}
                        </div>
                        )}
                        {cap?.capacity !== 0 && data && data.total > 0 && (
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-[10px] text-blue-300">💬 {data.smalltalk}</span>
                            <span className="text-[10px] text-violet-300">🧘 {data.reflection}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); if (isEditing) { setEditingCapDate(''); } else { setEditingCapDate(s.date); setEditingCapValue(String(cap?.capacity || 10)); } }}
                      className={`px-3 py-1.5 rounded-lg text-xs transition active:scale-95 ${
                        isEditing ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}>
                      {isEditing ? '닫기' : '👥 인원'}
                    </button>
                  </div>
                  {/* 인원 조절 펼침 */}
                  {isEditing && (
                    <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                      <div className="flex gap-1.5">
                        {[2, 4, 6, 8, 10].map(n => (
                          <button key={n} onClick={() => setEditingCapValue(String(n))}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition active:scale-95 ${
                              editingCapValue === String(n) ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400'
                            }`}>{n}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { handleSaveCapacity(s.date, parseInt(editingCapValue)); }}
                          className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium transition active:scale-95">
                          {editingCapValue}명으로 저장
                        </button>
                        {cap?.isCustom && (
                          <button onClick={() => handleResetCapacity(s.date)}
                            className="px-3 py-2 bg-gray-700 text-gray-400 rounded-lg text-xs transition">초기화</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">참가자 체크</h2>
                <p className="text-xs text-gray-400 mt-0.5">{checkinDate} {(() => { const d = new Date(checkinDate + 'T00:00:00+09:00'); return d.getDay() === 3 ? '수요일 20:00' : d.getDay() === 0 ? '일요일 15:00' : ''; })()}</p>
              </div>
              <input type="date" value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>

            {/* 오늘 세션 요약 */}
            {checkinList.length > 0 && (
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm font-medium">세션 참가자 구성</span>
                  <span className="text-amber-300 text-sm font-bold">{checkinList.length}명</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-blue-900/30 rounded-lg p-2.5 text-center border border-blue-800/30">
                    <div className="text-blue-300 text-lg font-bold">{checkinList.filter(r => r.mode !== 'reflection').length}</div>
                    <div className="text-blue-400 text-[10px]">💬 스몰토크</div>
                  </div>
                  <div className="flex-1 bg-violet-900/30 rounded-lg p-2.5 text-center border border-violet-800/30">
                    <div className="text-violet-300 text-lg font-bold">{checkinList.filter(r => r.mode === 'reflection').length}</div>
                    <div className="text-violet-400 text-[10px]">🧘 사색</div>
                  </div>
                </div>
              </div>
            )}

            {/* 인원 표시 */}
            <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700 flex items-center justify-between">
              <span className="text-gray-400 text-sm">👥 최대 <span className="text-amber-300 font-bold">{sessionCapacities[checkinDate]?.capacity || '...'}</span>명</span>
              <span className="text-gray-500 text-xs">상단에서 인원 변경 가능</span>
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

            <div className="space-y-3">
              {checkinList.map((r) => (
                <div key={r.id}
                  className={`bg-gray-800 rounded-xl overflow-hidden border ${
                    r.check_in_status === 'attended' ? 'border-green-600/50' :
                    r.check_in_status === 'no_show' ? 'border-red-600/50' : 'border-gray-700'
                  }`}>
                  {/* 참가자 정보 */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-mono font-bold text-base">{r.display_id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.is_trial ? 'bg-orange-900/50 text-orange-300' : 'bg-gray-700 text-gray-400'
                      }`}>{r.is_trial ? '🎫 체험' : '멤버'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.mode === 'reflection' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'
                      }`}>{r.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}</span>
                    </div>
                    {r.memo && <p className="text-gray-400 text-sm italic mt-1">💭 "{r.memo}"</p>}
                    {r.checked_at && (
                      <p className="text-[11px] text-gray-500 mt-1">{formatKST(r.checked_at)} 체크</p>
                    )}
                  </div>
                  {/* 체크인 버튼 — 크고 확실하게 */}
                  <div className="flex border-t border-gray-700">
                    <button
                      onClick={() => handleCheckin(r.id, r.check_in_status === 'attended' ? 'unchecked' : 'attended')}
                      className={`flex-1 py-4 text-center font-bold text-base transition active:scale-95 ${
                        r.check_in_status === 'attended'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-green-900/30 hover:text-green-300'
                      }`}>
                      ✅ 출석
                    </button>
                    <div className="w-px bg-gray-700" />
                    <button
                      onClick={() => handleCheckin(r.id, r.check_in_status === 'no_show' ? 'unchecked' : 'no_show')}
                      className={`flex-1 py-4 text-center font-bold text-base transition active:scale-95 ${
                        r.check_in_status === 'no_show'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-red-900/30 hover:text-red-300'
                      }`}>
                      ❌ 노쇼
                    </button>
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
                      <div className="text-gray-400 text-xs">{r.display_id} · {r.is_trial ? '🎫체험' : '멤버'} · {r.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}</div>
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
                      <div className="text-gray-300 text-sm">{log.display_id || "****"} · {log.date}</div>
                      <div className="text-gray-500 text-xs">{formatKST(log.created_at)}</div>
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

        {/* 공지 */}
        {activeTab === 'notices' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">📢 웰모먼트 공지</h2>
            {notices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">공지가 없습니다.</div>
            ) : (
              notices.map((n: any) => (
                <div key={n.id} className={`bg-gray-800 rounded-lg p-4 border ${n.is_pinned ? 'border-amber-600/50' : 'border-gray-700'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {n.is_pinned && <span className="text-xs">📌</span>}
                    <span className="text-white font-medium">{n.title}</span>
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{n.content}</p>
                  <p className="text-gray-500 text-xs mt-2">{formatKST(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 웰모먼트에 요청 */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {reqSuccess && (
              <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg">{reqSuccess}</div>
            )}

            <div className="bg-gray-800/80 rounded-xl p-5 border border-emerald-800/30 space-y-4">
              <div>
                <h3 className="text-emerald-200 font-medium mb-1">📮 웰모먼트에 요청</h3>
                <p className="text-gray-400 text-xs">운영 관련 건의사항, 요청사항을 자유롭게 남겨주세요.</p>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1.5">카테고리</label>
                <select value={reqCategory} onChange={(e) => setReqCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="general">일반 건의</option>
                  <option value="space">공간/시설 관련</option>
                  <option value="supply">비품/물품 요청</option>
                  <option value="schedule">일정/운영 관련</option>
                  <option value="issue">문제 보고</option>
                  <option value="etc">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1.5">내용</label>
                <textarea value={reqContent} onChange={(e) => setReqContent(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] resize-y"
                  placeholder="웰모먼트에 전달하고 싶은 내용을 작성해주세요..." maxLength={1000} />
              </div>

              <button onClick={handleSpotRequestSubmit} disabled={reqSubmitting || !reqContent.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50 active:scale-95">
                {reqSubmitting ? '전송 중...' : '요청 보내기'}
              </button>
            </div>

            {/* 내가 보낸 요청 목록 */}
            {spotRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">📋 보낸 요청</h3>
                <div className="space-y-2">
                  {spotRequests.map((r: any) => (
                    <div key={r.id} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/30">
                          {{ general: '일반', space: '공간/시설', supply: '비품', schedule: '일정', issue: '문제', etc: '기타' }[r.category as string] || r.category}
                        </span>
                        <span className="text-xs text-gray-600 ml-auto">{r.created_at?.slice(0, 10)}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{r.content}</p>
                      {r.admin_reply && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <p className="text-xs text-amber-300">💬 웰모먼트 답변</p>
                          <p className="text-gray-300 text-sm mt-1">{r.admin_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
