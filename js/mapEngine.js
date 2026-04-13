let map;
let currentFloor = 1;
let allRooms = [];
let roomLayerGroup;

function initMap() {
    map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 4,
        zoomControl: false,
        attributionControl: false
    });

    map.setView([900, 550], 0);
    L.tileLayer('', {}).addTo(map);

    extractAllRooms();
    
    roomLayerGroup = L.layerGroup().addTo(map);
    redrawRoomsByFloor(currentFloor);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
}

function extractAllRooms() {
    allRooms = [];
    MAP_DATA.buildings.forEach(building => {
        building.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                const polygon = room.polygon;
                if (!polygon || polygon.length < 3) return;
                let sumX = 0, sumY = 0;
                polygon.forEach(p => { sumX += p[0]; sumY += p[1]; });
                const center = [sumX / polygon.length, sumY / polygon.length];
                allRooms.push({
                    ...room,
                    building_id: building.building_id,
                    building_name: building.building_name,
                    floor_number: floor.floor_number,
                    center: center,
                    polygon: polygon
                });
            });
        });
    });
}

function redrawRoomsByFloor(floor) {
    roomLayerGroup.clearLayers();
    const roomsOnFloor = allRooms.filter(r => r.floor_number === floor);
    roomsOnFloor.forEach(room => {
        const latlngs = room.polygon.map(p => [p[1], p[0]]);
        const color = APP_CONFIG.poiColors[room.type] || APP_CONFIG.poiColors.default;
        
        const polygon = L.polygon(latlngs, {
            color: '#333',
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.6
        }).addTo(roomLayerGroup);
        
        // 绑定弹窗
        polygon.bindPopup(`<strong>${room.name}</strong><br>${room.type}`);

        // 文字标签
        const label = room.name.replace(room.building_name, '').replace(/楼/g, '');
        L.marker([room.center[1], room.center[0]], {
            icon: L.divIcon({
                className: 'room-label',
                html: `<div style="font-size:10px;color:#000;text-shadow:0 0 3px #fff;white-space:nowrap;pointer-events:none;">${label}</div>`,
                iconSize: [40, 20]
            })
        }).addTo(roomLayerGroup);
    });
}

function filterFloor(floor) {
    currentFloor = floor;
    redrawRoomsByFloor(floor);
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.floor == floor);
    });
}

function toggleViewMode() {
    alert('当前为 Leaflet 平面图，暂不支持 3D 视图。');
}

function filterPoiByTypes(activeTypes) {
    roomLayerGroup.clearLayers();
    const roomsOnFloor = allRooms.filter(r => r.floor_number === currentFloor && activeTypes.includes(r.type));
    roomsOnFloor.forEach(room => {
        const latlngs = room.polygon.map(p => [p[1], p[0]]);
        const color = APP_CONFIG.poiColors[room.type] || APP_CONFIG.poiColors.default;
        const polygon = L.polygon(latlngs, {
            color: '#333',
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.6
        }).addTo(roomLayerGroup);
        polygon.bindPopup(`<strong>${room.name}</strong><br>${room.type}`);
        
        const label = room.name.replace(room.building_name, '').replace(/楼/g, '');
        L.marker([room.center[1], room.center[0]], {
            icon: L.divIcon({ className: 'room-label', html: `<div style="font-size:10px;color:#000;text-shadow:0 0 3px #fff;white-space:nowrap;pointer-events:none;">${label}</div>`, iconSize: [40, 20] })
        }).addTo(roomLayerGroup);
    });
}

function flyToRoom(roomId) {
    const room = allRooms.find(r => r.room_id === roomId);
    if (room) {
        map.setView([room.center[1], room.center[0]], 1.5);
        filterFloor(room.floor_number);
        L.popup()
            .setLatLng([room.center[1], room.center[0]])
            .setContent(`<strong>${room.name}</strong><br>${room.type}`)
            .openOn(map);
    }
}

function getRoomCenter(roomId) {
    const room = allRooms.find(r => r.room_id === roomId);
    return room ? room.center : null;
}

function getStairCenters(floor) {
    return allRooms.filter(r => r.type === '楼梯间' && r.floor_number === floor).map(r => r.center);
}

function drawRoute(pathCoords) {
    if (window.routeLine) map.removeLayer(window.routeLine);
    if (pathCoords && pathCoords.length > 1) {
        const latlngs = pathCoords.map(p => [p[1], p[0]]);
        window.routeLine = L.polyline(latlngs, { color: '#e11d48', weight: 4, dashArray: '5, 5' }).addTo(map);
    }
}

function clearRoute() {
    if (window.routeLine) {
        map.removeLayer(window.routeLine);
        window.routeLine = null;
    }
}