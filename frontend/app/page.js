"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function Home() {
  const [tables, setTables] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [people, setPeople] = useState(1);
  const [queue, setQueue] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [myQueue, setMyQueue] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [username, setUsername] = useState("User");

  useEffect(() => {
  const interval1 = setInterval(() => {
    loadTables();
    loadQueue();
  }, 5000); // ทุก 5 วินาที

  const interval2 = setInterval(() => {
    loadMyQueue();
  }, 3000); // ทุก 3 วินาที

  return () => {
    clearInterval(interval1);
    clearInterval(interval2);
  };
}, []);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.name) {
        setUsername(user.name);
      }
    } catch (err) {
      console.log("user parse error");
    }
  }, []);

  useEffect(() => {
    if (timeLeft === null) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("หมดเวลา โต๊ะถูกปล่อย");
          loadTables();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const loadTables = async () => {
  try {
    const res = await axios.get("https://realsecanteen-production.up.railway.app/tables", {
      headers: {
        Authorization: localStorage.getItem("token")
      }
    });
    console.log("myQueue response:", res.data);

    setTables(res.data);

    console.log("📦 res.data:", res.data);
    // 🔥 หาโต๊ะของเรา
    const myTable = res.data.find(t => t.myTable);
    //console.log("tables:", tables);
    //console.log("myTable:", myTable);
    console.log("🔥 myTable FULL:", JSON.stringify(myTable, null, 2));
    if (myTable && myTable.status === "BLUE" && myTable.reservedAt) {
      const now = Date.now();
      const left = Math.floor((myTable.reservedAt + 300000 - now) / 1000);

      if (left > 0) {
        setTimeLeft(left);
      }
    } else {
      setTimeLeft(null); // ❗ กัน bug
    }

  } catch (err) {
    console.log("tables error:", err);
  }
};

  const loadQueue = async () => {
  try {
    const res = await axios.get("https://realsecanteen-production.up.railway.app/queue", {
      headers: {
         Authorization: localStorage.getItem("token")
      }
    });
    setQueue(res.data);
  } catch (err) {
    console.log("queue error:", err);
  }
};

const loadMyQueue = async () => {
  try {

    const res = await axios.get(
      "https://realsecanteen-production.up.railway.app/myQueue",
      {
        headers:{
          Authorization: localStorage.getItem("token")
        }
      }
    );

    console.log("myQueue response:", res.data);

    // ✅ ถ้าถูก assign โต๊ะแล้ว
    if (res.data.assigned) {
      alert(res.data.message); // "คิวเข้าโต๊ะ A1 แล้ว"
      loadTables(); // โหลดโต๊ะใหม่
      setMyQueue({ inQueue: false });
      return;
    }


    setMyQueue(res.data);

  } catch (err) {
    console.log("myQueue error", err);
  }
};

const leaveTable = async (tableId) => {
  try {
    const res = await axios.post("https://realsecanteen-production.up.railway.app/leave",{ 
      tableId: tableId },
      {
        headers: {
          Authorization: localStorage.getItem("token")
        }
      }
    );

    alert(res.data.message);

    loadTables();
    loadQueue();
  } catch (err) {
    console.log(err);
    alert("leave error");
  }
};

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // รัศมีโลก (เมตร)
  const toRad = (deg) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const SHOP_LAT = 13.821023;
const SHOP_LNG = 100.514573;

  const reserve = async () => {
    const hasGreen = tables.some(
      t => (6 - t.people) >= people);
      if (hasGreen && !selectedTable) {
        alert("กรุณาเลือกโต๊ะก่อน");
        return;
      }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const distance = getDistanceInMeters(
        lat,
        lng,
        SHOP_LAT,
        SHOP_LNG
      );

    if (distance > 350) {
        alert("อยู่นอกระยะ 350 เมตร");
        return;
      }

      const res = await axios.post(
        "https://realsecanteen-production.up.railway.app/reserve",
        {
          people,
          lat,
          lng,
          tableId: selectedTable
        },
        {
          headers: {
            Authorization: localStorage.getItem("token")
          }
        }
      );

    alert(res.data.message);
    setShowPopup(false);
    setSelectedTable(null);

    // Force multiple reloads to catch server update
    loadTables();
    loadQueue();
    setTimeout(() => { loadTables(); loadQueue(); }, 500);
    setTimeout(() => { loadTables(); loadQueue(); }, 1500);
    setTimeout(() => { loadTables(); loadQueue(); }, 3000);
    },
    (err) => {
      alert("กรุณาเปิด location");
    }
  );
};

  const startScan = () => {
  try {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: 250
    });

    scanner.render(
      async (decodedText) => {
        try {
          const res = await axios.post(
            "https://realsecanteen-production.up.railway.app/scan",
            { tableId: decodedText },
            {
              headers: {
                Authorization: localStorage.getItem("token")
              }
            }
          );

          alert(res.data.message);

          loadTables();
          loadQueue();

          scanner.clear();
        } catch (err) {
          console.log(err);
          alert("scan error");
        }
      },
      (error) => {
        console.log(error);
      }
    );
  } catch (err) {
    console.log(err);
    alert("เปิดกล้องไม่ได้");
  }
};

  const callQueue = async () => {
  const res = await axios.post("https://realsecanteen-production.up.railway.app/callQueue");
  alert(res.data.message);

  loadQueue();
};

