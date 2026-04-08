// Service Worker for Web Push Notifications

self.addEventListener('push', function(event) {
  console.log('Push received:', event);
  
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '타임오프클럽';
    const options = {
      body: data.body || data.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'timeoffclub-notification',
      requireInteraction: true,
      actions: data.actions || [],
      data: {
        url: data.url || '/',
        notificationId: data.notificationId || Date.now()
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Push event error:', error);
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('타임오프클럽', {
        body: '새로운 알림이 있습니다.',
        icon: '/favicon.ico'
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      // 이미 열린 탭이 있으면 포커스
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 새 탭 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});