self.addEventListener('push', event => {
    let data = {};
    if (event.data) {
        data = event.data.json();
    }

    const title = data.title || 'Напоминание Pillo';
    const options = {
        body: data.body || 'Пора принять лекарство',
        icon: '/icon-192.png',
        badge: '/favicon-32.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/',
            reminderId: data.reminderId
        },
        actions: [
            { action: 'take', title: '✅ Принял' },
            { action: 'skip', title: '⏰ Отложить' }
        ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    const action = event.action;
    const reminderId = event.notification.data.reminderId;

    if (action === 'take') {
        fetch(`/api/medicine-history/reminder/${reminderId}/take`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.error('Ошибка:', err));
    } else if (action === 'skip') {
        fetch(`/api/medicine-history/reminder/${reminderId}/postpone`, {
            method: 'POST'
        }).catch(err => console.error('Ошибка:', err));
    }

    clients.openWindow('/');
});