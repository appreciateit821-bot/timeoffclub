import { useState } from "react";

const SAMPLE_DATA = {
  date: "2026.04.06",
  day: "SUNDAY",
  spot: "서촌 터틀도브",
  time: "15:00 — 17:00",
  mode: "스몰토크",
  detoxHours: 2,
  quote: "오늘 처음으로\n아무 생각 없이 웃었다",
  totalHours: 12,
  visits: 6,
  level: "새싹",
};

function ReceiptLight({ data }) {
  return (
    <div
      style={{
        width: 360,
        minHeight: 640,
        background: "#FCF9F3",
        borderRadius: 16,
        padding: "48px 32px",
        fontFamily: "'Courier New', monospace",
        position: "relative",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      {/* Top dashed line */}
      <div style={{ borderTop: "2px dashed #D2C8B9", marginBottom: 24 }} />

      {/* Brand */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div
          style={{
            fontSize: 16,
            letterSpacing: 4,
            color: "#AFA594",
            fontFamily: "'Courier New', monospace",
          }}
        >
          TIMEOFF CLUB
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 14,
            color: "#786E5F",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          디지털 디톡스 영수증
        </div>
      </div>

      <div style={{ borderTop: "2px dashed #D2C8B9", marginBottom: 28 }} />

      {/* Date */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: "#26231E",
            letterSpacing: 2,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {data.date}
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 3,
            color: "#AF A594",
            fontFamily: "'Courier New', monospace",
          }}
        >
          {data.day}
        </div>
      </div>

      <div style={{ borderTop: "2px dashed #D2C8B9", marginBottom: 20 }} />

      {/* Details */}
      {[
        ["SPOT", data.spot],
        ["TIME", data.time],
        ["MODE", data.mode],
        ["DETOX", `${data.detoxHours}시간 OFF ✓`],
      ].map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "flex",
            marginBottom: 12,
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              width: 70,
              fontSize: 11,
              color: "#AFA594",
              letterSpacing: 1,
              fontFamily: "'Courier New', monospace",
              flexShrink: 0,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#26231E",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {value}
          </div>
        </div>
      ))}

      <div
        style={{ borderTop: "2px dashed #D2C8B9", marginTop: 12, marginBottom: 24 }}
      />

      {/* Quote */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 8,
          fontSize: 12,
          color: "#C29234",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        오늘의 한마디
      </div>
      <div
        style={{
          textAlign: "center",
          color: "#EBDCB9",
          fontSize: 36,
          lineHeight: "24px",
          marginBottom: 8,
          fontFamily: "'Courier New', monospace",
        }}
      >
        "
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 16,
          color: "#26231E",
          lineHeight: 1.7,
          fontFamily: "system-ui, sans-serif",
          whiteSpace: "pre-line",
          marginBottom: 8,
        }}
      >
        {data.quote}
      </div>
      <div
        style={{
          textAlign: "center",
          color: "#EBDCB9",
          fontSize: 36,
          lineHeight: "24px",
          marginBottom: 20,
          fontFamily: "'Courier New', monospace",
        }}
      >
        "
      </div>

      <div style={{ borderTop: "2px dashed #D2C8B9", marginBottom: 20 }} />

      {/* Total */}
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          letterSpacing: 2,
          color: "#AFA594",
          marginBottom: 8,
          fontFamily: "'Courier New', monospace",
        }}
      >
        TOTAL DETOX TIME
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 36,
          fontWeight: "bold",
          color: "#26231E",
          marginBottom: 8,
          fontFamily: "'Courier New', monospace",
          letterSpacing: 2,
        }}
      >
        {data.totalHours} HOURS
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "#786E5F",
          marginBottom: 20,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {data.visits}회 참여 · {data.level} 등급
      </div>

      <div style={{ borderTop: "2px dashed #D2C8B9", marginBottom: 24 }} />

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "#AFA594",
          lineHeight: 1.8,
          fontFamily: "system-ui, sans-serif",
          marginBottom: 12,
        }}
      >
        목적 없는 즐거움,
        <br />
        다정한 디지털 로그아웃
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "#C29234",
          fontFamily: "'Courier New', monospace",
        }}
      >
        @well__moment
      </div>

      <div style={{ borderTop: "2px dashed #D2C8B9", marginTop: 24 }} />
    </div>
  );
}

