let currentSchedule = [];
let activeTypes = ['多媒体教室', '办公室', '卫生间', '饮水机', '打印机', '楼梯间', '功能性公用自习室', '仓库'];

// ========== 默认课表（基于你提供的真实课表） ==========
const DEFAULT_SCHEDULE = [
    { id: 'default_1', name: '大学语文', room: '3栋2楼203', roomId: '3-203', time: '周一 14:30-15:55' },
    { id: 'default_2', name: '大学生创新创业基础', room: '1栋2楼201', roomId: '1-201', time: '周一 16:15-17:40' },
    { id: 'default_3', name: '高等数学', room: '1栋1楼102', roomId: '1-102', time: '周二 09:45-11:55' },
    { id: 'default_4', name: '离散数学', room: '1栋1楼101', roomId: '1-101', time: '周三 08:00-09:25' },
    { id: 'default_5', name: '思想道德与法治', room: '3栋1楼104', roomId: '3-104', time: '周三 09:45-11:10' },
    { id: 'default_6', name: '离散数学', room: '1栋1楼101', roomId: '1-101', time: '周三 14:30-15:55' },
    { id: 'default_7', name: 'Python程序设计基础', room: '1栋2楼203', roomId: '1-203', time: '周三 16:15-17:40' },
    { id: 'default_8', name: 'Python程序设计基础', room: '1栋2楼203', roomId: '1-203', time: '周四 08:00-09:25' },
    { id: 'default_9', name: '高等数学', room: '3栋2楼203', roomId: '3-203', time: '周四 09:45-11:10' },
    { id: 'default_10', name: '大学英语', room: '2栋1楼103', roomId: '2-103', time: '周五 14:30-16:55' },
    { id: 'default_11', name: '思想道德与法治', room: '3栋1楼102', roomId: '3-102', time: '周六 14:30-17:40' }
];
// ===================================================

window.onload = () => {
    initMap();
    
    // 加载存储的课表，如果没有则使用默认课表
    const stored = loadSchedule();
    if (stored && stored.length > 0) {
        currentSchedule = stored;
    } else {
        currentSchedule = [...DEFAULT_SCHEDULE];
        saveSchedule(currentSchedule); // 保存默认课表到本地
    }
    
    renderScheduleList();
    bindEvents();
    
    setTimeout(() => {
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
            if (!localStorage.getItem('guide_shown')) {
                document.getElementById('guide-modal').style.display = 'flex';
                localStorage.setItem('guide_shown', 'true');
            }
        }, 500);
    }, 2000);
    
    requestNotificationPermission();
};

function bindEvents() {
    document.getElementById('import-schedule-btn').onclick = () => {
        document.getElementById('import-modal').style.display = 'flex';
    };
    document.getElementById('cancel-import').onclick = () => {
        document.getElementById('import-modal').style.display = 'none';
    };
    document.getElementById('parse-schedule-btn').onclick = () => {
        const text = document.getElementById('schedule-text').value;
        const parsed = parseScheduleText(text);
        if (parsed.length > 0) {
            currentSchedule = parsed;
            saveSchedule(currentSchedule);
            renderScheduleList();
            scheduleReminders(currentSchedule);
        }
        document.getElementById('import-modal').style.display = 'none';
        document.getElementById('schedule-text').value = '';
    };
    
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.onclick = () => filterFloor(parseInt(btn.dataset.floor));
    });
    
    document.getElementById('view-toggle').onclick = toggleViewMode;
    document.getElementById('locate-btn').onclick = () => {
        map.setView([900, 550], 0);
    };
    
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.onclick = (e) => {
            tag.classList.toggle('active');
            activeTypes = [...document.querySelectorAll('.filter-tag.active')].map(t => t.dataset.type);
            filterPoiByTypes(activeTypes);
        };
    });
    
    document.getElementById('search-input').oninput = (e) => {
        const val = e.target.value.toLowerCase();
        const results = allRooms.filter(r => 
            r.name.toLowerCase().includes(val) || r.room_id.toLowerCase().includes(val)
        ).slice(0, 8);
        const resDiv = document.getElementById('search-results');
        resDiv.innerHTML = results.map(r => 
            `<div class="search-result-item" data-id="${r.room_id}">${r.name} (${r.type})</div>`
        ).join('');
        document.querySelectorAll('.search-result-item').forEach(el => {
            el.onclick = () => {
                flyToRoom(el.dataset.id);
                resDiv.innerHTML = '';
            };
        });
    };
    
    document.getElementById('close-guide').onclick = () => {
        document.getElementById('guide-modal').style.display = 'none';
    };
    
    document.getElementById('reminder-btn').onclick = () => {
        const dd = document.getElementById('reminder-dropdown');
        dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    };
    document.getElementById('reminder-time-select').onchange = (e) => {
        setReminderMinutes(parseInt(e.target.value));
    };
    
    document.getElementById('close-route').onclick = () => {
        document.getElementById('route-panel').style.display = 'none';
        clearRoute();
    };
}

function renderScheduleList() {
    const container = document.getElementById('today-schedule');
    if (!currentSchedule || currentSchedule.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无课程，点击右上角导入</div>';
        return;
    }
    
    container.innerHTML = currentSchedule.map(c => `
        <div class="schedule-item">
            <div class="schedule-info">
                <div class="course-name">${c.name}</div>
                <div class="course-room">📍 ${c.room}</div>
                <div class="course-time" style="font-size:0.8rem;color:#666;">${c.time || ''}</div>
            </div>
            <button class="nav-btn" data-room="${c.room}" data-roomid="${c.roomId || ''}">导航</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = () => {
            const roomName = btn.dataset.room;
            let targetRoomId = btn.dataset.roomid;
            
            if (!targetRoomId || targetRoomId === 'undefined') {
                targetRoomId = mapToRoomId(roomName);
            }
            
            if (!targetRoomId) {
                alert(`未找到教室: ${roomName}`);
                return;
            }
            
            const startRoomId = '1-stair1';
            const path = findPath(startRoomId, targetRoomId);
            
            if (path && path.length > 0) {
                drawRoute(path);
                const targetRoom = allRooms.find(r => r.room_id === targetRoomId);
                if (targetRoom) {
                    filterFloor(targetRoom.floor_number);
                    map.setView([targetRoom.center[1], targetRoom.center[0]], 1.2);
                    document.getElementById('route-panel').style.display = 'block';
                    document.getElementById('route-info').innerHTML = `前往 ${targetRoom.name}`;
                }
            } else {
                alert('路径规划失败');
            }
        };
    });
}