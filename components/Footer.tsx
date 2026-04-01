export default function Footer() {
  return (
    <footer className="bg-gray-900/80 backdrop-blur border-t border-gray-800 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* 운영 안내 */}
          <div>
            <h3 className="text-lg font-bold text-amber-300 mb-4">운영 안내</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">📅</span>
                <span>원하는 일정과 스팟에 <strong className="text-amber-200">횟수 제한 없이</strong> 참여 가능</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">⏱️</span>
                <span>1회 <strong className="text-amber-200">2시간</strong> 진행</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">✏️</span>
                <span>예약 신청·변경·취소는 세션 시작 <strong className="text-amber-200">2시간 전까지</strong> 가능</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">⚠️</span>
                <span>노쇼 시 <strong className="text-red-300">패널티가 부과</strong>됩니다</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">☕</span>
                <span>타임오프클럽 전용 할인 적용, <strong className="text-amber-200">1인 1음료</strong> 주문 원칙</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">📵</span>
                <span>입장 시 <strong className="text-amber-200">스마트폰 보관함</strong>에 스마트폰을 맡겨주세요</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">🔔</span>
                <span>종료 <strong className="text-amber-200">10분 전</strong> 안내가 나갑니다</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">👥</span>
                <span>참석 인원과 관계없이 진행됩니다. <strong className="text-amber-200">예약 현황은 언제든지</strong> 확인 가능합니다</span>
              </p>
            </div>
          </div>

          {/* 문의 */}
          <div>
            <h3 className="text-lg font-bold text-amber-300 mb-4">문의</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <span className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <span>카카오톡: well__moment</span>
              </span>
              <a
                href="https://www.instagram.com/well__moment"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-amber-400 transition"
              >
                <span className="text-lg">📸</span>
                <span>인스타그램 DM</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} 타임오프클럽 by 웰모먼트
          </p>
        </div>
      </div>
    </footer>
  );
}
