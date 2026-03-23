'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reservations' | 'logs' | 'members' | 'checkin' | 'trial' | 'feedback' | 'notices' | 'reports'>('reservations');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetResult, setSheetResult] = useState('');
  const [checkinData, setCheckinData] = useState<any>({ reservations: [], noShowStats: [], stats: [] });
  const [checkinDate, setCheckinDate] = useState('');
  const [trialTickets, setTrialTickets] = useState<any[]>([]);
  const [trialCount, setTrialCount] = useState(1);
  const [feedbackData, setFeedbackData] = useState<any>({ feedbacks: [], issues: [] });
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [capacitySaving, setCapacitySaving] = useState(false);
  const [sessionCapacities, setSessionCapacities] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeTarget, setNoticeTarget] = useState('all');
  const [noticePinned, setNoticePinned] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => { if (d.maxCapacity) setMaxCapacity(d.maxCapacity); }).catch(() => {});
  }, []);

  const fetchSessionCapacities = async () => {
    try {
      const res = await fetch('/api/admin/capacity');
      if (res.ok) { const d = await res.json(); setSessionCapacities(d.capacities || []); }
    } catch {}
  };

  const handleSetSessionCapacity = async (date: string, spot: string, cap: number) => {
    await fetch('/api/admin/capacity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, spot, maxCapacity: cap })
    });
    fetchSessionCapacities();
  };

  const getSessionCap = (date: string, spot: string) => {
    const custom = sessionCapacities.find((c: any) => c.date === date && c.spot === spot);
    return custom ? custom.max_capacity : maxCapacity;
  };

  const handleSaveCapacity = async () => {
    setCapacitySaving(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxCapacity })
      });
    } catch {}
    finally { setCapacitySaving(false); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resRes, logsRes, membersRes] = await Promise.all([
        fetch('/api/admin/reservations'),
        fetch('/api/admin/logs'),
        fetch('/api/admin/members')
      ]);

      if (!resRes.ok || !logsRes.ok || !membersRes.ok) {
        router.push('/login');
        return;
      }

      const resData = await resRes.json();
      const logsData = await logsRes.json();
      const membersData = await membersRes.json();

      setReservations(resData.reservations);
      setLogs(logsData.logs);
      setMembers(membersData.members);

      // 대시보드용 데이터
      try { await fetchCheckin(); } catch {}
      try { await fetchReports(); } catch {}
      try { await fetchSessionCapacities(); } catch {}
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (search?: string) => {
    try {
      const url = search ? `/api/admin/members?search=${encodeURIComponent(search)}` : '/api/admin/members';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reservations_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberSuccess('');

    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMemberName, phoneLast4: newMemberPhone })
      });

      const data = await res.json();

      if (!res.ok) {
        setMemberError(data.error || '멤버 추가에 실패했습니다.');
        return;
      }

      setMemberSuccess('멤버가 추가되었습니다.');
      setNewMemberName('');
      setNewMemberPhone('');
      fetchMembers(memberSearch);
    } catch (error) {
      setMemberError('멤버 추가 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive })
      });

      if (res.ok) {
        fetchMembers(memberSearch);
      }
    } catch (error) {
      console.error('Failed to toggle member:', error);
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('정말 이 멤버를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/members?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchMembers(memberSearch);
      }
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  };

  const handleSearchMembers = () => {
    fetchMembers(memberSearch);
  };

  const handleImportSheet = async () => {
    if (!sheetUrl) return;
    setSheetLoading(true);
    setSheetResult('');
    try {
      const res = await fetch('/api/admin/members/import-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        setSheetResult(`❌ ${data.error}`);
      } else {
        setSheetResult(`✅ ${data.added}명 추가, ${data.skipped}명 스킵 (전체 ${data.total}명)`);
        fetchMembers(memberSearch);
      }
    } catch (error) {
      setSheetResult('❌ 가져오기 중 오류가 발생했습니다.');
    } finally {
      setSheetLoading(false);
    }
  };

  const fetchTrialTickets = async () => {
    try {
      const res = await fetch('/api/admin/trial-tickets');
      if (res.ok) { const data = await res.json(); setTrialTickets(data.tickets); }
    } catch (e) { console.error(e); }
  };

  const handleCreateTickets = async () => {
    try {
      const res = await fetch('/api/admin/trial-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: trialCount })
      });
      if (res.ok) { fetchTrialTickets(); }
    } catch (e) { console.error(e); }
  };

  const handleDeleteTicket = async (id: number) => {
    try {
      await fetch(`/api/admin/trial-tickets?id=${id}`, { method: 'DELETE' });
      fetchTrialTickets();
    } catch (e) { console.error(e); }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch('/api/admin/feedbacks');
      if (res.ok) { const data = await res.json(); setFeedbackData(data); }
    } catch (e) { console.error(e); }
  };

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/admin/notices');
      if (res.ok) { const data = await res.json(); setNotices(data.notices); }
    } catch (e) { console.error(e); }
  };

  const handleCreateNotice = async () => {
    if (!noticeTitle || !noticeContent) return;
    try {
      const res = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noticeTitle, content: noticeContent, target: noticeTarget, isPinned: noticePinned })
      });
      if (res.ok) { setNoticeTitle(''); setNoticeContent(''); setNoticePinned(false); fetchNotices(); }
    } catch (e) { console.error(e); }
  };

  const handleDeleteNotice = async (id: number) => {
    if (!confirm('공지를 삭제하시겠습니까?')) return;
    await fetch(`/api/admin/notices?id=${id}`, { method: 'DELETE' });
    fetchNotices();
  };

  const handleEditNotice = async () => {
    if (!editingNotice) return;
    try {
      await fetch('/api/admin/notices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingNotice)
      });
      setEditingNotice(null);
      fetchNotices();
    } catch (e) { console.error(e); }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) setReports((await res.json()).reports);
    } catch (e) { console.error(e); }
  };

  const handleReportAction = async (id: number, status: string, adminNote: string) => {
    await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, adminNote })
    });
    fetchReports();
  };

  const fetchCheckin = async (date?: string) => {
    try {
      const url = date ? `/api/admin/checkin?date=${date}` : '/api/admin/checkin';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCheckinData(data);
      }
    } catch (error) {
      console.error('Failed to fetch checkin:', error);
    }
  };

  // 날짜별, 스팟별로 그룹화
  const groupedReservations = reservations.reduce((acc, res) => {
    const key = `${res.date}_${res.spot}`;
    if (!acc[key]) {
      acc[key] = {
        date: res.date,
        spot: res.spot,
        users: []
      };
    }
    acc[key].users.push(res.user_name);
    return acc;
  }, {} as Record<string, { date: string; spot: string; users: string[] }>);

  const groupedArray = Object.values(groupedReservations).sort((a: any, b: any) => {
    return b.date.localeCompare(a.date);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white">슈퍼관리자</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">예약 · 로그 · 멤버 · 체크인</p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
              <button
                onClick={() => router.push('/calendar')}
                className="px-3 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-xs sm:text-sm font-medium"
              >
                캘린더
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-xs sm:text-sm font-medium"
              >
                CSV
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-xs sm:text-sm font-medium"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 sm:gap-4 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('reservations')}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'reservations'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              예약 현황
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              변경/취소 로그
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'members'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              멤버 관리
            </button>
            <button
              onClick={() => { setActiveTab('checkin'); fetchCheckin(checkinDate || undefined); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'checkin'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              ✅ 체크인
            </button>
            <button
              onClick={() => { setActiveTab('trial'); fetchTrialTickets(); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'trial'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              🎫 체험권
            </button>
            <button
              onClick={() => { setActiveTab('feedback'); fetchFeedbacks(); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'feedback'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              💬 피드백
            </button>
            <button
              onClick={() => { setActiveTab('notices'); fetchNotices(); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'notices'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              📢 공지
            </button>
            <button
              onClick={() => { setActiveTab('reports'); fetchReports(); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              🚨 신고
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 웰모먼트 대시보드 요약 — 항상 상단에 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-amber-900/30 to-gray-800 rounded-xl p-4 border border-amber-700/30 text-center">
            <div className="text-2xl font-bold text-amber-400">{reservations.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">전체 예약</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-blue-400">{members.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">활성 멤버</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-red-400">{checkinData.noShowStats?.length || 0}</div>
            <div className="text-[10px] text-gray-400 mt-1">노쇼 멤버</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <div className="text-2xl font-bold text-orange-400">{reports.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">신고</div>
          </div>
        </div>

        {activeTab === 'reservations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-xl font-semibold text-white">
                전체 예약 현황 ({reservations.length}건)
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">스팟당 최대 인원:</span>
                <input type="number" value={maxCapacity} onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 10)}
                  className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm text-center" min={1} max={50} />
                <button onClick={handleSaveCapacity} disabled={capacitySaving}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm disabled:opacity-50">
                  {capacitySaving ? '...' : '저장'}
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {groupedArray.map((group: any) => (
                <div
                  key={`${group.date}_${group.spot}`}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{group.date}</h3>
                      <p className="text-gray-400 text-sm mt-1">{group.spot}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-300 text-sm font-medium">
                        {group.users.length}/{getSessionCap(group.date, group.spot)}명
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleSetSessionCapacity(group.date, group.spot, Math.max(1, getSessionCap(group.date, group.spot) - 1))}
                          className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">-</button>
                        <button onClick={() => handleSetSessionCapacity(group.date, group.spot, Math.min(50, getSessionCap(group.date, group.spot) + 1))}
                          className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">+</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.users.map((userName: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm"
                      >
                        {userName}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {groupedArray.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  아직 예약이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">
              변경/취소 로그 (최근 1000건)
            </h2>

            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        일시
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        사용자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        날짜
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        스팟
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(log.created_at).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {log.user_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {log.date}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {log.spot || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.action === 'CREATE'
                                ? 'bg-green-900/50 text-green-300'
                                : log.action === 'CANCEL'
                                ? 'bg-red-900/50 text-red-300'
                                : 'bg-yellow-900/50 text-yellow-300'
                            }`}
                          >
                            {log.action === 'CREATE' ? '예약' : log.action === 'CANCEL' ? '취소' : log.action.startsWith('UPDATE') ? '변경' : log.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {logs.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  아직 로그가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">멤버 관리</h2>

            {/* 멤버 추가 폼 */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">새 멤버 추가</h3>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      이름
                    </label>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="이름"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      연락처 뒷 4자리
                    </label>
                    <input
                      type="text"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="1234"
                      maxLength={4}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                    >
                      멤버 추가
                    </button>
                  </div>
                </div>

                {memberError && (
                  <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                    {memberError}
                  </div>
                )}

                {memberSuccess && (
                  <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg text-sm">
                    {memberSuccess}
                  </div>
                )}
              </form>
            </div>

            {/* 구글 시트 가져오기 */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">📊 구글 시트에서 멤버 가져오기</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="구글 스프레드시트 URL을 붙여넣으세요"
                />
                <button
                  onClick={handleImportSheet}
                  disabled={sheetLoading || !sheetUrl}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition font-medium disabled:opacity-50"
                >
                  {sheetLoading ? '가져오는 중...' : '가져오기'}
                </button>
              </div>
              {sheetResult && (
                <div className={`mt-3 px-4 py-3 rounded-lg text-sm ${
                  sheetResult.startsWith('✅') ? 'bg-green-900/50 border border-green-700 text-green-200' : 'bg-red-900/50 border border-red-700 text-red-200'
                }`}>
                  {sheetResult}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">시트에 "성함"과 "연락처" 컬럼이 있어야 합니다. 이미 등록된 멤버는 자동으로 스킵됩니다.</p>
            </div>

            {/* 멤버 검색 */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchMembers()}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="이름 또는 연락처로 검색"
                />
                <button
                  onClick={handleSearchMembers}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  검색
                </button>
                {memberSearch && (
                  <button
                    onClick={() => {
                      setMemberSearch('');
                      fetchMembers();
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    초기화
                  </button>
                )}
              </div>
            </div>

            {/* 멤버 목록 */}
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        이름
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        연락처 뒷4자리
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        등록일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {members.map((member: any) => (
                      <tr key={member.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {member.phone_last4}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              member.is_active
                                ? 'bg-green-900/50 text-green-300'
                                : 'bg-red-900/50 text-red-300'
                            }`}
                          >
                            {member.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(member.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleActive(member.id, member.is_active)}
                              className={`px-3 py-1 rounded text-xs font-medium transition ${
                                member.is_active
                                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {member.is_active ? '비활성화' : '활성화'}
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {members.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  등록된 멤버가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'checkin' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-white">체크인 현황</h2>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={checkinDate}
                  onChange={(e) => { setCheckinDate(e.target.value); fetchCheckin(e.target.value); }}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={() => { setCheckinDate(''); fetchCheckin(); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
                >
                  전체 보기
                </button>
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-3 gap-4">
              {checkinData.stats.map((s: any) => (
                <div key={s.check_in_status} className={`rounded-lg p-4 text-center border ${
                  s.check_in_status === 'attended' ? 'bg-green-900/30 border-green-700/50' :
                  s.check_in_status === 'no_show' ? 'bg-red-900/30 border-red-700/50' :
                  'bg-gray-800 border-gray-700'
                }`}>
                  <div className={`text-2xl font-bold ${
                    s.check_in_status === 'attended' ? 'text-green-400' :
                    s.check_in_status === 'no_show' ? 'text-red-400' : 'text-gray-400'
                  }`}>{s.count}</div>
                  <div className="text-sm text-gray-300">
                    {s.check_in_status === 'attended' ? '출석' : s.check_in_status === 'no_show' ? '노쇼' : '미체크'}
                  </div>
                </div>
              ))}
            </div>

            {/* 노쇼 주의 멤버 */}
            {checkinData.noShowStats.length > 0 && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-300 mb-3">⚠️ 노쇼 주의 멤버</h3>
                <div className="flex flex-wrap gap-3">
                  {checkinData.noShowStats.map((s: any) => (
                    <span key={s.user_name} className="px-3 py-1 bg-red-900/50 text-red-200 rounded-full text-sm">
                      {s.user_name} ({s.no_show_count}회)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 체크인 목록 */}
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">날짜</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">스팟</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">멤버</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">상태</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">체크 시간</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">체크한 운영자</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {checkinData.reservations.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 text-sm text-gray-300">{r.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{r.spot}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{r.user_name}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            r.check_in_status === 'attended' ? 'bg-green-900/50 text-green-300' :
                            r.check_in_status === 'no_show' ? 'bg-red-900/50 text-red-300' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {r.check_in_status === 'attended' ? '✅ 출석' : r.check_in_status === 'no_show' ? '❌ 노쇼' : '⏳ 미체크'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {r.checked_at ? new Date(r.checked_at).toLocaleString('ko-KR') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{r.checked_by || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {checkinData.reservations.length === 0 && (
                <div className="text-center py-12 text-gray-400">체크인 데이터가 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {/* 체험권 관리 */}
        {activeTab === 'trial' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">체험권 관리</h2>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">체험권 발급</h3>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">발급 수량</label>
                  <input
                    type="number"
                    value={trialCount}
                    onChange={(e) => setTrialCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    className="w-24 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    min={1}
                    max={50}
                  />
                </div>
                <button
                  onClick={handleCreateTickets}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
                >
                  발급하기
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">코드</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">상태</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">사용자</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">생성일</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {trialTickets.map((t: any) => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 text-sm font-mono text-amber-300">{t.code}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${t.is_used ? 'bg-gray-700 text-gray-400' : 'bg-green-900/50 text-green-300'}`}>
                            {t.is_used ? '사용됨' : '미사용'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">{t.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{new Date(t.created_at).toLocaleDateString('ko-KR')}</td>
                        <td className="px-4 py-3">
                          {!t.is_used && (
                            <button onClick={() => handleDeleteTicket(t.id)} className="text-red-400 hover:text-red-300 text-sm">삭제</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {trialTickets.length === 0 && <div className="text-center py-12 text-gray-400">발급된 체험권이 없습니다.</div>}
            </div>
          </div>
        )}

        {/* 피드백 */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">멤버 피드백</h2>

            {/* 불편 신고 (우선 표시) */}
            {feedbackData.issues.length > 0 && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-300 mb-4">🚨 불편 신고 ({feedbackData.issues.length}건)</h3>
                <div className="space-y-4">
                  {feedbackData.issues.map((f: any) => (
                    <div key={f.id} className="bg-gray-800 rounded-lg p-4 border border-red-800/30">
                      <div className="flex justify-between mb-2">
                        <span className="text-white font-medium">{f.user_name}</span>
                        <span className="text-gray-400 text-sm">{f.date} · {f.spot}</span>
                      </div>
                      <p className="text-red-200 text-sm">{f.person_issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 전체 피드백 */}
            <div className="space-y-4">
              {feedbackData.feedbacks.map((f: any) => (
                <div key={f.id} className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                  <div className="flex flex-col sm:flex-row justify-between mb-3 gap-2">
                    <div>
                      <span className="text-white font-medium">{f.user_name}</span>
                      <span className="text-gray-400 text-sm ml-2">{f.date} · {f.spot}</span>
                    </div>
                    <div className="text-amber-400">{'★'.repeat(f.service_rating)}{'☆'.repeat(5 - f.service_rating)}</div>
                  </div>
                  {f.service_feedback && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">서비스 개선:</span>
                      <p className="text-gray-300 text-sm">{f.service_feedback}</p>
                    </div>
                  )}
                  {f.person_issue && (
                    <div className="mb-2 bg-red-900/20 rounded p-2">
                      <span className="text-xs text-red-400">🔒 불편 신고:</span>
                      <p className="text-red-200 text-sm">{f.person_issue}</p>
                    </div>
                  )}
                  {f.general_comment && (
                    <div>
                      <span className="text-xs text-gray-500">기타:</span>
                      <p className="text-gray-300 text-sm">{f.general_comment}</p>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">{new Date(f.created_at).toLocaleString('ko-KR')}</div>
                </div>
              ))}
              {feedbackData.feedbacks.length === 0 && <div className="text-center py-12 text-gray-400">피드백이 없습니다.</div>}
            </div>
          </div>
        )}
        {/* 공지 관리 */}
        {activeTab === 'notices' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">📢 스팟 운영자 공지</h2>

            {/* 새 공지 작성 / 수정 폼 */}
            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700 space-y-4">
              <h3 className="text-base font-semibold text-white">
                {editingNotice ? '✏️ 공지 수정' : '✍️ 새 공지 작성'}
              </h3>
              <input type="text"
                value={editingNotice ? editingNotice.title : noticeTitle}
                onChange={(e) => editingNotice
                  ? setEditingNotice({ ...editingNotice, title: e.target.value })
                  : setNoticeTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400"
                placeholder="제목을 입력하세요" />
              <textarea
                value={editingNotice ? editingNotice.content : noticeContent}
                onChange={(e) => editingNotice
                  ? setEditingNotice({ ...editingNotice, content: e.target.value })
                  : setNoticeContent(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 min-h-[100px] resize-y"
                placeholder="내용을 입력하세요" />
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <select
                  value={editingNotice ? editingNotice.target : noticeTarget}
                  onChange={(e) => editingNotice
                    ? setEditingNotice({ ...editingNotice, target: e.target.value })
                    : setNoticeTarget(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="all">📣 전체 운영자</option>
                  <option value="약수_스티키플로어">약수_스티키플로어</option>
                  <option value="망원_다시점">망원_다시점</option>
                  <option value="압구정로데오_벤슨 테이스팅 라운지">압구정로데오_벤슨 테이스팅 라운지</option>
                  <option value="서촌_터틀도브">서촌_터틀도브</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox"
                    checked={editingNotice ? editingNotice.isPinned || editingNotice.is_pinned : noticePinned}
                    onChange={(e) => editingNotice
                      ? setEditingNotice({ ...editingNotice, isPinned: e.target.checked })
                      : setNoticePinned(e.target.checked)}
                    className="rounded" />
                  📌 상단 고정
                </label>
                <div className="flex gap-2 ml-auto">
                  {editingNotice && (
                    <button onClick={() => setEditingNotice(null)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">취소</button>
                  )}
                  <button
                    onClick={editingNotice ? handleEditNotice : handleCreateNotice}
                    disabled={editingNotice ? !editingNotice.title || !editingNotice.content : !noticeTitle || !noticeContent}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    {editingNotice ? '수정 완료' : '게시하기'}
                  </button>
                </div>
              </div>
            </div>

            {/* 공지 목록 (게시판 형태) */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {notices.length === 0 ? (
                <div className="text-center py-12 text-gray-400">아직 공지가 없습니다.</div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {notices.map((n: any) => (
                    <div key={n.id} className={`p-4 hover:bg-gray-750 transition ${n.is_pinned ? 'bg-amber-900/10' : ''}`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {n.is_pinned && <span className="text-amber-400 text-xs">📌</span>}
                            <span className="text-white font-medium text-sm">{n.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              n.target === 'all' ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-700 text-gray-400'
                            }`}>{n.target === 'all' ? '전체' : n.target}</span>
                          </div>
                          <p className="text-gray-300 text-sm mt-2 whitespace-pre-wrap line-clamp-3">{n.content}</p>
                          <p className="text-gray-500 text-xs mt-2">{new Date(n.created_at).toLocaleString('ko-KR')}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => setEditingNotice({ ...n, isPinned: n.is_pinned })}
                            className="text-amber-400 hover:text-amber-300 text-xs">수정</button>
                          <button onClick={() => handleDeleteNotice(n.id)}
                            className="text-red-400 hover:text-red-300 text-xs">삭제</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* 신고 관리 */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">🚨 불편 신고</h2>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-gray-400">접수된 신고가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {reports.map((r: any) => (
                  <div key={r.id} className={`bg-gray-800 rounded-lg p-4 border ${
                    r.status === 'pending' ? 'border-red-700/50' : 'border-gray-700'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{r.date} · {r.spot}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          r.status === 'pending' ? 'bg-red-900/50 text-red-300' :
                          r.status === 'reviewed' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-green-900/50 text-green-300'
                        }`}>{r.status === 'pending' ? '미처리' : r.status === 'reviewed' ? '확인' : '처리완료'}</span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">{r.description}</p>
                    {r.person_description && (
                      <p className="text-gray-400 text-xs mt-1">👤 특징: {r.person_description}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-2">신고자: {r.reporter_name} · {new Date(r.created_at).toLocaleString('ko-KR')}</p>
                    {r.admin_note && <p className="text-amber-300 text-xs mt-1">📝 메모: {r.admin_note}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleReportAction(r.id, 'reviewed', '')}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs">확인</button>
                      <button onClick={() => {
                        const note = prompt('처리 메모:');
                        if (note !== null) handleReportAction(r.id, 'resolved', note);
                      }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs">처리완료</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
