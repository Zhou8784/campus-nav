// 路径规划：生成横平竖直的折线（曼哈顿风格）
// 同楼层：起点 -> 中间转折点 -> 终点（先水平后垂直，或先垂直后水平）
// 跨楼层：起点 -> 起点楼层楼梯（折线）-> 终点楼层楼梯（折线）-> 终点

function findPath(startRoomId, endRoomId) {
    const startRoom = allRooms.find(r => r.room_id === startRoomId);
    const endRoom = allRooms.find(r => r.room_id === endRoomId);
    
    if (!startRoom || !endRoom) {
        console.error('房间不存在', startRoomId, endRoomId);
        return [];
    }
    
    const startFloor = startRoom.floor_number;
    const endFloor = endRoom.floor_number;
    const startCenter = startRoom.center;
    const endCenter = endRoom.center;
    
    // 同楼层：生成直角折线
    if (startFloor === endFloor) {
        return generateOrthogonalPath(startCenter, endCenter);
    }
    
    // 跨楼层：找楼梯
    const stairsStart = allRooms.filter(r => r.type === '楼梯间' && r.floor_number === startFloor);
    const stairsEnd = allRooms.filter(r => r.type === '楼梯间' && r.floor_number === endFloor);
    
    if (stairsStart.length === 0 || stairsEnd.length === 0) {
        console.warn('没有楼梯间数据，使用直角折线直接连接');
        return generateOrthogonalPath(startCenter, endCenter);
    }
    
    // 起点楼层最近楼梯
    let bestStairStart = stairsStart[0];
    let minDist = distance(startCenter, bestStairStart.center);
    stairsStart.forEach(s => {
        const d = distance(startCenter, s.center);
        if (d < minDist) {
            minDist = d;
            bestStairStart = s;
        }
    });
    
    // 终点楼层匹配楼梯（优先同名，否则最近）
    const stairNumber = bestStairStart.name.match(/\d+/);
    let bestStairEnd = null;
    if (stairNumber) {
        bestStairEnd = stairsEnd.find(s => s.name.includes(stairNumber[0]));
    }
    if (!bestStairEnd) {
        bestStairEnd = stairsEnd[0];
        let minDistEnd = distance(endCenter, bestStairEnd.center);
        stairsEnd.forEach(s => {
            const d = distance(endCenter, s.center);
            if (d < minDistEnd) {
                minDistEnd = d;
                bestStairEnd = s;
            }
        });
    }
    
    // 生成三段折线并合并
    const segment1 = generateOrthogonalPath(startCenter, bestStairStart.center);
    const segment2 = generateOrthogonalPath(bestStairStart.center, bestStairEnd.center);
    const segment3 = generateOrthogonalPath(bestStairEnd.center, endCenter);
    
    // 合并路径点（去重相邻点）
    return mergePathSegments([segment1, segment2, segment3]);
}

// 优化 routing.js 中的 generateOrthogonalPath 函数
function generateOrthogonalPath(p1, p2) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    
    // 增加一个微小的偏置，避免路径完全贴着墙走
    // 选择先水平还是先垂直：根据距离长短判断，通常先走长边更符合行走直觉
    if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
        return [p1, [x2, y1], p2]; // 先水平
    } else {
        return [p1, [x1, y2], p2]; // 先垂直
    }
}

// 合并多段路径，去除重复的相邻点
function mergePathSegments(segments) {
    const result = [];
    segments.forEach(segment => {
        segment.forEach((point, index) => {
            if (result.length === 0) {
                result.push(point);
            } else {
                const last = result[result.length - 1];
                // 如果与上一个点距离极近，则跳过
                if (distance(last, point) > 0.1) {
                    result.push(point);
                }
            }
        });
    });
    return result;
}

function distance(p1, p2) {
    return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
}