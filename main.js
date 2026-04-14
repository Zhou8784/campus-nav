let currentSchedule = [];
let activeTypes = ['多媒体教室', '办公室', '卫生间', '饮水机', '打印机', '楼梯间', '功能性公用自习室', '仓库'];

// 选点状态
let startPoint = null;
let endPoint = null;
window.pickingMode = null;

// ========== 默认课表 ==========
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

window.onload = () => {
    initMap();
    
    const stored = loadSchedule();
    if (stored && stored.length > 0) {
        currentSchedule = stored;
    } else {
        currentSchedule = [...DEFAULT_SCHEDULE];
        saveSchedule(currentSchedule);
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

// 选点回调
window.setPickedPoint = (room) => {
    if (window.pickingMode === 'start') {
        startPoint = room;
        document.getElementById('start-point-label').textContent = room.name;
        document.getElementById('pick-start-btn').classList.remove('active');
    } else if (window.pickingMode === 'end') {
        endPoint = room;
        document.getElementById('end-point-label').textContent = room.name;
        document.getElementById('pick-end-btn').classList.remove('active');
    }
    window.pickingMode = null;
    map.getContainer().style.cursor = '';
    
    document.getElementById('start-navigation-btn').disabled = !(startPoint && endPoint);
};

function bindEvents() {
    // 安全获取元素辅助函数
    const safeGet = (id) => document.getElementById(id);
    
    // 导入课表相关
    const importBtn = safeGet('import-schedule-btn');
    if (importBtn) importBtn.onclick = () => document.getElementById('import-modal').style.display = 'flex';
    
    const cancelImport = safeGet('cancel-import');
    if (cancelImport) cancelImport.onclick = () => document.getElementById('import-modal').style.display = 'none';
    
    const parseBtn = safeGet('parse-schedule-btn');
    if (parseBtn) parseBtn.onclick = () => {
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
    
    // 楼层切换
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.onclick = () => filterFloor(parseInt(btn.dataset.floor));
    });
    
    // 移除原 view-toggle 绑定，改用已存在的 btn-3d 按钮（已在 HTML 中绑定 toggle3D）
    // 原 locate-btn 不存在，改为地图双击重置视角
    map.on('dblclick', () => map.setView([900, 550], 0));
    
    // POI 筛选标签
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.onclick = (e) => {
            tag.classList.toggle('active');
            activeTypes = [...document.querySelectorAll('.filter-tag.active')].map(t => t.dataset.type);
            filterPoiByTypes(activeTypes);
        };
    });
    
    // 搜索功能
    const searchInput = safeGet('search-input');
    if (searchInput) searchInput.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        const results = allRooms.filter(r => 
            r.name.toLowerCase().includes(val) || r.room_id.toLowerCase().includes(val)
        ).slice(0, 8);
        const resDiv = safeGet('search-results');
        if (resDiv) {
            resDiv.innerHTML = results.map(r => 
                `<div class="search-result-item" data-id="${r.room_id}">${r.name} (${r.type})</div>`
            ).join('');
            document.querySelectorAll('.search-result-item').forEach(el => {
                el.onclick = () => {
                    flyToRoom(el.dataset.id);
                    resDiv.innerHTML = '';
                };
            });
        }
    };
    
    // 引导弹窗关闭
    const closeGuide = safeGet('close-guide');
    if (closeGuide) closeGuide.onclick = () => document.getElementById('guide-modal').style.display = 'none';
    
    // 提醒设置
    const reminderBtn = safeGet('reminder-btn');
    if (reminderBtn) reminderBtn.onclick = () => {
        const dd = safeGet('reminder-dropdown');
        if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    };
    
    const reminderSelect = safeGet('reminder-time-select');
    if (reminderSelect) reminderSelect.onchange = (e) => setReminderMinutes(parseInt(e.target.value));
    
    // 关闭路径面板
    const closeRoute = safeGet('close-route');
    if (closeRoute) closeRoute.onclick = () => {
        document.getElementById('route-panel').style.display = 'none';
        clearRoute();
    };

    // 选点导航事件
    const pickStart = safeGet('pick-start-btn');
    const pickEnd = safeGet('pick-end-btn');
    const navStart = safeGet('start-navigation-btn');
    
    if (pickStart) pickStart.onclick = () => {
        window.pickingMode = 'start';
        pickStart.classList.add('active');
        if (pickEnd) pickEnd.classList.remove('active');
        map.getContainer().style.cursor = 'crosshair';
    };
    
    if (pickEnd) pickEnd.onclick = () => {
        window.pickingMode = 'end';
        pickEnd.classList.add('active');
        if (pickStart) pickStart.classList.remove('active');
        map.getContainer().style.cursor = 'crosshair';
    };
    
    if (navStart) navStart.onclick = () => {
        if (!startPoint || !endPoint) return;
        
        const path = findPath(startPoint.roomId, endPoint.roomId);
        if (path && path.length > 0) {
            drawRoute(path);
            const endRoom = allRooms.find(r => r.room_id === endPoint.roomId);
            if (endRoom) {
                filterFloor(endRoom.floor_number);
                map.setView([endRoom.center[1], endRoom.center[0]], 1.2);
            }
            document.getElementById('route-panel').style.display = 'block';
            document.getElementById('route-info').innerHTML = `从 ${startPoint.name} 到 ${endPoint.name}`;
        } else {
            alert('路径规划失败，请确保起点和终点在同一楼层或通过楼梯可达。');
        }
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

// 全局导航跳转（供通知弹窗调用）
window.navigateToRoom = (targetRoomId) => {
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
        alert('路径规划失败，请确保地图数据存在。');
    }
};