// 简单路径规划：基于房间中心点和楼梯节点，使用直线连接（演示用）
// 跨楼层：通过楼梯节点连接不同楼层

function findPath(startRoomId, endRoomId) {
    const startRoom = allRooms.find(r => r.room_id === startRoomId);
    const endRoom = allRooms.find(r => r.room_id === endRoomId);
    if (!startRoom || !endRoom) return [];

    const startFloor = startRoom.floor_number;
    const endFloor = endRoom.floor_number;
    const startCenter = startRoom.center;
    const endCenter = endRoom.center;

    if (startFloor === endFloor) {
        // 同楼层直接连线
        return [startCenter, endCenter];
    } else {
        // 跨楼层：找起点楼层楼梯 -> 终点楼层对应楼梯
        const stairsStart = allRooms.filter(r => r.type === '楼梯间' && r.floor_number === startFloor);
        const stairsEnd = allRooms.filter(r => r.type === '楼梯间' && r.floor_number === endFloor);
        if (stairsStart.length === 0 || stairsEnd.length === 0) return [startCenter, endCenter];

        // 简单选最近楼梯
        let bestStairStart = stairsStart[0];
        let minDist = distance(startCenter, bestStairStart.center);
        stairsStart.forEach(s => {
            const d = distance(startCenter, s.center);
            if (d < minDist) { minDist = d; bestStairStart = s; }
        });

        // 找终点楼层同名楼梯（根据名称匹配，如“楼梯1”）
        const targetName = bestStairStart.name.replace(startFloor.toString(), endFloor.toString());
        let bestStairEnd = stairsEnd.find(s => s.name === targetName) || stairsEnd[0];

        return [startCenter, bestStairStart.center, bestStairEnd.center, endCenter];
    }
}

function distance(p1, p2) {
    return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
}

// 绘制路径
function drawRoute(pathCoords) {
    if (!pathCoords || pathCoords.length < 2) return;
    if (map.getSource('route')) {
        map.getSource('route').setData({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: pathCoords }
        });
    } else {
        map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: pathCoords } }
        });
        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            paint: { 'line-color': '#e11d48', 'line-width': 4, 'line-dasharray': [2, 2] }
        });
    }
    // 动画省略，简单起见
}

function clearRoute() {
    if (map.getSource('route')) {
        map.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
    }
}