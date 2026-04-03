// 임시 정리 스크립트
fetch('https://timeoffclub.pages.dev/api/conversation-topics/cleanup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-admin-token'
  },
  body: JSON.stringify({ date: '2026-04-26' })
})
.then(r => r.json())
.then(console.log);