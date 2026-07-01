// Tiny service worker: its only job is to let the page fire notifications that
// still work on mobile (Android Chrome throws on `new Notification()`), and to
// focus/open the app when someone taps one. No caching, no push subscriptions —
// everything is driven by the open page polling the live feed.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url || self.registration.scope)
    }),
  )
})
