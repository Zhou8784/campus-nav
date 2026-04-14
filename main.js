// main.js (加固版 - 防崩溃)
let currentSchedule = [];
let activeTypes = ['多媒体教室', '办公室', '卫生间', '饮水机', '打印机', '楼梯间', '功能性公用自习室', '仓库', '垃圾桶'];

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
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.opacity = '0';
        setTimeout(() => {
            if (splash) splash.style.display = 'none';
            if (!localStorage.getItem('guide_shown')) {
                const guide = document.getElementById('guide-modal');
                if (guide) guide.style.display = 'flex';
                localStorage.setItem('guide_shown', 'true');
            }
        }, 500);
    }, 800);
    
    requestNotificationPermission();
};

window.setPickedPoint = (room) => {
    if (window.pickingMode === 'start') {
        startPoint = room;
        const startLabel = document.getElementById('start-point-label');
        if (startLabel) startLabel.textContent = room.name;
        const startBtn = document.getElementById('pick-start-btn');
        if (startBtn) startBtn.classList.remove('active');
    } else if (window.pickingMode === 'end') {
        endPoint = room;
        const endLabel = document.getElementById('end-point-label');
        if (endLabel) endLabel.textContent = room.name;
        const endBtn = document.getElementById('pick-end-btn');
        if (endBtn) endBtn.classList.remove('active');
    }
    window.pickingMode = null;
    if (map && map.getContainer) map.getContainer().style.cursor = '';
    
    const navBtn = document.getElementById('start-navigation-btn');
    if (navBtn) navBtn.disabled = !(startPoint && endPoint);
};

