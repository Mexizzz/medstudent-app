// MedStudy Service Worker — Study Reminders
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Listen for reminder check messages from the page
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'SCHEDULE_REMINDER') {
    const { hour, minute, label } = event.data;
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target.getTime() - now.getTime();

    setTimeout(async () => {
      const clients = await self.clients.matchAll();
      // Only notify if user hasn't already been active this session
      self.registration.showNotification('MedStudy — Time to Study! 📚', {
        body: `Hey! Your daily study reminder: ${label}. Skelly is waiting.`,
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: 'study-reminder',
        data: { url: '/study' },
        actions: [
          { action: 'study', title: '💀 Let\'s go!' },
          { action: 'dismiss', title: 'Later' },
        ],
      });
    }, delay);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'study' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length) { clients[0].focus(); clients[0].navigate('/study'); }
        else self.clients.openWindow('/study');
      })
    );
  }
});
