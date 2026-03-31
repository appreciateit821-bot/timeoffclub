'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from '@/components/Calendar';
import SpotSelector from '@/components/SpotSelector';
import ReservationList from '@/components/ReservationList';
import Footer from '@/components/Footer';

export default function CalendarPage() {
  const [user, setUser] = useState<{ name: string; isAdmin: boolean; isTrial?: boolean; phoneLast4?: string; activeMonths?: string } | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
    fetchReservations();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) setNotifications((await res.json()).notifications);
    } catch (e) {}
  };

  const dismissNotifications = async () => {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    setNotifications([]);
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/reservations');
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
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

  const handleReservationComplete = () => {
    setSelectedDates([]);
    fetchReservations();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur border-b border-amber-800/30 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-amber-100 whitespace-nowrap">타임오프클럽</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 whitespace-nowrap">{user?.name}님, 환영합니다</p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
              <button
                onClick={() => router.push('/my-history')}
                className="px-3 py-1.5 sm:py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition text-xs sm:text-sm font-medium"
              >
                🧘 나의 타임오프
              </button>
              <button
                onClick={() => router.push('/guide')}
                className="px-3 py-1.5 sm:py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition text-xs sm:text-sm font-medium"
              >
                📖 스몰토크 가이드
              </button>
              <button
                onClick={() => router.push('/feedback')}
                className="px-3 py-1.5 sm:py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition text-xs sm:text-sm font-medium"
              >
                💬 피드백
              </button>
              {user?.isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-3 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-xs sm:text-sm font-medium"
                >
                  관리자
                </button>
              )}
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

      {/* 알림 배너 */}
      {notifications.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {notifications.map((n: any) => (
            <div key={n.id} className="bg-amber-900/30 border border-amber-700/40 rounded-xl p-4 mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-amber-200 text-sm font-medium">{n.title}</p>
                <p className="text-gray-300 text-xs mt-1">{n.body}</p>
              </div>
            </div>
          ))}
          <button onClick={dismissNotifications} className="text-xs text-gray-500 hover:text-gray-400 mt-1">
            모두 확인
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Calendar & Spot Selector */}
          <div className="space-y-6">
            <Calendar
              selectedDates={selectedDates}
              onDatesChange={setSelectedDates}
              activeMonths={user?.activeMonths}
              isTrial={user?.phoneLast4?.startsWith('T-') || false}
            />

            {selectedDates.length > 0 && (
              <SpotSelector
                selectedDates={selectedDates}
                userName={user?.name || ''}
                isTrial={user?.phoneLast4?.startsWith('T-') || false}
                onComplete={handleReservationComplete}
              />
            )}
          </div>

          {/* Right Column - Reservations */}
          <div>
            <ReservationList
              reservations={reservations}
              userName={user?.name || ''}
              onUpdate={fetchReservations}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