function bindEvents() {
    // 安全获取元素（带判空）
    const getEl = (id) => document.getElementById(id);

    // 导入课表相关
    const importBtn = getEl('import-schedule-btn');
    const importModal = getEl('import-modal');
    const cancelImport = getEl('cancel-import');
    const parseBtn = getEl('parse-schedule-btn');
    if (importBtn) importBtn.onclick = () => { if (importModal) importModal.style.display = 'flex'; };
    if (cancelImport) cancelImport.onclick = () => { if (importModal) importModal.style.display = 'none'; };
    if (parseBtn) {
        parseBtn.onclick = () => {
            const textarea = getEl('schedule-text');
            const text = textarea ? textarea.value : '';
            const parsed = parseScheduleText(text);
            if (parsed.length > 0) {
                currentSchedule = parsed;
                saveSchedule(currentSchedule);
                renderScheduleList();
                scheduleReminders(currentSchedule);
            }
            if (importModal) importModal.style.display = 'none';
            if (textarea) textarea.value = '';
        };
    }
    
    // 楼层切换
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.onclick = () => filterFloor(parseInt(btn.dataset.floor));
    });
    
    // 双击地图重置视角
    if (map) {
        map.on('dblclick', () => map.setView([900, 550], 0));
    }
    
    // 筛选标签点击
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.onclick = () => {
            const type = tag.dataset.type;
            showRoomListModal(type);
        };
    });
    
    // 搜索功能
    const searchInput = getEl('search-input');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const val = e.target.value.toLowerCase();
            const results = allRooms.filter(r => 
                r.name.toLowerCase().includes(val) || r.room_id.toLowerCase().includes(val)
            ).slice(0, 8);
            const resDiv = getEl('search-results');
            if (!resDiv) return;
            resDiv.innerHTML = results.map(r => 
                `<div class="search-result-item" data-id="${r.room_id}" data-type="${r.type}">${r.name} (${r.type})</div>`
            ).join('');
            document.querySelectorAll('.search-result-item').forEach(el => {
                el.onclick = () => {
                    const room = allRooms.find(r => r.room_id === el.dataset.id);
                    if (room) {
                        flyToRoom(room.room_id);
                        const targetType = room.type;
                        filterPoiByTypes([targetType]);
                        document.querySelectorAll('.filter-tag').forEach(t => {
                            t.classList.toggle('active', t.dataset.type === targetType);
                        });
                        activeTypes = [targetType];
                        resDiv.innerHTML = '';
                    }
                };
            });
        };
    }
    
    // 点击外部关闭搜索列表
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-section')) {
            const resDiv = getEl('search-results');
            if (resDiv) resDiv.innerHTML = '';
        }
    });
    
    // 关闭引导
    const closeGuide = getEl('close-guide');
    if (closeGuide) closeGuide.onclick = () => {
        const guide = getEl('guide-modal');
        if (guide) guide.style.display = 'none';
    };
    
    // 提醒设置
    const reminderBtn = getEl('reminder-btn');
    if (reminderBtn) {
        reminderBtn.onclick = () => {
            const dd = getEl('reminder-dropdown');
            if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
        };
    }
    const reminderSelect = getEl('reminder-time-select');
    if (reminderSelect) reminderSelect.onchange = (e) => setReminderMinutes(parseInt(e.target.value));
    
    // 关闭路径面板
    const closeRoute = getEl('close-route');
    if (closeRoute) {
        closeRoute.onclick = () => {
            const panel = getEl('route-panel');
            if (panel) panel.style.display = 'none';
            clearRoute();
        };
    }
    
    // 关闭房间列表弹窗
    const closeRoomList = getEl('close-room-list');
    if (closeRoomList) {
        closeRoomList.onclick = () => {
            const modal = getEl('room-list-modal');
            if (modal) modal.style.display = 'none';
        };
    }

    // 选点导航
    const pickStart = getEl('pick-start-btn');
    const pickEnd = getEl('pick-end-btn');
    const navStart = getEl('start-navigation-btn');
    
    if (pickStart) {
        pickStart.onclick = () => {
            window.pickingMode = 'start';
            pickStart.classList.add('active');
            if (pickEnd) pickEnd.classList.remove('active');
            if (map && map.getContainer) map.getContainer().style.cursor = 'crosshair';
        };
    }
    if (pickEnd) {
        pickEnd.onclick = () => {
            window.pickingMode = 'end';
            pickEnd.classList.add('active');
            if (pickStart) pickStart.classList.remove('active');
            if (map && map.getContainer) map.getContainer().style.cursor = 'crosshair';
        };
    }
    if (navStart) {
        navStart.onclick = () => {
            if (!startPoint || !endPoint) return;
            const path = findPath(startPoint.roomId, endPoint.roomId);
            if (path && path.length > 0) {
                drawRoute(path);
                const endRoom = allRooms.find(r => r.room_id === endPoint.roomId);
                if (endRoom) {
                    filterFloor(endRoom.floor_number);
                    map.setView([endRoom.center[1], endRoom.center[0]], 1.2);
                }
                const panel = getEl('route-panel');
                const info = getEl('route-info');
                if (panel) panel.style.display = 'block';
                if (info) info.innerHTML = `从 ${startPoint.name} 到 ${endPoint.name}`;
            } else {
                alert('路径规划失败');
            }
        };
    }
    
    // 清除选点
    const clearBtn = getEl('clear-points-btn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            startPoint = null;
            endPoint = null;
            const startLabel = getEl('start-point-label');
            const endLabel = getEl('end-point-label');
            if (startLabel) startLabel.textContent = '未选择';
            if (endLabel) endLabel.textContent = '未选择';
            if (navStart) navStart.disabled = true;
            clearRoute();
            const panel = getEl('route-panel');
            if (panel) panel.style.display = 'none';
            if (pickStart) pickStart.classList.remove('active');
            if (pickEnd) pickEnd.classList.remove('active');
            if (map && map.getContainer) map.getContainer().style.cursor = '';
            window.pickingMode = null;
        };
    }
}