function ReceiptDark({ data }) {
  return (
    <div
      style={{
        width: 360,
        minHeight: 640,
        background: "#26231E",
        borderRadius: 16,
        padding: "48px 32px",
        fontFamily: "'Courier New', monospace",
        position: "relative",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ borderTop: "2px dashed #46413A", marginBottom: 24 }} />

      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div
          style={{
            fontSize: 16,
            letterSpacing: 4,
            color: "#8C8273",
            fontFamily: "'Courier New', monospace",
          }}
        >
          TIMEOFF CLUB
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 14,
            color: "#C8BEAA",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          디지털 디톡스 영수증
        </div>
      </div>

      <div style={{ borderTop: "2px dashed #46413A", marginBottom: 28 }} />

      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: "#FCF9F3",
            letterSpacing: 2,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {data.date}
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 3,
            color: "#8C8273",
            fontFamily: "'Courier New', monospace",
          }}
        >
          {data.day}
        </div>
      </div>

      <div style={{ borderTop: "2px dashed #46413A", marginBottom: 20 }} />

      {[
        ["SPOT", data.spot],
        ["TIME", data.time],
        ["MODE", data.mode],
        ["DETOX", `${data.detoxHours}시간 OFF ✓`],
      ].map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "flex",
            marginBottom: 12,
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              width: 70,
              fontSize: 11,
              color: "#8C8273",
              letterSpacing: 1,
              fontFamily: "'Courier New', monospace",
              flexShrink: 0,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#FCF9F3",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {value}
          </div>
        </div>
      ))}

      <div
        style={{ borderTop: "2px dashed #46413A", marginTop: 12, marginBottom: 24 }}
      />

      <div
        style={{
          textAlign: "center",
          marginBottom: 8,
          fontSize: 12,
          color: "#D6AA50",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        오늘의 한마디
      </div>
      <div
        style={{
          textAlign: "center",
          color: "#645537",
          fontSize: 36,
          lineHeight: "24px",
          marginBottom: 8,
          fontFamily: "'Courier New', monospace",
        }}
      >
        "
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 16,
          color: "#FCF9F3",
          lineHeight: 1.7,
          fontFamily: "system-ui, sans-serif",
          whiteSpace: "pre-line",
          marginBottom: 8,
        }}
      >
        {data.quote}
      </div>
      <div
        style={{
          textAlign: "center",
          color: "#645537",
          fontSize: 36,
          lineHeight: "24px",
          marginBottom: 20,
          fontFamily: "'Courier New', monospace",
        }}
      >
        "
      </div>

      <div style={{ borderTop: "2px dashed #46413A", marginBottom: 20 }} />

      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          letterSpacing: 2,
          color: "#8C8273",
          marginBottom: 8,
          fontFamily: "'Courier New', monospace",
        }}
      >
        TOTAL DETOX TIME
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 36,
          fontWeight: "bold",
          color: "#FCF9F3",
          marginBottom: 8,
          fontFamily: "'Courier New', monospace",
          letterSpacing: 2,
        }}
      >
        {data.totalHours} HOURS
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "#C8BEAA",
          marginBottom: 20,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {data.visits}회 참여 · {data.level} 등급
      </div>

      <div style={{ borderTop: "2px dashed #46413A", marginBottom: 24 }} />

      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "#8C8273",
          lineHeight: 1.8,
          fontFamily: "system-ui, sans-serif",
          marginBottom: 12,
        }}
      >
        목적 없는 즐거움,
        <br />
        다정한 디지털 로그아웃
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "#D6AA50",
          fontFamily: "'Courier New', monospace",
        }}
      >
        @well__moment
      </div>

      <div style={{ borderTop: "2px dashed #46413A", marginTop: 24 }} />
    </div>
  );
}

export default function DetoxReceipt() {
  const [theme, setTheme] = useState("light");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme === "light" ? "#E8E4DD" : "#1A1816",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px",
        transition: "background 0.3s",
      }}
    >
      <div style={{ marginBottom: 24, display: "flex", gap: 12 }}>
        <button
          onClick={() => setTheme("light")}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: "none",
            background: theme === "light" ? "#C29234" : "#46413A",
            color: "#FCF9F3",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          라이트 버전
        </button>
        <button
          onClick={() => setTheme("dark")}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: "none",
            background: theme === "dark" ? "#D6AA50" : "#AFA594",
            color: theme === "dark" ? "#26231E" : "#FCF9F3",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          다크 버전
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span
          style={{
            fontSize: 11,
            color: theme === "light" ? "#786E5F" : "#8C8273",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          인스타그램 스토리 비율 미리보기
        </span>
      </div>

      {theme === "light" ? (
        <ReceiptLight data={SAMPLE_DATA} />
      ) : (
        <ReceiptDark data={SAMPLE_DATA} />
      )}

      <div
        style={{
          marginTop: 24,
          fontSize: 11,
          color: theme === "light" ? "#AFA594" : "#645537",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1.6,
        }}
      >
        실제 구현 시 세션 데이터가 동적으로 채워집니다
        <br />
        날짜, 스팟, 시간, 오늘의 한마디, 누적 기록 등
      </div>
    </div>
  );
}
