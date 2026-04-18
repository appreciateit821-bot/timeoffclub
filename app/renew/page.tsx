'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RenewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canSubmit = !!name.trim() && phoneLast4.trim().length === 4 && !!orderId.trim();

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phoneLast4: phoneLast4.trim(), smartstoreOrderId: orderId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.notFound) {
          setError(data.error + '\n\n처음 이용하시나요? 가입 신청을 먼저 해주세요.');
        } else {
          setError(data.error || '오류가 발생했습니다.');
        }
        return;
      }
      setSuccess(data.message);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-amber-800 mb-3">{success}</h1>
          <p className="text-gray-500 text-sm mb-6">로그인 후 예약 가능합니다.</p>
          <button onClick={() => router.push('/login')}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition">
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-amber-800 mb-2">멤버십 갱신</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            이미 가입된 멤버가 다음 달 멤버십을 갱신할 때 사용합니다.<br/>
            스마트스토어에서 새로 결제한 주문번호를 입력해주세요.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-300 shadow-sm p-5 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">성함</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">연락처 뒷 4자리</label>
            <input value={phoneLast4} onChange={e => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric" maxLength={4}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">새 주문번호</label>
            <p className="text-[11px] text-gray-500 mb-2">네이버 스마트스토어 마이페이지 → 주문내역에서 확인</p>
            <input value={orderId} onChange={e => setOrderId(e.target.value)}
              placeholder="2026011234567801"
              className="w-full px-3 py-3 bg-white border border-gray-200 rounded-lg text-gray-800 text-base font-mono focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-600 whitespace-pre-line leading-relaxed">
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit || submitting}
          className={`w-full py-4 rounded-xl font-bold text-base transition ${
            canSubmit && !submitting
              ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}>
          {submitting ? '확인 중...' : '멤버십 갱신하기'}
        </button>

        <div className="text-center mt-4 space-y-2">
          <button onClick={() => router.push('/login')}
            className="text-[11px] text-gray-500 underline hover:text-gray-600">
            ← 로그인 페이지로 돌아가기
          </button>
          <p className="text-[11px] text-gray-500">문의: 카카오톡 well__moment</p>
        </div>
      </div>
    </div>
  );
}