// 显示指定类型的房间列表弹窗（保持不变，但需内部判空）
function showRoomListModal(type) {
    let rooms;
    if (type === '办公室') {
        rooms = allRooms.filter(r => r.type.includes('办公室'));
    } else {
        rooms = allRooms.filter(r => r.type === type);
    }
    
    if (rooms.length === 0) {
        alert(`没有找到类型为“${type}”的房间`);
        return;
    }
    
    const byFloor = {};
    rooms.forEach(r => {
        const f = r.floor_number;
        if (!byFloor[f]) byFloor[f] = [];
        byFloor[f].push(r);
    });
    
    const floors = Object.keys(byFloor).sort((a,b) => a - b);
    let html = '';
    floors.forEach(floor => {
        html += `<div class="room-list-floor-group">`;
        html += `<div class="room-list-floor-title">${floor}F</div>`;
        byFloor[floor].forEach(room => {
            html += `<div class="room-list-item" data-roomid="${room.room_id}">
                        <span>${room.name}</span>
                        <span class="nav-badge">导航</span>
                    </div>`;
        });
        html += `</div>`;
    });
    
    const titleEl = document.getElementById('room-list-title');
    const container = document.getElementById('room-list-container');
    if (titleEl) titleEl.textContent = `${type} 列表 (共 ${rooms.length} 间)`;
    if (container) container.innerHTML = html;
    
    document.querySelectorAll('.room-list-item').forEach(el => {
        el.onclick = () => {
            const roomId = el.dataset.roomid;
            const room = allRooms.find(r => r.room_id === roomId);
            if (room) {
                const defaultStart = allRooms.find(r => r.room_id === '1-stair1') || allRooms[0];
                startPoint = { roomId: defaultStart.room_id, name: defaultStart.name, center: defaultStart.center };
                endPoint = { roomId: room.room_id, name: room.name, center: room.center };
                const startLabel = document.getElementById('start-point-label');
                const endLabel = document.getElementById('end-point-label');
                if (startLabel) startLabel.textContent = startPoint.name;
                if (endLabel) endLabel.textContent = endPoint.name;
                const navBtn = document.getElementById('start-navigation-btn');
                if (navBtn) navBtn.disabled = false;
                
                const path = findPath(startPoint.roomId, endPoint.roomId);
                if (path && path.length > 0) {
                    drawRoute(path);
                    filterFloor(room.floor_number);
                    map.setView([room.center[1], room.center[0]], 1.2);
                    const panel = document.getElementById('route-panel');
                    const info = document.getElementById('route-info');
                    if (panel) panel.style.display = 'block';
                    if (info) info.innerHTML = `前往 ${room.name}`;
                }
                const modal = document.getElementById('room-list-modal');
                if (modal) modal.style.display = 'none';
            }
        };
    });
    
    const modal = document.getElementById('room-list-modal');
    if (modal) modal.style.display = 'flex';
}

function renderScheduleList() {
    const container = document.getElementById('today-schedule');
    if (!container) return;
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
                    const panel = document.getElementById('route-panel');
                    const info = document.getElementById('route-info');
                    if (panel) panel.style.display = 'block';
                    if (info) info.innerHTML = `前往 ${targetRoom.name}`;
                }
            } else {
                alert('路径规划失败');
            }
        };
    });
}

window.navigateToRoom = (targetRoomId) => {
    const startRoomId = '1-stair1';
    const path = findPath(startRoomId, targetRoomId);
    if (path && path.length > 0) {
        drawRoute(path);
        const targetRoom = allRooms.find(r => r.room_id === targetRoomId);
        if (targetRoom) {
            filterFloor(targetRoom.floor_number);
            map.setView([targetRoom.center[1], targetRoom.center[0]], 1.2);
            const panel = document.getElementById('route-panel');
            const info = document.getElementById('route-info');
            if (panel) panel.style.display = 'block';
            if (info) info.innerHTML = `前往 ${targetRoom.name}`;
        }
    } else {
        alert('路径规划失败');
    }
};