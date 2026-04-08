'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatKST, SPOTS } from '@/lib/constants';

export default function AdminPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reservations' | 'logs' | 'members' | 'checkin' | 'trial' | 'feedback' | 'notices' | 'reports' | 'requests' | 'calendar'>('reservations');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberMonths, setNewMemberMonths] = useState('');
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
  const [trialFilter, setTrialFilter] = useState<'all' | 'delivered' | 'not_delivered'>('all');
  const [feedbackData, setFeedbackData] = useState<any>({ feedbacks: [], issues: [] });
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [capacitySaving, setCapacitySaving] = useState(false);
  const [sessionCapacities, setSessionCapacities] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [operatorRequests, setOperatorRequests] = useState<any[]>([]);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [closedDates, setClosedDates] = useState<any[]>([]);
  const [closeDate, setCloseDate] = useState('');
  const [closeSpot, setCloseSpot] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [customCapacities, setCustomCapacities] = useState<any[]>([]);
  const [capDate, setCapDate] = useState('');
  const [capSpot, setCapSpot] = useState('');
  const [capLimit, setCapLimit] = useState('');
  const [defaultCapacity, setDefaultCapacity] = useState(10);
  const [spotNotices, setSpotNotices] = useState<any[]>([]);
  const [notifyName, setNotifyName] = useState('');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [notifySuccess, setNotifySuccess] = useState('');
  const [noticeSpot, setNoticeSpot] = useState('');
  const [noticeText, setNoticeText] = useState('');
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
        body: JSON.stringify({ name: newMemberName, phoneLast4: newMemberPhone, activeMonths: newMemberMonths })
      });

      const data = await res.json();

      if (!res.ok) {
        setMemberError(data.error || '멤버 추가에 실패했습니다.');
        return;
      }

      setMemberSuccess('멤버가 추가되었습니다.');
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberMonths('');
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
        setSheetResult(`✅ 신규 ${data.added}명, 갱신 ${data.updated || 0}명, 스킵 ${data.skipped}명 (전체 ${data.total}명)`);
        fetchMembers(memberSearch);
      }
    } catch (error) {
      setSheetResult('❌ 가져오기 중 오류가 발생했습니다.');
    } finally {
      setSheetLoading(false);
    }
  };

  const fetchTrialTickets = async (filter: 'all' | 'delivered' | 'not_delivered' = trialFilter) => {
    try {
      const res = await fetch(`/api/admin/trial-tickets?delivered=${filter}`);
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

  const handleToggleDelivered = async (id: number, currentStatus: boolean) => {
    try {
      await fetch('/api/admin/trial-tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_delivered: !currentStatus })
      });
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

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/requests');
      if (res.ok) { const data = await res.json(); setOperatorRequests(data.requests); }
    } catch (e) { console.error(e); }
  };

  const handleReplyRequest = async (id: number) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adminReply: replyText.trim() })
      });
      if (res.ok) { setReplyingId(null); setReplyText(''); fetchRequests(); }
    } catch (e) { console.error(e); }
  };

  const handleSendNotify = async () => {
    if (!notifyName || !notifyBody) return;
    setNotifySuccess('');
    try {
      const res = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: notifyName, title: notifyTitle || '📢 웰모먼트 안내', body: notifyBody })
      });
      if (res.ok) {
        setNotifySuccess(`${notifyName}님에게 알림을 보냈습니다.`);
        setNotifyName(''); setNotifyTitle(''); setNotifyBody('');
      }
    } catch (e) { console.error(e); }
  };

  const fetchClosedDates = async () => {
    try {
      const res = await fetch('/api/admin/calendar');
      if (res.ok) setClosedDates((await res.json()).closedDates);
    } catch (e) { console.error(e); }
  };

  const fetchCapacities = async () => {
    try {
      const res = await fetch('/api/admin/capacity');
      if (res.ok) {
        const data = await res.json();
        setCustomCapacities(data.capacities);
        setDefaultCapacity(data.defaultCapacity);
      }
    } catch (e) { console.error(e); }
  };

  const handleSetCapacity = async () => {
    if (!capDate || !capSpot || !capLimit) return;
    try {
      const res = await fetch('/api/admin/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: capDate, spot: capSpot, maxCapacity: parseInt(capLimit) })
      });
      if (res.ok) { setCapDate(''); setCapSpot(''); setCapLimit(''); fetchCapacities(); }
    } catch (e) { console.error(e); }
  };

  const handleResetCapacity = async (date: string, spot: string) => {
    try {
      await fetch(`/api/admin/capacity?date=${date}&spot=${encodeURIComponent(spot)}`, { method: 'DELETE' });
      fetchCapacities();
    } catch (e) { console.error(e); }
  };

  const handleCloseDate = async () => {
    if (!closeDate) return;
    try {
      const res = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: closeDate, spot: closeSpot || null, reason: closeReason })
      });
      if (res.ok) { setCloseDate(''); setCloseSpot(''); setCloseReason(''); fetchClosedDates(); }
    } catch (e) { console.error(e); }
  };

  const handleOpenDate = async (id: number) => {
    try {
      await fetch(`/api/admin/calendar?id=${id}`, { method: 'DELETE' });
      fetchClosedDates();
    } catch (e) { console.error(e); }
  };

  const fetchSpotNotices = async () => {
    try {
      const res = await fetch('/api/admin/spot-notices');
      if (res.ok) setSpotNotices((await res.json()).notices);
    } catch (e) { console.error(e); }
  };

  const handleSaveSpotNotice = async () => {
    if (!noticeSpot) return;
    try {
      await fetch('/api/admin/spot-notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spot: noticeSpot, notice: noticeText })
      });
      setNoticeSpot(''); setNoticeText('');
      fetchSpotNotices();
    } catch (e) { console.error(e); }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await fetch('/api/admin/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, markRead: true })
      });
      fetchRequests();
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
    acc[key].users.push({ name: res.display_id || res.user_name, mode: res.mode || 'smalltalk' });
    return acc;
  }, {} as Record<string, { date: string; spot: string; users: { name: string; mode: string }[] }>);

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
              onClick={() => { setActiveTab('requests'); fetchRequests(); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              📮 요청
            </button>
            <button
              onClick={() => { setActiveTab('calendar'); fetchClosedDates(); fetchCapacities(); fetchSpotNotices(); }}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 whitespace-nowrap ${
                activeTab === 'calendar'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              📅 캘린더
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
                    {group.users.map((user: any, idx: number) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-sm ${
                          user.mode === 'reflection'
                            ? 'bg-indigo-900/50 text-indigo-200 border border-indigo-700/30'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        {user.name}
                        <span className="ml-1 text-xs opacity-60">
                          {user.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}
                        </span>
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
                          {formatKST(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {log.display_id || log.user_name}
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
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-white">멤버 관리</h2>

            {/* ① 매월 운영 가이드 */}
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4">
              <p className="text-amber-200 text-sm font-medium mb-2">📋 매월 멤버십 관리 순서</p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>1️⃣ 스마트스토어에서 이번 달 결제 명단 → 구글시트 업로드 (신규 추가 + 기존 멤버 활성월 자동 갱신)</p>
                <p>2️⃣ 미갱신 멤버 확인 → "만료 멤버 비활성화" 클릭</p>
              </div>
            </div>

            {/* ② 구글 시트 업로드 (메인 동선) */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-3">📊 구글 시트에서 멤버 가져오기</h3>
              <p className="text-xs text-gray-500 mb-3">시트에 "성함"과 "연락처" 컬럼 필요. 이미 등록된 멤버는 이번 달 활성월이 자동 추가돼요.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500"
                  placeholder="구글 스프레드시트 URL" />
                <button onClick={handleImportSheet} disabled={sheetLoading || !sheetUrl}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition active:scale-95">
                  {sheetLoading ? '가져오는 중...' : '가져오기'}
                </button>
              </div>
              {sheetResult && (
                <div className={`mt-3 px-4 py-3 rounded-lg text-sm ${
                  sheetResult.startsWith('✅') ? 'bg-green-900/50 border border-green-700 text-green-200' : 'bg-red-900/50 border border-red-700 text-red-200'
                }`}>{sheetResult}</div>
              )}
            </div>

            {/* ③ 일괄 작업 버튼 */}
            <div className="flex flex-wrap gap-2">
              <button onClick={async () => {
                const month = prompt('활성월을 추가할 월 (예: 2026-04)');
                if (!month || !month.match(/^\d{4}-\d{2}$/)) return;
                if (!confirm(`활성 멤버 전원에게 ${month}을 추가합니다.`)) return;
                let updated = 0;
                for (const m of members as any[]) {
                  if (!m.is_active) continue;
                  const months = m.active_months ? m.active_months.split(',').map((s:string)=>s.trim()) : [];
                  if (!months.includes(month)) {
                    months.push(month);
                    await fetch('/api/admin/members', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id:m.id, activeMonths: months.join(',')}) });
                    updated++;
                  }
                }
                alert(`${updated}명 갱신 완료`); fetchMembers(memberSearch);
              }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition active:scale-95">
                📅 일괄 활성월 추가
              </button>
              <button onClick={async () => {
                const now = new Date();
                const kst = new Date(now.getTime() + 9*60*60*1000 + now.getTimezoneOffset()*60*1000);
                const cm = `${kst.getFullYear()}-${String(kst.getMonth()+1).padStart(2,'0')}`;
                if (!confirm(`${cm} 활성월이 없는 멤버를 비활성화합니다.`)) return;
                let count = 0;
                for (const m of members as any[]) {
                  if (!m.is_active) continue;
                  const months = m.active_months ? m.active_months.split(',').map((s:string)=>s.trim()) : [];
                  if (!months.includes(cm)) {
                    await fetch('/api/admin/members', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id:m.id, isActive:false}) });
                    count++;
                  }
                }
                alert(`${count}명 비활성화`); fetchMembers(memberSearch);
              }} className="px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition active:scale-95">
                🚫 만료 멤버 비활성화
              </button>
            </div>

            {/* ④ 개별 멤버 추가 (접이식) */}
            <details className="bg-gray-800 rounded-xl border border-gray-700">
              <summary className="p-4 text-sm font-medium text-gray-300 cursor-pointer hover:text-white">➕ 개별 멤버 추가</summary>
              <div className="px-4 pb-4">
                <form onSubmit={handleAddMember} className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="이름" required />
                    <input type="text" value={newMemberPhone} onChange={(e) => setNewMemberPhone(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="뒷4자리" maxLength={4} required />
                    <input type="text" value={newMemberMonths} onChange={(e) => setNewMemberMonths(e.target.value)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="활성월 (2026-04)" />
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition active:scale-95">추가</button>
                  </div>
                  {memberError && <p className="text-red-300 text-xs">{memberError}</p>}
                  {memberSuccess && <p className="text-green-300 text-xs">{memberSuccess}</p>}
                </form>
              </div>
            </details>

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

            {/* 멤버 통계 + 필터 */}
            {members.length > 0 && (() => {
              const now = new Date();
              const kst = new Date(now.getTime() + 9*60*60*1000 + now.getTimezoneOffset()*60*1000);
              const nextMonth = `${kst.getFullYear()}-${String(kst.getMonth()+2).padStart(2,'0')}`;
              const curMonth = `${kst.getFullYear()}-${String(kst.getMonth()+1).padStart(2,'0')}`;
              const activeCount = (members as any[]).filter(m => m.is_active).length;
              const noNextMonth = (members as any[]).filter(m => m.is_active && m.active_months && !m.active_months.split(',').map((s:string)=>s.trim()).includes(nextMonth)).length;
              return (
                <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700 flex flex-wrap gap-3 items-center text-xs">
                  <span className="text-gray-400">총 <strong className="text-white">{members.length}</strong>명</span>
                  <span className="text-green-400">활성 <strong>{activeCount}</strong></span>
                  <span className="text-red-400">{nextMonth} 미갱신 <strong>{noNextMonth}</strong></span>
                </div>
              );
            })()}

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
                        활성 월
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        추가일
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
                          <input type="text" defaultValue={member.active_months || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (member.active_months || '')) {
                                fetch('/api/admin/members', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: member.id, activeMonths: e.target.value })
                                }).then(() => fetchMembers(memberSearch));
                              }
                            }}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white"
                            placeholder="2026-04,2026-05" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                          {member.created_at ? (() => {
                            const d = new Date(member.created_at.includes('T') ? member.created_at : member.created_at + 'Z');
                            const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                            return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth()+1).padStart(2,'0')}-${String(kst.getUTCDate()).padStart(2,'0')}`;
                          })() : '-'}
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
                          {r.checked_at ? formatKST(r.checked_at) : '-'}
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

            {/* 전달 상태 필터 */}
            <div className="flex gap-2">
              {(['all', 'not_delivered', 'delivered'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setTrialFilter(f); fetchTrialTickets(f); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    trialFilter === f
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {f === 'all' ? '전체' : f === 'delivered' ? '전달 완료' : '미전달'}
                </button>
              ))}
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">코드</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">사용 상태</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">전달</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">사용자</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">예약 정보</th>
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
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleToggleDelivered(t.id, !!t.is_delivered)}
                            className={`px-2 py-1 rounded text-xs transition ${
                              t.is_delivered
                                ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            {t.is_delivered ? '✓ 전달완료' : '미전달'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">{t.name || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {t.reservation ? (
                            <div className="text-xs">
                              <div className="text-gray-300 font-medium">{t.reservation.date}</div>
                              <div className="text-gray-400">{t.reservation.spot}</div>
                              <div className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${
                                t.reservation.mode === 'reflection' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-gray-700 text-gray-300'
                              }`}>
                                {t.reservation.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </td>
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
                  <div className="text-xs text-gray-500 mt-2">{formatKST(f.created_at)}</div>
                </div>
              ))}
              {feedbackData.feedbacks.length === 0 && <div className="text-center py-12 text-gray-400">피드백이 없습니다.</div>}
            </div>
          </div>
        )}
        {/* 요청사항 관리 */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">📮 요청사항</h2>
            <p className="text-gray-400 text-sm">멤버 및 스팟 운영자가 보낸 건의/요청사항입니다.</p>

            {operatorRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">요청사항이 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {operatorRequests.map((r: any) => (
                  <div key={r.id} className={`bg-gray-800 rounded-lg p-4 border ${r.is_read ? 'border-gray-700' : 'border-emerald-600/50 bg-emerald-900/10'}`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{r.user_name}</span>
                      {(SPOTS as readonly string[]).includes(r.user_name) ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/30">🏠 스팟 운영자</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 border border-blue-700/30">👤 멤버</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/30">
                        {{ general: '일반', space: '공간', program: '프로그램', service: '서비스', supply: '비품', schedule: '일정', issue: '문제', etc: '기타' }[r.category as string] || r.category}
                      </span>
                      {r.spot && !(SPOTS as readonly string[]).includes(r.user_name) && <span className="text-xs text-gray-500">{r.spot}</span>}
                      {!r.is_read && <span className="text-xs px-1.5 py-0.5 bg-red-600 text-white rounded">NEW</span>}
                      <span className="text-xs text-gray-600 ml-auto">{formatKST(r.created_at)}</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{r.content}</p>

                    {r.admin_reply && (
                      <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 mt-2">
                        <p className="text-xs text-amber-300 mb-1">💬 답변</p>
                        <p className="text-gray-300 text-sm">{r.admin_reply}</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      {replyingId === r.id ? (
                        <div className="w-full space-y-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 min-h-[60px] resize-y"
                            placeholder="답변 작성..."
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleReplyRequest(r.id)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm">답변 저장</button>
                            <button onClick={() => { setReplyingId(null); setReplyText(''); }} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">취소</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => { setReplyingId(r.id); setReplyText(r.admin_reply || ''); }} className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-700 text-white rounded-lg text-xs">
                            {r.admin_reply ? '답변 수정' : '답변 작성'}
                          </button>
                          {!r.is_read && (
                            <button onClick={() => handleMarkRead(r.id)} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs">읽음 처리</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* 캘린더 관리 */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">📅 캘린더 관리</h2>
            <p className="text-gray-400 text-sm">특정 날짜 또는 스팟을 닫을 수 있습니다.</p>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">날짜</label>
                  <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">스팟 (비우면 전체 닫기)</label>
                  <select value={closeSpot} onChange={(e) => setCloseSpot(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                    <option value="">전체 (모든 스팟)</option>
                    {(SPOTS as readonly string[]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">사유 (선택)</label>
                  <input type="text" value={closeReason} onChange={(e) => setCloseReason(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    placeholder="예: 스팟 사정으로 휴무" />
                </div>
              </div>
              <button onClick={handleCloseDate} disabled={!closeDate}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                🚫 날짜 닫기
              </button>
            </div>

            {/* 인원 제한 */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
              <h3 className="text-sm font-medium text-white">👥 날짜별 인원 제한 <span className="text-gray-500 font-normal">(기본: {defaultCapacity}명)</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">날짜</label>
                  <input type="date" value={capDate} onChange={(e) => setCapDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">스팟</label>
                  <select value={capSpot} onChange={(e) => setCapSpot(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                    <option value="">스팟 선택</option>
                    {(SPOTS as readonly string[]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">최대 인원</label>
                  <input type="number" value={capLimit} onChange={(e) => setCapLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    placeholder={`기본 ${defaultCapacity}명`} min="1" max="50" />
                </div>
              </div>
              <button onClick={handleSetCapacity} disabled={!capDate || !capSpot || !capLimit}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                👥 인원 설정
              </button>

              {customCapacities.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs text-gray-400">설정된 인원 제한</p>
                  {customCapacities.map((c: any) => (
                    <div key={`${c.date}_${c.spot}`} className="bg-gray-700/50 rounded-lg p-2.5 flex justify-between items-center">
                      <div>
                        <span className="text-white text-sm">{c.date}</span>
                        <span className="text-gray-400 text-xs ml-2">{c.spot}</span>
                        <span className="text-amber-300 text-xs ml-2 font-medium">{c.max_capacity}명</span>
                      </div>
                      <button onClick={() => handleResetCapacity(c.date, c.spot)}
                        className="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded text-xs">
                        기본값 복원
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 스팟별 안내 메시지 */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
              <h3 className="text-sm font-medium text-white">ℹ️ 스팟별 안내 메시지</h3>
              <p className="text-xs text-gray-500">멤버가 스팟 선택 시 보이는 안내입니다. (비우면 삭제)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={noticeSpot} onChange={(e) => {
                  setNoticeSpot(e.target.value);
                  const existing = spotNotices.find((n: any) => n.spot === e.target.value);
                  setNoticeText(existing?.notice || '');
                }} className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">스팟 선택</option>
                  {(SPOTS as readonly string[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="text" value={noticeText} onChange={(e) => setNoticeText(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  placeholder="예: 수요일은 8시에 맞춰 오픈합니다" />
              </div>
              <button onClick={handleSaveSpotNotice} disabled={!noticeSpot}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                저장
              </button>
              {spotNotices.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {spotNotices.map((n: any) => (
                    <div key={n.id} className="bg-gray-700/50 rounded-lg p-2.5 flex justify-between items-center">
                      <div>
                        <span className="text-gray-300 text-xs">{n.spot}</span>
                        <span className="text-amber-300 text-xs ml-2">ℹ️ {n.notice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {closedDates.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-300">닫힌 날짜</h3>
                {closedDates.map((c: any) => (
                  <div key={c.id} className="bg-gray-800 rounded-lg p-3 border border-red-800/30 flex justify-between items-center">
                    <div>
                      <span className="text-white font-medium text-sm">{c.date}</span>
                      <span className="text-gray-400 text-xs ml-2">{c.spot || '전체'}</span>
                      {c.reason && <span className="text-gray-500 text-xs ml-2">({c.reason})</span>}
                    </div>
                    <button onClick={() => handleOpenDate(c.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs">
                      다시 열기
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">닫힌 날짜가 없습니다.</div>
            )}

            {/* 멤버에게 개별 알림 */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
              <h3 className="text-sm font-medium text-white">🔔 멤버에게 알림 보내기</h3>
              {notifySuccess && <p className="text-green-300 text-xs">{notifySuccess}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">멤버 이름</label>
                  <input type="text" value={notifyName} onChange={(e) => setNotifyName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    placeholder="이름 정확히 입력" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">제목 (선택)</label>
                  <input type="text" value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    placeholder="기본: 📢 웰모먼트 안내" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">내용</label>
                <textarea value={notifyBody} onChange={(e) => setNotifyBody(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm min-h-[60px] resize-y"
                  placeholder="멤버에게 전달할 안내 내용" />
              </div>
              <button onClick={handleSendNotify} disabled={!notifyName || !notifyBody}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                🔔 알림 보내기
              </button>
            </div>

            {/* 미예약자 마케팅 푸시 */}
            <div className="bg-orange-900/30 rounded-lg p-4 border border-orange-700/50 space-y-3">
              <h3 className="text-sm font-medium text-orange-100">📢 미예약자 마케팅 푸시</h3>
              <p className="text-xs text-orange-200/70">특정 날짜에 예약하지 않은 모든 멤버에게 알림 보내기</p>
              <button
                onClick={async () => {
                  const date = prompt('날짜 (YYYY-MM-DD):', '2026-04-08');
                  if (!date) return;
                  
                  const title = '🌿 오늘 타임오프클럽은 어때요?';
                  const spots = ['다시점 (한적한 사색)', '벤슨 테이스팅 라운지 (품격있는 대화)'];
                  const body = `아직 예약하지 않으셨네요! 특히 ${spots.join(', ')}에서 좋은 대화를 나눌 수 있어요 ✨ 오늘 저녁 어떠세요?`;
                  
                  if (!confirm(`미예약자 마케팅 푸시 발송\n날짜: ${date}\n제목: ${title}\n내용: ${body}\n\n발송하시겠습니까?`)) return;
                  
                  try {
                    const response = await fetch('/api/admin/push-unreserved', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ date, title, body })
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert(`미예약자 마케팅 푸시 발송 완료! 🎉\n\n대상: ${result.sent}/${result.total}명\n예시: ${result.members?.join(', ')}등...\n\n이제 예약 증가를 모니터링해주세요!`);
                    } else {
                      alert('오류: ' + result.error);
                    }
                  } catch (e) {
                    alert('발송 실패: ' + e);
                  }
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition"
              >
                📢 미예약자 푸시 보내기
              </button>
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
                          <p className="text-gray-500 text-xs mt-2">{formatKST(n.created_at)}</p>
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
                    <p className="text-gray-500 text-xs mt-2">신고자: {r.reporter_name} · {formatKST(r.created_at)}</p>
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
