let reminderMinutes = APP_CONFIG.defaultReminder;
let timers = [];

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

function scheduleReminders(schedule) {
    timers.forEach(clearTimeout);
    timers = [];
    schedule.forEach(course => {
        const now = new Date();
        const courseTime = new Date(now);
        courseTime.setHours(8, 0, 0);
        const timeDiff = courseTime - now - reminderMinutes * 60000;
        if (timeDiff > 0) {
            const timer = setTimeout(() => {
                new Notification(`⏰ 即将上课`, {
                    body: `${course.name} 在 ${course.room}`,
                });
            }, timeDiff);
            timers.push(timer);
        }
    });
}

function setReminderMinutes(minutes) {
    reminderMinutes = minutes;
    const schedule = loadSchedule();
    scheduleReminders(schedule);
}