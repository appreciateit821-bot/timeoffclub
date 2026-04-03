import { useState } from "react";

// 실제로는 API에서 가져올 멤버 참여 데이터
const sampleData = {
  userName: "지은",
  date: "2026.04.05",
  dayOfWeek: "일",
  spot: "서촌 터틀도브",
  detoxMinutes: 107,
  mode: "smalltalk",
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
    name: "폰이 보낸 편지",
    desc: "집착 남친 컨셉의 폰이 보내는 이별 편지",
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
              fontSize: 10,
              letterSpacing: 4,
              color: "#555",
              fontFamily: "monospace",
            }}
          >
            A LETTER FROM YOUR PHONE
          </div>
        </div>

        <div
          style={{
            background: "#222",
            borderRadius: 12,
            padding: "32px 24px",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: 15,
              color: "#E8E4DD",
              lineHeight: 2.2,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {d.userName}아,
            <br />
            <br />
            나 없이{" "}
            <span style={{ color: "#D6AA50", fontWeight: "bold" }}>
              {formatDetoxTime(d.detoxMinutes)}
            </span>
            이나 버텼네.
            <br />
            좀 서운하다.
            <br />
            <br />
            그 사이 너한테 온 거:
            <br />
            카톡{" "}
            <span style={{ color: "#D6AA50", fontWeight: "bold" }}>23개</span>,
            인스타{" "}
            <span style={{ color: "#D6AA50", fontWeight: "bold" }}>47개</span>,
            <br />
            뉴스 속보{" "}
            <span style={{ color: "#D6AA50", fontWeight: "bold" }}>12개</span>
            <br />
            <br />
            근데 솔직히 말하면
            <br />
            <span
              style={{
                color: "#fff",
                fontWeight: "bold",
                fontSize: 17,
              }}
            >
              별거 없었어.
            </span>
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: 13,
              color: "#666",
              fontStyle: "italic",
              fontFamily: "system-ui, sans-serif",
              marginTop: 20,
            }}
          >
            — 네 아이폰이
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              color: "#444",
              fontFamily: "monospace",
              marginBottom: 6,
            }}
          >
            {d.date} ({d.dayOfWeek}) · {d.spot}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#D6AA50",
              fontFamily: "monospace",
              letterSpacing: 2,
            }}
          >
            TIMEOFF CLUB
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    name: "오늘의 스크린타임",
    desc: "아이폰 스크린타임 리포트 패러디. 숫자로 때린다",
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
            marginBottom: 48,
            fontSize: 10,
            letterSpacing: 4,
            color: "#444",
            fontFamily: "monospace",
          }}
        >
          WEEKLY REPORT
        </div>

        {/* Average daily - embarrassing number */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginBottom: 12,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            평소 하루 스크린타임
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "#FF3B30",
              fontFamily: "monospace",
              letterSpacing: -3,
            }}
          >
            7h 23m
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#FF3B30",
              fontFamily: "system-ui, sans-serif",
              opacity: 0.6,
              marginTop: 4,
            }}
          >
            하루의 31%를 폰에 씀
          </div>
        </div>

        {/* VS divider */}
        <div
          style={{
            textAlign: "center",
            margin: "28px 0",
            fontSize: 13,
            color: "#333",
            fontFamily: "monospace",
            letterSpacing: 4,
          }}
        >
          — VS —
        </div>

        {/* Detox time - flex number */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginBottom: 12,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            오늘 이 시간만큼은
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: "bold",
              color: "#34C759",
              fontFamily: "monospace",
              letterSpacing: -4,
            }}
          >
            0m
          </div>
        </div>

        {/* Punchline */}
        <div
          style={{
            margin: "32px 0 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#fff",
              fontFamily: "system-ui, sans-serif",
              fontWeight: "bold",
              lineHeight: 1.5,
            }}
          >
            {formatDetoxTime(d.detoxMinutes)},
            <br />
            아무것도 안 했는데
            <br />
            <span style={{ color: "#34C759" }}>전부 괜찮았다</span>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "#333",
              fontFamily: "monospace",
              marginBottom: 6,
            }}
          >
            {d.date} ({d.dayOfWeek}) · {d.spot}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#D6AA50",
              fontFamily: "monospace",
              letterSpacing: 2,
            }}
          >
            TIMEOFF CLUB
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    name: "폰 보관증",
    desc: "클럽 코트체크 감성. 힙한 유머",
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
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 5,
              color: "#B8A88A",
              fontFamily: "monospace",
              marginBottom: 20,
            }}
          >
            DEVICE STORAGE RECEIPT
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: "bold",
              color: "#26231E",
              fontFamily: "monospace",
              lineHeight: 1,
            }}
          >
            #037
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#999",
              fontFamily: "system-ui, sans-serif",
              marginTop: 8,
            }}
          >
            {d.userName}님의 스마트폰
          </div>
        </div>

        {/* Ticket details */}
        <div
          style={{
            borderTop: "1.5px dashed #CCC4B5",
            borderBottom: "1.5px dashed #CCC4B5",
            padding: "28px 0",
            marginBottom: 28,
          }}
        >
          {[
            ["맡긴 날", `${d.date} (${d.dayOfWeek})`],
            ["맡긴 곳", d.spot],
            ["분리 시간", formatDetoxTime(d.detoxMinutes)],
            ["부재중 착신", "확인 안 함"],
            ["그동안 세상", "잘 돌아감"],
            ["반환 시 상태", "주인 없이도 멀쩡했음 ✓"],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#A09882",
                  fontFamily: "monospace",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#26231E",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: value.includes("✓") ? "bold" : "normal",
                  textAlign: "right",
                  maxWidth: "55%",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Punchline */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 15,
              color: "#26231E",
              fontFamily: "system-ui, sans-serif",
              fontWeight: "bold",
              lineHeight: 1.8,
            }}
          >
            찾아가실 때 한마디:
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#26231E",
              fontFamily: "system-ui, sans-serif",
              fontWeight: "bold",
              marginTop: 4,
            }}
          >
            "없어도 되는 거였네"
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 12,
              color: "#26231E",
              fontWeight: "bold",
              letterSpacing: 3,
              fontFamily: "monospace",
            }}
          >
            TIMEOFF CLUB
          </div>
          <div
            style={{
              fontSize: 10,
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
    name: "디톡스 랩드",
    desc: "스포티파이 연말결산 스타일. 자랑 + 경쟁심",
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
            marginBottom: 8,
            fontSize: 10,
            letterSpacing: 4,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "monospace",
          }}
        >
          YOUR DETOX WRAPPED
        </div>

        {/* Name + date */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 36,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {d.userName}님은 올해
          </div>
        </div>

        {/* Hero stat */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: "bold",
              color: "#fff",
              fontFamily: "monospace",
              letterSpacing: -3,
              lineHeight: 1,
            }}
          >
            {d.totalDetoxHours}h
          </div>
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "system-ui, sans-serif",
              marginTop: 8,
            }}
          >
            폰 없이 살아남은 시간
          </div>
        </div>

        {/* Ranking - the flex */}
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 16,
            padding: "28px 24px",
            textAlign: "center",
            margin: "28px 0",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "system-ui, sans-serif",
              marginBottom: 12,
            }}
          >
            대한민국 2030 중에서
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: "bold",
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "monospace",
              lineHeight: 1,
            }}
          >
            상위 {d.rankPercent}%
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "system-ui, sans-serif",
              marginTop: 12,
              lineHeight: 1.6,
            }}
          >
            진짜로 폰을 내려놓은 사람
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginBottom: 28,
          }}
        >
          {[
            [`${d.totalSessions}회`, "참여"],
            [`${d.streak}주`, "연속"],
            [`${d.spotsVisited}곳`, "방문"],
          ].map(([num, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  color: "#fff",
                  fontFamily: "monospace",
                }}
              >
                {num}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "system-ui, sans-serif",
                  marginTop: 4,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Today */}
        <div
          style={{
            textAlign: "center",
            padding: "12px 0",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
              fontFamily: "monospace",
            }}
          >
            {d.date} · {d.spot} · {formatDetoxTime(d.detoxMinutes)}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#D6AA50",
              fontFamily: "monospace",
              letterSpacing: 2,
              marginTop: 6,
            }}
          >
            TIMEOFF CLUB
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    name: "읽씹한 세상",
    desc: "놓친 알림들을 자랑스럽게 전시. 도발적 여유",
    render: (d) => {
      const isWed = d.dayOfWeek === "수";
      const startHour = isWed ? 20 : 15;
      const notifTimes = [8, 17, 29, 38, 51, 66, 82].map((min) => {
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
          {/* Header - provocative */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: 4,
                color: "#333",
                fontFamily: "monospace",
                marginBottom: 12,
              }}
            >
              {d.date} ({d.dayOfWeek})
            </div>
            <div
              style={{
                fontSize: 20,
                color: "#fff",
                fontFamily: "system-ui, sans-serif",
                fontWeight: "bold",
                lineHeight: 1.5,
              }}
            >
              {d.userName}님이
              <br />
              <span style={{ color: "#FF3B30" }}>
                {formatDetoxTime(d.detoxMinutes)}
              </span>{" "}
              동안
              <br />
              읽씹한 세상
            </div>
          </div>

          {/* Fake notifications */}
          {[
            {
              icon: "💬",
              app: "카카오톡",
              text: "엄마: 저녁 뭐 먹을거야 전화 좀...",
            },
            {
              icon: "📸",
              app: "Instagram",
              text: "회사 동기가 게시물을 좋아합니다",
            },
            {
              icon: "📰",
              app: "뉴스",
              text: "[속보] 어차피 내일이면 잊을 뉴스",
            },
            {
              icon: "🛒",
              app: "쿠팡",
              text: "지금 안 사면 후회할 거예요!",
            },
            {
              icon: "💬",
              app: "카카오톡",
              text: "팀장: 이거 월요일까지 가능...?",
            },
            {
              icon: "📧",
              app: "Gmail",
              text: "Your weekly screen time was...",
            },
            {
              icon: "💬",
              app: "카카오톡",
              text: "친구: 야 카톡 왜 씹어 ㅋㅋ",
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
                  i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                borderRadius: 8,
                marginBottom: 2,
                opacity: 0.35 + i * 0.03,
              }}
            >
              <div style={{ fontSize: 16, flexShrink: 0 }}>{notif.icon}</div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "#555",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {notif.app}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#777",
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
                  color: "#333",
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
              marginTop: 36,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: "#fff",
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.5,
              }}
            >
              다 놓쳤는데
              <br />
              <span style={{ color: "#D6AA50" }}>아무 일도 안 일어남</span>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 28 }}>
            <div
              style={{
                fontSize: 11,
                color: "#333",
                fontFamily: "monospace",
                marginBottom: 6,
              }}
            >
              {d.spot}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#D6AA50",
                fontFamily: "monospace",
                letterSpacing: 2,
              }}
            >
              TIMEOFF CLUB
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

      {/* Data info */}
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
        예시: {sampleData.userName}님 · {sampleData.date} ({sampleData.dayOfWeek}) · {sampleData.spot} · {formatDetoxTime(sampleData.detoxMinutes)}
      </div>

      {/* Preview */}
      <div style={{ display: "flex", justifyContent: "center" }}>
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
