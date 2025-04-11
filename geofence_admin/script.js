// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBuA3Md2EB4IpWd1RP_yjzBsrlCuJP7oCQ",
    authDomain: "geofence-demo-af6b4.firebaseapp.com",
    databaseURL: "https://geofence-demo-af6b4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "geofence-demo-af6b4",
    storageBucket: "geofence-demo-af6b4.appspot.com",
    messagingSenderId: "1055340054679",
    appId: "1:1055340054679:web:b619d1651717691bd281d2"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  
  // 지도 초기화
  const map = L.map('map').setView([37.6933, 127.1667], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  
  // 지오펜스 설정
  const polygonCoords = [
    [127.166763, 37.693346],
    [127.166538, 37.699628],
    [127.169855, 37.703084],
    [127.182923, 37.712845],
    [127.184156, 37.709560],
    [127.175187, 37.694748],
    [127.166763, 37.693346]
  ];
  const leafletCoords = polygonCoords.map(c => [c[1], c[0]]);
  const fenceGeoJSON = { type: "Polygon", coordinates: [polygonCoords] };
  L.polygon(leafletCoords, {
    color: 'blue',
    fillColor: '#aaf',
    fillOpacity: 0.3
  }).addTo(map);
  
  function checkInsideGeofence(lat, lng) {
    const pt = turf.point([lng, lat]);
    const poly = turf.polygon(fenceGeoJSON.coordinates);
    return turf.booleanPointInPolygon(pt, poly);
  }
  
  let filterEnabled = false;
  const userMarkers = {};
  const userListEl = document.getElementById("userList");
  const statusEl = document.getElementById("status");
  
  // 토글 필터 버튼
  document.getElementById("toggleFilter").addEventListener("click", () => {
    filterEnabled = !filterEnabled;
    document.getElementById("toggleFilter").innerText =
      filterEnabled ? "🌍 전체 사용자 보기" : "👀 지오펜스 내 사용자만 보기";
    updateMarkers();
  });
  
  // 드래그 사이드바
  const sidebar = document.getElementById("resizableSidebar");
  const dragHandle = document.getElementById("dragHandle");
  const toggleButton = document.getElementById("toggleButton");
  let isDragging = false, startX = 0, startWidth = 0, collapsed = false;
  
  dragHandle.addEventListener("mousedown", e => {
    isDragging = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    document.body.style.cursor = "ew-resize";
  });
  
  window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const dx = startX - e.clientX;
    const newWidth = Math.min(Math.max(startWidth + dx, 150), 500);
    sidebar.style.width = newWidth + "px";
  });
  
  window.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.cursor = "default";
  });
  
  toggleButton.addEventListener("click", () => {
    collapsed = !collapsed;
    sidebar.style.width = collapsed ? "0px" : "300px";
    toggleButton.textContent = collapsed ? "⇥" : "⇤";
  });
  
  // 사용자 마커 및 리스트
  function updateMarkers() {
    db.ref('locations').once('value').then(snapshot => {
      const locations = snapshot.val();
      const activeUserIds = new Set();
  
      // 기존 마커 제거
      for (const id in userMarkers) {
        map.removeLayer(userMarkers[id]);
      }
      Object.keys(userMarkers).forEach(id => delete userMarkers[id]);
      userListEl.innerHTML = "";
  
      if (locations) {
        for (const userId in locations) {
          const { lat, lng, name, role } = locations[userId];
          const inside = checkInsideGeofence(lat, lng);
          if (filterEnabled && !inside) continue;
  
          const marker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`👤 ${name}<br>🛠 ${role}<br>${inside ? '🟢 안' : '🔴 밖'}`);
          userMarkers[userId] = marker;
  
          const div = document.createElement("div");
          div.className = `user ${inside ? "inside" : "outside"}`;
          div.innerHTML = `👤 <strong>${name}</strong><br>🛠 ${role}`;
          userListEl.appendChild(div);
  
          activeUserIds.add(userId);
        }
        statusEl.innerText = `👥 표시 중: ${activeUserIds.size}명`;
      } else {
        statusEl.innerText = "📍 사용자 없음";
      }
    });
  }
  
  db.ref('locations').on('value', () => updateMarkers());
  