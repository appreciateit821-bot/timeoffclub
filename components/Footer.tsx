export default function Footer() {
  return (
    <footer className="bg-gray-900/80 backdrop-blur border-t border-gray-800 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* 운영 안내 */}
          <div>
            <h3 className="text-lg font-bold text-amber-300 mb-4">운영 안내</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>1회 2시간 진행</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>한 달간 최대 8회까지 참여 가능</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>예약 변경/취소는 2시간 전까지 가능</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>현장에서 1인 1음료 주문 원칙</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>4인 미만일 경우 다른 스팟으로 안내 요청 가능</span>
              </p>
            </div>
          </div>

          {/* 문의 */}
          <div>
            <h3 className="text-lg font-bold text-amber-300 mb-4">문의</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <a
                href="https://pf.kakao.com/_well__moment"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-amber-400 transition"
              >
                <span className="text-lg">💬</span>
                <span>카카오톡: well__moment</span>
              </a>
              <a
                href="https://www.instagram.com/direct/inbox/"
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
            © {new Date().getFullYear()} 타임오프클럽. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
