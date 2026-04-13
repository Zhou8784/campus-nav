function parseScheduleText(text) {
    // 提取教室号模式：支持“厚德1503”、“1栋101”、“知行205”等
    const roomRegex = /([A-Za-z0-9栋楼厚德知行明德]+[\d\-]+室?)/g;
    let matches = text.match(roomRegex) || [];
    // 简化处理：只保留数字和栋信息
    const rooms = [...new Set(matches.map(m => m.replace(/室$/, '').trim()))];
    const schedule = rooms.map((room, idx) => ({
        id: `course_${idx}`,
        name: `课程${idx+1}`,
        room: room,
        time: '周一 8:00-9:40'
    }));
    return schedule;
}

// 尝试将课表教室名映射到 room_id
function mapToRoomId(roomName) {
    // 简单映射：如果包含数字，尝试匹配
    const numMatch = roomName.match(/(\d+)栋?(\d+)/);
    if (numMatch) {
        const building = numMatch[1];
        const roomNum = numMatch[2];
        const candidate = allRooms.find(r => r.room_id.includes(`${building}-${roomNum}`) || r.name.includes(roomName));
        return candidate ? candidate.room_id : null;
    }
    // 直接查找名称包含
    const found = allRooms.find(r => r.name.includes(roomName) || r.room_id.includes(roomName));
    return found ? found.room_id : null;
}