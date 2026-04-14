function parseScheduleText(text) {
    const lines = text.split('\n');
    const schedule = [];
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // 匹配房间号：如 "3栋2楼203"
        const roomMatch = line.match(/(\d+)栋(\d+)楼(\d+)/);
        if (!roomMatch) return;
        
        const building = roomMatch[1];
        const floor = roomMatch[2];
        const roomNum = roomMatch[3];
        const roomName = `${building}栋${floor}楼${roomNum}`;
        const roomId = `${building}-${roomNum}`;
        
        // 提取时间
        const timeMatch = line.match(/\d{1,2}:\d{2}[—\-]\d{1,2}:\d{2}/);
        const time = timeMatch ? timeMatch[0] : '';
        
        // 提取星期
        const weekdayMatch = line.match(/周[一二三四五六日]/);
        const weekday = weekdayMatch ? weekdayMatch[0] : '';
        
        // 提取课程名（在时间之后，房间号之前）
        let courseName = '未知课程';
        if (timeMatch) {
            const timeIndex = line.indexOf(timeMatch[0]) + timeMatch[0].length;
            const roomIndex = line.indexOf(roomName);
            if (roomIndex > timeIndex) {
                courseName = line.substring(timeIndex, roomIndex).trim();
            }
        }
        
        schedule.push({
            id: `imported_${Date.now()}_${schedule.length}`,
            name: courseName,
            room: roomName,
            roomId: roomId,
            time: `${weekday} ${time}`
        });
    });
    
    return schedule;
}

function mapToRoomId(roomName) {
    if (!roomName) return null;
    
    // 1. 直接匹配 room_id
    const directMatch = allRooms.find(r => r.room_id === roomName);
    if (directMatch) return directMatch.room_id;
    
    // 2. 处理 "3栋2楼203" -> "3-203"
    const buildingRoomMatch = roomName.match(/(\d+)栋(\d+)楼(\d+)/);
    if (buildingRoomMatch) {
        const candidateId = `${buildingRoomMatch[1]}-${buildingRoomMatch[3]}`;
        const candidate = allRooms.find(r => r.room_id === candidateId);
        if (candidate) return candidate.room_id;
    }
    
    // 3. 模糊匹配
    const nameMatch = allRooms.find(r => r.name.includes(roomName) || roomName.includes(r.name));
    if (nameMatch) return nameMatch.room_id;
    
    return null;
}