'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const AGE_GENDER_OPTIONS = [
  '10대 남성', '10대 여성',
  '20대 남성', '20대 여성',
  '30대 남성', '30대 여성',
  '40대 남성', '40대 여성',
  '기타',
];

const REASONS = [
  { key: 'Digital OFF', label: '핸드폰 없이 오롯이 나에게 집중하는 시간 (Digital OFF)' },
  { key: 'Resume OFF', label: '직업, 배경을 묻지 않는 편안한 대화 (Resume OFF)' },
  { key: 'Silence', label: '말하지 않아도 어색하지 않은 침묵의 존중 (Silence)' },
  { key: 'Routine', label: '일주일에 1~2회 나를 위해 꺼내 쓰는 휴식의 리듬 (Routine)' },
  { key: 'Connection', label: '건강한 삶의 태도를 가진 사람들과의 안전한 연결 (Connection)' },
  { key: 'Solitude', label: '읽고, 쓰고, 멍하니 — 방해받지 않는 나만의 시간 (Solitude)' },
];

const OFF_MANNER_RULES = [
  { icon: '📵', key: 'Digital OFF', desc: '입장 시 스마트폰을 보관함에 맡기고 현재에 집중합니다.' },
  { icon: '🙈', key: 'Resume OFF', desc: "타인의 직업, 나이, 배경을 묻지 않고 '진짜 나'로 머뭅니다." },
  { icon: '🎯', key: 'Outcome OFF', desc: '조언이나 해결책 대신 다정한 공감만을 나눕니다.' },
  { icon: '🤫', key: 'Silence', desc: '침묵을 선택한 메이트의 시간도 기꺼이 존중하고 배려합니다.' },
];

function OnboardingContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [name, setName] = useState(sp.get('name') || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [ageGender, setAgeGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [selfIntro, setSelfIntro] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [reasonOther, setReasonOther] = useState('');
  const [expectation, setExpectation] = useState('');
  const [agreeOffManner, setAgreeOffManner] = useState(false);
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [smartstoreOrderId, setSmartstoreOrderId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [doneStatus, setDoneStatus] = useState<'approved' | 'pending' | null>(null);

  // 뒷4자리가 전달됐으면 전화번호 마지막 4자리 채우기 안내
  const last4Hint = sp.get('phoneLast4') || '';

  const toggleReason = (k: string) =>
    setReasons(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const canSubmit =
    !!name.trim() && !!phone.trim() && !!email.trim() && !!ageGender &&
    !!occupation.trim() && !!selfIntro.trim() && reasons.length > 0 &&
    !!expectation.trim() && agreeOffManner && agreePolicy && agreePrivacy &&
    !!smartstoreOrderId.trim();

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    const phoneFormatted = phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (!confirm(`입력하신 연락처가 ${phoneFormatted} 맞으신가요?\n\n멤버십 공지 문자를 받으실 번호입니다.`)) return;

    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, email, ageGender, occupation, selfIntro,
          reasons, reasonOther, expectation,
          agreeOffManner, agreePolicy, agreePrivacy,
          smartstoreOrderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const full = [data.error, data.hint].filter(Boolean).join('\n\n');
        setError(full || '제출 중 오류가 발생했습니다.');
        return;
      }
      setDoneStatus(data.status);
      if (data.status === 'approved' && data.redirectUrl) {
        setTimeout(() => router.push(data.redirectUrl), 1500);
      }
    } catch (e) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (doneStatus === 'approved') {
    return (
      <Centered>
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-amber-800 mb-3">가입 완료!</h1>
        <p className="text-gray-300 text-sm">잠시 후 예약 페이지로 이동합니다...</p>
      </Centered>
    );
  }

  if (doneStatus === 'pending') {
    return (
      <Centered>
        <div className="text-5xl mb-4">📮</div>
        <h1 className="text-xl font-bold text-amber-800 mb-3">가입 신청이 접수됐어요</h1>
        <p className="text-gray-300 text-sm leading-relaxed mb-6">
          운영진이 주문번호와 정보를 확인한 후 승인 안내드립니다.<br />
          보통 1~2영업일 이내 연락드려요.
        </p>
        <p className="text-gray-500 text-xs">
          궁금한 점은 카카오톡 <span className="text-amber-600">well__moment</span>로 문의해주세요.
        </p>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] px-4 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-amber-800 mb-2">타임오프클럽 가입 신청</h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            타임오프 클럽은 <strong className="text-amber-700">익명</strong>으로 운영되지만,<br className="sm:hidden"/>
            안전한 커뮤니티를 위해 신뢰할 수 있는 정보를 확인합니다.<br/>
            응답 내용은 운영진만 확인하며 외부로 공개되지 않습니다 💜
          </p>
          <button
            onClick={() => router.push('/login')}
            className="text-[11px] text-gray-500 underline hover:text-gray-400 mt-3"
          >
            ← 로그인 페이지로 돌아가기
          </button>
        </div>

        {/* 기본 정보 */}
        <Section title="1. 기본 정보" badge="필수">
          <Field label="성함">
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-amber-500" />
          </Field>
          <Field label="연락처" hint="타임오프클럽 공지 문자를 받을 번호. 전체 번호를 입력해주세요.">
            <input value={phone} onChange={e => setPhone(e.target.value)}
              inputMode="tel"
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-amber-500" />
          </Field>
          <Field label="이메일">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com"
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-amber-500" />
          </Field>
          <Field label="연령대 / 성별">
            <div className="grid grid-cols-3 gap-2">
              {AGE_GENDER_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => setAgeGender(opt)}
                  className={`py-2 rounded-lg text-xs font-medium transition border ${
                    ageGender === opt ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white border-gray-300 text-gray-600'
                  }`}>{opt}</button>
              ))}
            </div>
          </Field>
          <Field label="하시는 일">
            <input value={occupation} onChange={e => setOccupation(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-amber-500" />
          </Field>
          <Field label="본인에 대해 소개해주세요" hint="성과와 효능감을 증명하지 않아도 되는 공간입니다. 편하게 있는 그대로 💜">
            <textarea value={selfIntro} onChange={e => setSelfIntro(e.target.value)} rows={5}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </Field>
        </Section>

        {/* 지원 동기 & 기대 */}
        <Section title="2. 지원 동기 & 기대" badge="필수">
          <Field label="웰모먼트 타임오프 클럽을 선택한 이유는?" hint="중복 선택 가능">
            <div className="space-y-2">
              {REASONS.map(r => (
                <label key={r.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  reasons.includes(r.key) ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-300'
                }`}>
                  <input type="checkbox" checked={reasons.includes(r.key)} onChange={() => toggleReason(r.key)}
                    className="mt-0.5 w-4 h-4 accent-amber-500" />
                  <span className="text-xs text-gray-200 leading-relaxed">{r.label}</span>
                </label>
              ))}
              <input value={reasonOther} onChange={e => setReasonOther(e.target.value)} placeholder="기타 (직접 입력)"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 text-xs focus:outline-none focus:border-amber-500" />
            </div>
          </Field>
          <Field label="기대하는 모임 혹은 휴식의 형태는?" hint="아이디어를 제안해 주셔도 좋습니다 :-)">
            <textarea value={expectation} onChange={e => setExpectation(e.target.value)} rows={4}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </Field>
        </Section>

        {/* 오프 매너 동의 */}
        <Section title="3. 오프 매너 동의" badge="필수">
          <p className="text-xs text-gray-400 mb-3">아래 4가지 오프 매너를 읽고 준수에 동의해주세요.</p>
          <div className="space-y-2 mb-4">
            {OFF_MANNER_RULES.map(r => (
              <div key={r.key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-lg">{r.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-amber-700">{r.key}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <ConsentBox checked={agreeOffManner} onChange={setAgreeOffManner}
            label="네, 위 4가지 오프 매너를 준수하겠습니다." />
        </Section>

        {/* 운영 정책 */}
        <Section title="4. 운영 정책 및 서비스 이용 안내" badge="필수">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-xs leading-relaxed text-gray-300 max-h-64 overflow-y-auto space-y-3">
            <div>
              <p className="text-amber-200 font-semibold mb-1">1. 멤버십 및 환불 정책</p>
              <p>• <strong>참여 횟수</strong>: 한 달간 매주 수요일 저녁 8시, 일요일 오후 3시 횟수 제한 없이 자유롭게 참여 가능합니다.</p>
              <p className="text-red-600">• <strong>⚠️ 환불 규정</strong>: 질문지 제출 이후 환불이 <strong>절대 불가</strong>합니다.</p>
              <p>• <strong>양도 불가</strong>: 멤버십은 본인에게만 해당하며 타인에게 양도/대여할 수 없습니다.</p>
            </div>
            <div>
              <p className="text-amber-200 font-semibold mb-1">2. 모임 운영 및 인원 기준</p>
              <p>• 각 스팟 최대 10명 기준, 최소 인원 없이 운영. 인원 적어도 세션은 진행됩니다.</p>
              <p>• 예약 변경/취소는 세션 2시간 전까지. <strong>노쇼 2회 이상 시 이용 제한</strong>.</p>
              <p>• 별도 모임장 없이 멤버 자율로 운영됩니다.</p>
            </div>
            <div>
              <p className="text-amber-200 font-semibold mb-1">3. 스팟 이용 수칙</p>
              <p>• 현장에서 <strong>1인 1음료 주문 원칙</strong> (멤버 전용 할인 메뉴 제공).</p>
              <p>• 정시 입장 권장. 늦으시면 입장 제한될 수 있습니다.</p>
            </div>
            <div>
              <p className="text-amber-200 font-semibold mb-1">4. 오프 매너 및 안전</p>
              <p>• 입장 시 스마트폰 보관함에 맡김.</p>
              <p>• 비즈니스 영업, 종교 포교, 무례한 언행 적발 시 <strong>경고 없이 즉시 멤버십 박탈</strong> (환불 불가).</p>
              <p>• 개인 소지품 분실/부주의로 인한 사고는 운영측이 책임지기 어렵습니다.</p>
            </div>
          </div>
          <ConsentBox checked={agreePolicy} onChange={setAgreePolicy}
            label="위 운영 정책 및 서비스 이용 안내를 모두 확인했으며, 이에 동의합니다." />
        </Section>

        {/* 개인정보 수집 동의 */}
        <Section title="5. 개인정보 수집 및 이용 동의" badge="필수">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-xs leading-relaxed text-gray-300 max-h-56 overflow-y-auto space-y-2">
            <p>• <strong>수집 주체</strong>: 웰모먼트 (wellmoment)</p>
            <p>• <strong>수집 항목</strong>: 성함, 연락처, 이메일, 본인 키워드 및 설문 응답 내용</p>
            <p>• <strong>이용 목적</strong>:</p>
            <p className="pl-3">- 멤버 선별 및 승인 절차 진행</p>
            <p className="pl-3">- 본인 확인 및 긴급 연락처 확보</p>
            <p className="pl-3">- 모임 확정 안내 및 공지사항 전달</p>
            <p className="pl-3">- 안전한 커뮤니티 관리 및 서비스 품질 개선</p>
            <p>• <strong>보유 기간</strong>: 회원 자격 유지 기간 + 서비스 종료일로부터 1년 (관련 법령에 따라 보존)</p>
            <p>• <strong>동의 거부 권리</strong>: 거부 시 멤버십 승인 및 서비스 이용이 제한될 수 있습니다.</p>
          </div>
          <ConsentBox checked={agreePrivacy} onChange={setAgreePrivacy}
            label="개인정보 수집 및 이용에 동의합니다." />
        </Section>

        {/* 스마트스토어 주문번호 */}
        <Section title="6. 스마트스토어 주문번호" badge="필수">
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            본인 확인을 위해 필요합니다. 네이버 스마트스토어 <strong className="text-amber-700">마이페이지 → 주문내역</strong>에서 확인하세요.<br/>
            형식 예: <span className="font-mono text-amber-700">2026011234567801</span>
          </p>
          <input value={smartstoreOrderId} onChange={e => setSmartstoreOrderId(e.target.value)}
            placeholder="주문번호 입력"
            className="w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 text-base font-mono focus:outline-none focus:border-amber-500" />
        </Section>

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
          {submitting ? '제출 중...' : '가입 신청하기'}
        </button>

        <p className="text-center text-[11px] text-gray-500 mt-4">
          문의: 카카오톡 well__moment
        </p>
      </div>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold text-amber-800">{title}</h2>
        {badge && <span className="text-[10px] px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-300 rounded-full">{badge}</span>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-1.5">{label}</label>
      {hint && <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function ConsentBox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition ${
      checked ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-300'
    }`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 w-5 h-5 accent-amber-500" />
      <span className="text-sm text-gray-200 leading-relaxed">{label}</span>
    </label>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0] px-4">
      <div className="max-w-md text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        {children}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<Centered><p className="text-gray-400">로딩 중...</p></Centered>}>
      <OnboardingContent />
    </Suspense>
  );
}