const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user"); // ❗ เพิ่มอันนี้
  window.location.href = "/login";
};
const myTable = tables.find(t => t.myTable);
  return (
    <div className="bg-gray-300 min-h-screen p-4">

      {/* HEADER */}
<div className="bg-orange-500 h-16 mb-4 flex items-center justify-between px-4 text-white rounded" style={{position: "relative"}}>
  <div className="font-bold">Canteen Queue</div>
  
  <div style={{ position: "relative" }}>
    <button
      onClick={() => setShowUserMenu(prev => !prev)}
      style={{
        backgroundColor: "rgba(255,255,255,0.2)",
        border: "2px solid rgba(255,255,255,0.6)",
        borderRadius: "999px",
        padding: "6px 16px",
        color: "white",
        fontWeight: "bold",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}
    >
      <span>👤</span>
      <span>{username}</span>
    </button>

    {showUserMenu && (
      <div style={{
        position: "absolute",
        top: "110%",
        right: 0,
        backgroundColor: "white",
        borderRadius: "10px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        padding: "8px",
        minWidth: "140px",
        zIndex: 999
      }}>
        <button
          onClick={logout}
          style={{
            width: "100%",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          🚪 Logout
        </button>
      </div>
    )}
  </div>
</div>

      {timeLeft !== null && (
          <div className="text-center text-red-600 font-bold mb-3">
            ⏳ เหลือเวลา {Math.floor(timeLeft / 60)}:
            {(timeLeft % 60).toString().padStart(2, "0")}
          </div>
        )}

{/* LEGEND */}
<div style={{
  display: "flex",
  gap: "16px",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "white",
  borderRadius: "10px",
  padding: "8px 16px",
  marginBottom: "12px",
  flexWrap: "wrap",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  width: "fit-content",
  margin: "0 auto 12px auto"
}}>
  {[
    { color: "#22c55e", label: "Available" },
    { color: "#60a5fa", label: "Pending" },
    { color: "#ef4444", label: "Reserved" },
    { color: "#eab308", label: "Reserved (can join)" },
  ].map(({ color, label }) => (
    <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        backgroundColor: color
      }}/>
      <span style={{ fontSize: "13px", color: "#374151" }}>{label}</span>
    </div>
  ))}
</div>

      {/* TABLE GRID */}
<div style={{ display: "grid", gridTemplateColumns: "repeat(17, 1fr)", gap: "6px", padding: "8px" }}>  {tables.map((t) => {
    const bgColor = 
      t.status === "RED"    ? "#ef4444"
      : t.status === "YELLOW" ? "#eab308"
      : t.status === "BLUE" && t.myTable ? "#2563eb"
      : t.status === "BLUE"   ? "#60a5fa"
      : t.status === "GREEN"  ? "#22c55e"
      : "#9ca3af";

    return (
      <div
        key={t.id}
        onClick={() => {
          if (showPopup) return;
          if (t.myTable) { leaveTable(t.id); return; }
          if (t.status === "GREEN" || t.status === "YELLOW") {
            axios.get("https://realsecanteen-production.up.railway.app/tables", { tableId: t.id }, {
              headers: { Authorization: localStorage.getItem("token") }
            }).then(res => {
              if (res.data.success) setSelectedTable(t.id);
              else alert(res.data.message);
            });
          }
        }}
        style={{
          backgroundColor: bgColor,
          borderRadius: "8px",
          padding: "6px",
          minHeight: "50px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          cursor: t.status === "GREEN" || t.status === "YELLOW" || t.myTable ? "pointer" : "not-allowed",
          boxShadow: selectedTable === t.id ? "0 0 0 4px white, 0 0 0 6px #3b82f6" : "0 2px 4px rgba(0,0,0,0.2)",
          transform: selectedTable === t.id ? "scale(1.05)" : "scale(1)",
          transition: "all 0.15s ease",
          position: "relative"
        }}
      >
        {/* Status dot */}
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 8, height: 8, borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.5)"
        }}/>

        {/* Table ID */}
        <span style={{ color: "white", fontWeight: "bold", fontSize: "10px" }}>
          {t.id}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "2px", marginTop: "4px" }}>
          <span style={{ fontSize: "9px" }}>👥</span>
          <span style={{ color: "white", fontSize: "9px", fontWeight: "600" }}>
            {t.people ?? 0}
          </span>
        </div>
      </div>
    );
  })}
