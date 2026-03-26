self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '타임오프클럽';
  const options = {
    body: data.body || '오늘 타임오프클럽 세션이 있어요!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'timeoffclub-reminder',
    data: { url: data.url || '/calendar' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/calendar';
  event.waitUntil(clients.openWindow(url));
});
