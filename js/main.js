let currentSchedule = [];
let activeTypes = ['多媒体教室', '办公室', '卫生间', '饮水机', '打印机', '楼梯间', '功能性公用自习室', '仓库'];

window.onload = () => {
    initMap();
    currentSchedule = loadSchedule();
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
        currentSchedule = parsed;
        saveSchedule(currentSchedule);
        renderScheduleList();
        scheduleReminders(currentSchedule);
        document.getElementById('import-modal').style.display = 'none';
    };
    
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.onclick = () => filterFloor(parseInt(btn.dataset.floor));
    });
    
    document.getElementById('view-toggle').onclick = toggleViewMode;
    document.getElementById('locate-btn').onclick = () => {
        map.fitBounds([[0, 0], [1100, 1800]], { padding: 40 });
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
            el.onclick = () => flyToRoom(el.dataset.id);
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
    if (currentSchedule.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无课程，点击右上角导入</div>';
        return;
    }
    container.innerHTML = currentSchedule.map(c => `
        <div class="schedule-item">
            <div class="schedule-info">
                <div class="course-name">${c.name}</div>
                <div class="course-room">📍 ${c.room}</div>
            </div>
            <button class="nav-btn" data-room="${c.room}">导航</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = () => {
            const roomName = btn.dataset.room;
            const targetRoomId = mapToRoomId(roomName);
            if (!targetRoomId) {
                alert(`未找到教室: ${roomName}`);
                return;
            }
            // 默认起点设为大厅或楼梯
            const startRoomId = '1-stair1'; // 默认起点
            const path = findPath(startRoomId, targetRoomId);
            if (path.length) {
                drawRoute(path);
                const targetRoom = allRooms.find(r => r.room_id === targetRoomId);
                filterFloor(targetRoom.floor_number);
                map.flyTo({ center: path[0], zoom: 1.2 });
                document.getElementById('route-panel').style.display = 'block';
                document.getElementById('route-info').innerHTML = `前往 ${targetRoom.name}`;
            } else {
                alert('路径规划失败');
            }
        };
    });
}