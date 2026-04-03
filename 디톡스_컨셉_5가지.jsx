import { useState } from "react";

// 실제로는 API에서 가져올 멤버 참여 데이터 (예시)
const sampleData = {
  userName: "지은",
  date: "2026.04.05",
  dayOfWeek: "일",
  spot: "서촌 터틀도브",
  detoxMinutes: 107, // 체크인 ~ 세션종료 (1시간 47분)
  mode: "smalltalk",
  // 누적 데이터
  totalSessions: 6,
  totalDetoxHours: 11.2,
  streak: 3,
  spotsVisited: 3,
  rankPercent: 8,
  smalltalkCount: 5,
  reflectionCount: 1,
};

function formatDetoxTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

const concepts = [
  {
    id: 1,
    name: "스마트폰의 편지",
    desc: "폰 시점에서 주인에게 보내는 편지. 유머 + 공감",
    render: (d) => (
      <div
        style={{
          width: 360,
          minHeight: 640,
          background: "#1A1A1A",
          borderRadius: 16,
          padding: "48px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 3,
              color: "#666",
              fontFamily: "monospace",
            }}
          >
            FROM YOUR PHONE
          </div>
        </div>

        <div
          style={{
            background: "#222",
            borderRadius: 12,
            padding: "28px 24px",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: 15,
              color: "#E8E4DD",
              lineHeight: 2,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {d.userName}님,
            <br />
            <br />
            오늘{" "}
            <span style={{ color: "#D6AA50", fontWeight: "bold" }}>
              {formatDetoxTime(d.detoxMinutes)}
            </span>{" "}
            동안 저 없이도
            <br />
            잘 지내셨나 봐요.
            <br />
            <br />
            그 사이 카톡{" "}
            <span style={{ color: "#D6AA50", fontWeight: "bold" }}>23개</span>,
            <br />
            인스타 알림{" "}
            <span style={{ color: "#D6AA50", fontWeight: "bold" }}>47개</span>,
            <br />
            뉴스 속보{" "}
            <span style={{ color: "#D6AA50", fontWeight: "bold" }}>12개</span>가
            왔는데
            <br />
            <br />
            <span style={{ color: "#888" }}>...별거 없었어요.</span>
            <br />
            <br />
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: 13,
              color: "#888",
              fontStyle: "italic",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            — 당신의 아이폰
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              color: "#555",
              letterSpacing: 2,
              marginBottom: 4,
              fontFamily: "monospace",
            }}
          >
            {d.date} ({d.dayOfWeek}) · {d.spot}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#D6AA50",
              fontFamily: "monospace",
            }}
          >
            TIMEOFF CLUB · @well__moment
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    name: "스크린타임 대비",
    desc: "평소 스크린타임 vs 오늘 디톡스. 충격 + 자각",
    render: (d) => (
      <div
        style={{
          width: 360,
          minHeight: 640,
          background: "#0A0A0A",
          borderRadius: 16,
          padding: "48px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 40,
            fontSize: 11,
            letterSpacing: 3,
            color: "#555",
            fontFamily: "monospace",
          }}
        >
          SCREEN TIME REPORT
        </div>

        {/* Average daily */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginBottom: 8,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            나의 하루 평균 스크린타임
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: "bold",
              color: "#FF3B30",
              fontFamily: "monospace",
              letterSpacing: -2,
            }}
          >
            7h 23m
          </div>
        </div>

        {/* Divider with arrow */}
        <div
          style={{
            textAlign: "center",
            margin: "16px 0",
            fontSize: 24,
            color: "#333",
          }}
        >
          ↓
        </div>

        {/* Detox time */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginBottom: 8,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            오늘 이 시간만큼은
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: "bold",
              color: "#34C759",
              fontFamily: "monospace",
              letterSpacing: -2,
            }}
          >
            0m
          </div>
        </div>

        {/* Duration bar */}
        <div
          style={{
            margin: "24px 0",
            background: "#1A1A1A",
            borderRadius: 8,
            padding: "16px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 28,
              color: "#E8E4DD",
              fontFamily: "system-ui, sans-serif",
              fontWeight: "bold",
            }}
          >
            {formatDetoxTime(d.detoxMinutes)}의 자유
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginTop: 4,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {d.userName}님이 스마트폰 없이 보낸 시간
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "#444",
              letterSpacing: 2,
              marginBottom: 4,
              fontFamily: "monospace",
            }}
          >
            {d.date} ({d.dayOfWeek}) · {d.spot}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#D6AA50",
              fontFamily: "monospace",
            }}
          >
            TIMEOFF CLUB · @well__moment
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    name: "보관함 번호표",
    desc: "코트체크 티켓 컨셉. 미니멀 + 드라이한 유머",
    render: (d) => (
      <div
        style={{
          width: 360,
          minHeight: 640,
          background: "#F5F0E8",
          borderRadius: 16,
          padding: "48px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          position: "relative",
        }}
      >
        {/* Ticket stub effect */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 20,
            background:
              "repeating-linear-gradient(90deg, #F5F0E8 0px, #F5F0E8 10px, transparent 10px, transparent 20px)",
          }}
        />

        <div
          style={{
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 4,
              color: "#999",
              fontFamily: "monospace",
              marginBottom: 16,
            }}
          >
            PHONE CHECK TICKET
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "#26231E",
              fontFamily: "monospace",
            }}
          >
            #037
          </div>
        </div>

        <div
          style={{
            borderTop: "2px dashed #CCC4B5",
            borderBottom: "2px dashed #CCC4B5",
            padding: "24px 0",
            marginBottom: 32,
          }}
        >
          {[
            ["이름", d.userName],
            ["날짜", `${d.date} (${d.dayOfWeek})`],
            ["장소", d.spot],
            ["보관물", "스마트폰 1대"],
            ["보관시간", formatDetoxTime(d.detoxMinutes)],
            ["보관 중 알림", "읽지 않음"],
            ["반환 상태", "주인 없이도 괜찮았음 ✓"],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 14,
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontFamily: "monospace",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#26231E",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: value.includes("✓") ? "bold" : "normal",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 13,
              color: "#26231E",
              fontWeight: "bold",
              letterSpacing: 2,
              fontFamily: "monospace",
            }}
          >
            TIMEOFF CLUB
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#C29234",
              marginTop: 4,
              fontFamily: "monospace",
            }}
          >
            @well__moment
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    name: "디톡스 랭킹",
    desc: "스포티파이 랩드 스타일. 경쟁심 + 자랑",
    render: (d) => (
      <div
        style={{
          width: 360,
          minHeight: 640,
          background:
            "linear-gradient(160deg, #1B0F2E 0%, #0D1B2A 50%, #1A2F1A 100%)",
          borderRadius: 16,
          padding: "48px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 12,
            fontSize: 11,
            letterSpacing: 3,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "monospace",
          }}
        >
          TIMEOFF CLUB 2026
        </div>

        <div
          style={{
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "system-ui, sans-serif",
              marginBottom: 8,
            }}
          >
            {d.userName}님의 디톡스 리포트
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "system-ui, sans-serif",
              marginBottom: 8,
            }}
          >
            총 디톡스 시간
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "#fff",
              fontFamily: "monospace",
              letterSpacing: -2,
            }}
          >
            {d.totalDetoxHours}h
          </div>
        </div>

        {/* Ranking badge */}
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "24px",
            textAlign: "center",
            marginBottom: 32,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "system-ui, sans-serif",
              marginBottom: 8,
            }}
          >
            타임오프클럽 멤버 중
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: "bold",
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "monospace",
            }}
          >
            상위 {d.rankPercent}%
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              marginTop: 8,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {d.totalSessions}회 참여 · 4개 스팟 중 {d.spotsVisited}곳 방문
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginBottom: 32,
          }}
        >
          {[
            ["🔥", `연속 ${d.streak}주`],
            ["💬", `스몰토크 ${d.smalltalkCount}회`],
            ["🧘", `사색 ${d.reflectionCount}회`],
          ].map(([emoji, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Today's session info */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "monospace",
              marginBottom: 4,
            }}
          >
            TODAY'S SESSION
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {d.date} ({d.dayOfWeek}) · {d.spot} · {formatDetoxTime(d.detoxMinutes)}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "monospace",
            }}
          >
            @well__moment
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    name: "무시한 알림들",
    desc: "놓친 알림 리스트를 보여주며 '그래도 괜찮았다' 메시지",
    render: (d) => {
      // 세션 시작 시간 기반으로 알림 시간 생성
      // 일요일 15:00~17:00 / 수요일 20:00~22:00
      const isWed = d.dayOfWeek === "수";
      const startHour = isWed ? 20 : 15;
      const notifTimes = [12, 23, 31, 45, 62, 78, 94].map((min) => {
        const totalMin = startHour * 60 + min;
        const hh = Math.floor(totalMin / 60);
        const mm = totalMin % 60;
        return `${hh}:${String(mm).padStart(2, "0")}`;
      });

      return (
        <div
          style={{
            width: 360,
            minHeight: 640,
            background: "#000",
            borderRadius: 16,
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#555",
                fontFamily: "system-ui, sans-serif",
                marginBottom: 4,
              }}
            >
              {d.userName}님이
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#555",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {formatDetoxTime(d.detoxMinutes)} 동안 놓친 것들
            </div>
          </div>

          {/* Fake notifications */}
          {[
            {
              icon: "💬",
              app: "카카오톡",
              text: "엄마: 저녁 뭐 먹을...",
            },
            {
              icon: "📸",
              app: "Instagram",
              text: "님의 게시물을 좋아합니...",
            },
            {
              icon: "📰",
              app: "뉴스",
              text: "[속보] 내일 날씨...",
            },
            {
              icon: "🛒",
              app: "쿠팡",
              text: "장바구니 상품이 할인...",
            },
            {
              icon: "💬",
              app: "카카오톡",
              text: "회사 단톡방: 내일 회...",
            },
            {
              icon: "📧",
              app: "Gmail",
              text: "Your weekly summa...",
            },
            {
              icon: "💬",
              app: "카카오톡",
              text: "친구: 주말에 시간...",
            },
          ].map((notif, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background:
                  i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
                borderRadius: 8,
                marginBottom: 2,
                opacity: 0.4 + i * 0.02,
              }}
            >
              <div style={{ fontSize: 18, flexShrink: 0 }}>{notif.icon}</div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#666",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {notif.app}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#888",
                    fontFamily: "system-ui, sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {notif.text}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#444",
                  fontFamily: "monospace",
                  flexShrink: 0,
                }}
              >
                {notifTimes[i]}
              </div>
            </div>
          ))}

          {/* Punchline */}
          <div
            style={{
              textAlign: "center",
              marginTop: 40,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#fff",
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.4,
              }}
            >
              다 놓쳤는데
              <br />
              괜찮았다
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <div
              style={{
                fontSize: 11,
                color: "#444",
                letterSpacing: 2,
                fontFamily: "monospace",
                marginBottom: 4,
              }}
            >
              {d.date} ({d.dayOfWeek}) · {d.spot}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#D6AA50",
                fontFamily: "monospace",
              }}
            >
              TIMEOFF CLUB · @well__moment
            </div>
          </div>
        </div>
      );
    },
  },
];

export default function ConceptPicker() {
  const [selected, setSelected] = useState(0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        padding: "24px 16px",
      }}
    >
      {/* Concept tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 16,
          marginBottom: 8,
        }}
      >
        {concepts.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setSelected(i)}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "none",
              background: selected === i ? "#D6AA50" : "#222",
              color: selected === i ? "#000" : "#888",
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "system-ui, sans-serif",
              fontWeight: selected === i ? "bold" : "normal",
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Description */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 20,
          fontSize: 13,
          color: "#666",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {concepts[selected].desc}
      </div>

      {/* Data info banner */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 16,
          padding: "8px 16px",
          background: "#1A1A1A",
          borderRadius: 8,
          fontSize: 11,
          color: "#888",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        예시 데이터: {sampleData.userName}님 · {sampleData.date} · {sampleData.spot} · 디톡스 {formatDetoxTime(sampleData.detoxMinutes)}
      </div>

      {/* Preview */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        {concepts[selected].render(sampleData)}
      </div>

      {/* Concept number */}
      <div
        style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 12,
          color: "#444",
          fontFamily: "monospace",
        }}
      >
        CONCEPT {selected + 1} / {concepts.length}
      </div>
    </div>
  );
}