</div>

      {/* BUTTON */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setShowPopup(true)}
          className="bg-orange-500 px-6 py-2 rounded-full text-white shadow"
        >
          Reservation
        </button>
      </div>

        <div className="mt-4 text-center">
        <h3 className="font-bold">Queue</h3>
        {myQueue?.inQueue && (
          <div className="text-red-600 font-bold mt-2">
            คุณอยู่ในคิวที่ {myQueue.position}
          </div>
        )}
        </div>

        <button
        onClick={callQueue}
        className="bg-blue-500 text-white px-4 py-2 mt-2 rounded"
        >
        Check Queue
        </button>

        <button
          onClick={startScan}
          disabled={!myTable || myTable.status !== "BLUE"}
          className="bg-purple-500 text-white px-4 py-2 mt-2 rounded disabled:opacity-50"
        >
          Scan QR
        </button>

        <div id="reader" className="mt-4"></div>

      {/* POPUP */}
      {showPopup && (
        <div className="fixed inset-0 bg-opacity-50 flex justify-center items-center">

          <div className="bg-gray-200 p-6 rounded-xl text-center w-64 !text-black">
            <h2 className="mb-2 font-semibold">Enter Number</h2>
            {selectedTable && (
              <div className="mb-2 text-black font-bold">
                เลือกโต๊ะ: {selectedTable}
              </div>
            )}

            <input
              type="number"
              min="1"
              max="6"
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
              className="p-2 mb-4 w-full text-center border rounded !text-black bg-white"
            />

            {!tables.some(t => (6 - t.people) >= people) && (
              <div className="mb-2 text-red-500 text-sm">
                โต๊ะเต็ม ระบบจะพาคุณเข้า Queue
              </div>
            )}

            {!selectedTable && (
              <div className="mb-2 text-red-500 text-sm">
                กรุณาเลือกโต๊ะก่อน
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={reserve}
                className="bg-orange-500 px-4 py-2 rounded text-white"
              >
                Confirm
              </button>

              <button
                onClick={() => {
                  setShowPopup(false);
                  setSelectedTable(null);
                }}
                className="bg-gray-500 px-4 py-2 rounded text-white"
              >
                Cancel
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
