'use client';

import { useState } from 'react';
import { SPOTS, isBookingClosed, getTodayKST } from '@/lib/constants';

interface Reservation {
  id: number;
  user_name: string;
  date: string;
  spot: string;
  created_at: string;
  confirmed?: number;
  mode?: string;
  memo?: string;
}

interface ReservationListProps {
  reservations: Reservation[];
  userName: string;
  onUpdate: () => void;
}

export default function ReservationList({ reservations, userName, onUpdate }: ReservationListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newSpot, setNewSpot] = useState<string>('');
  const [newMemo, setNewMemo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const isToday = (dateStr: string) => {
    return dateStr === getTodayKST();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 취소하시겠습니까?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/reservations?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.error || '취소 중 오류가 발생했습니다.');
      }
    } catch (error) {
      alert('취소 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (reservation: Reservation) => {
    setEditingId(reservation.id);
    setNewSpot(reservation.spot);
    setNewMemo(reservation.memo || '');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setNewSpot('');
  };

  const handleEditSave = async (id: number) => {
    if (!newSpot) return;

    setLoading(true);
    try {
      const res = await fetch('/api/reservations/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, spot: newSpot, memo: newMemo })
      });

      if (res.ok) {
        setEditingId(null);
        setNewSpot('');
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.error || '변경 중 오류가 발생했습니다.');
      }
    } catch (error) {
      alert('변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const sortedReservations = [...reservations].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-gray-800/80 backdrop-blur rounded-xl p-6 border border-amber-800/30 shadow-lg">
      <h2 className="text-xl font-bold text-amber-100 mb-4">내 예약</h2>

      {sortedReservations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          아직 예약이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-gray-700 rounded-lg p-4 border border-gray-600"
            >
              {editingId === reservation.id ? (
                // 편집 모드
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-400 mb-2">날짜</div>
                    <div className="text-white font-medium">{reservation.date}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-2">스팟 변경</div>
                    <select
                      value={newSpot}
                      onChange={(e) => setNewSpot(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {SPOTS.map(spot => (
                        <option key={spot} value={spot}>{spot}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-2">메모 수정</div>
                    <input type="text" value={newMemo} onChange={(e) => setNewMemo(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm placeholder-gray-400"
                      placeholder="오늘 나누고 싶은 대화..." maxLength={100} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSave(reservation.id)}
                      disabled={loading}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg transition disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      onClick={handleEditCancel}
                      disabled={loading}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition disabled:opacity-50"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                // 일반 모드
                (() => {
                  const closed = isBookingClosed(reservation.date);
                  return (
                    <>
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-lg font-semibold text-white">{reservation.date}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            reservation.mode === 'reflection' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'
                          }`}>{reservation.mode === 'reflection' ? '🧘 사색' : '💬 스몰토크'}</span>
                          {closed && (
                            <span className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded text-[10px] font-medium">마감</span>
                          )}
                        </div>
                        <div className="text-gray-300">{reservation.spot}</div>
                        {reservation.memo && (
                          <p className="text-gray-400 text-xs mt-1 italic">💭 "{reservation.memo}"</p>
                        )}
                      </div>
                      {/* 세션 준비 링크 (당일) */}
                      {isToday(reservation.date) && (
                        <a
                          href={`/session-ready?date=${reservation.date}&spot=${encodeURIComponent(reservation.spot)}`}
                          className="w-full mb-2 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-medium text-sm text-center block transition active:scale-95"
                        >
                          🌿 오늘의 타임오프 준비하기
                        </a>
                      )}

                      <div className="flex gap-2">
                        <a
                          href={`/api/reservations/ics?date=${reservation.date}&spot=${encodeURIComponent(reservation.spot)}`}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition text-sm text-center active:scale-95"
                        >
                          📅 캘린더
                        </a>
                        {!closed && (
                          <>
                            <button
                              onClick={() => handleEditStart(reservation)}
                              disabled={loading}
                              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg transition text-sm disabled:opacity-50 active:scale-95"
                            >
                              변경
                            </button>
                            <button
                              onClick={() => handleDelete(reservation.id)}
                              disabled={loading}
                              className="flex-1 bg-red-600/80 hover:bg-red-700 text-white py-2 rounded-lg transition text-sm disabled:opacity-50 active:scale-95"
                            >
                              취소
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
