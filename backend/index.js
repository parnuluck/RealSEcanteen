const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");



const app = express();
app.use(cors({
  origin: "https://YOUR-FRONTEND.onrender.com"
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running ✅");
});

 // 🔑 config
const SECRET = "mySuperSecret123";
const EMAIL = "canteeeen.project@gmail.com";
const PASS = "ccgl dijs lfmg iybt";

// ===== CONNECT MONGODB =====
mongoose.connect("mongodb://s6704062612111_db_user:GrY7av8hoTqqfVOQ@ac-5uvtkxg-shard-00-00.gtrjl9m.mongodb.net:27017,ac-5uvtkxg-shard-00-01.gtrjl9m.mongodb.net:27017,ac-5uvtkxg-shard-00-02.gtrjl9m.mongodb.net:27017/cafeteria?ssl=true&replicaSet=atlas-8xx4bb-shard-0&authSource=admin&appName=canteen")
  .then(() => console.log("MongoDB Atlas connected"))
  .catch(err => console.log(err));

// ===== 4. MODEL =====
const User = mongoose.model("User", {
  username: String,
  email: String,
  password: String,
  verified: { type: Boolean, default: false },
  verifyToken: String,
  resetToken: String
});

// ===== DATABASE (ใช้ array แทน) =====
let tables = [];
let queue = [];
let users = [];
let assignedQueue = [];

// ===== 5. EMAIL SETUP =====
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // ❗ ต้องเป็น false สำหรับ port 587
  auth: {
    user: EMAIL,
    pass: PASS
  },
  tls: {
    rejectUnauthorized: false // 🔥 แก้ error ที่คุณเจอ
  }
});

// ===== Register =====
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.send({ message: "รหัสผ่านไม่ตรงกัน" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.send({ message: "email ไม่ถูกต้อง" });
    }

    const exist = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (exist) {
      return res.send({ message: "username หรือ email ซ้ำ" });
    }

    const hash = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign(
      { email },
      "verifysecret",
      { expiresIn: "1h" } // 🔥 หมดอายุ
    );
    const user = new User({
      username,
      email,
      password: hash,
      verifyToken
    });

    await user.save();

    const link = `https://YOUR-BACKEND.onrender.com/verify/${verifyToken}`;

    // 🔥 ครอบตรงนี้
    try {
      await transporter.sendMail({
        to: email,
        subject: "Verify Email",
        html: `<a href="${link}">ยืนยัน email</a>`
      });
    } catch (mailErr) {
      console.log("MAIL ERROR:", mailErr);
      return res.send({ message: "สมัครสำเร็จ แต่ส่ง email ไม่ได้" });
    }

    res.send({ message: "สมัครสำเร็จ เช็ค email" });

  } catch (err) {
    console.log("REGISTER ERROR:", err);
    res.status(500).send({ message: "server error" });
  }
});

// ===== 7. VERIFY =====
app.get("/verify/:token", async (req, res) => {
  try {
    console.log("TOKEN:", req.params.token);

    // ✅ decode token
    const decoded = jwt.verify(req.params.token, "verifysecret");
    console.log("DECODED:", decoded);

    // ✅ หา user จาก email
    const user = await User.findOne({
      email: decoded.email
    });

    console.log("FOUND USER:", user);

    if (!user) {
      return res.send("ไม่พบ user");
    }

    // ✅ update
    user.verified = true;
    user.verifyToken = null;

    await user.save();

    console.log("UPDATED:", user);

    //res.send("verify สำเร็จ");
    res.redirect("https://YOUR-FRONTEND.onrender.com/login");

  } catch (err) {
    console.log("VERIFY ERROR:", err);
    res.send("token ไม่ถูกต้อง");
  }
});


// ===== Login =====
app.post("/login", async (req, res) => {
  const { iden, password } = req.body;

  const user = await User.findOne({
    $or: [{ username: iden }, { email: iden }]
  });

  console.log("BODY:", req.body);
  console.log("LOGIN USER:", user);

  if (!user) return res.send({ message: "ไม่พบ user" });

  if (!user.verified) {
    return res.send({ message: "กรุณายืนยัน email" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.send({ message: "username/email or password is wrong" });
  }

  const token = jwt.sign({ id: user._id }, SECRET);
  res.send({ token, username: user.username });
});

// ===== 9. FORGOT =====
app.post("/forget", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) return res.send({ message: "ไม่พบ email" });

  const resetToken = jwt.sign({ email: user.email }, "resetsecret");

  user.resetToken = resetToken;
  await user.save();

  const link = `https://YOUR-FRONTEND.onrender.com/reset/${resetToken}`;

  await transporter.sendMail({
    to: user.email,
    subject: "Reset Password",
    html: `<a href="${link}">Reset</a>`
  });

  res.send({ message: "ส่งลิงก์แล้ว" });
});

// ======== RESET =========
app.post("/reset/:token", async (req, res) => {
  try {
    const token = decodeURIComponent(req.params.token);

    console.log("TOKEN:", token);

    const decoded = jwt.verify(token, "resetsecret");
    console.log("DECODED:", decoded);

    const user = await User.findOne({
      email: decoded.email
    });

    console.log("DB TOKEN:", user?.resetToken);

    if (!user || user.resetToken !== token) {
      return res.send({ message: "token ไม่ถูกต้อง" });
    }

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.send({ message: "รหัสไม่ตรงกัน" });
    }

    const hash = await bcrypt.hash(password, 10);

    user.password = hash;
    user.resetToken = null;

    await user.save();

    res.send({ message: "เปลี่ยนรหัสสำเร็จ" });

  } catch (err) {
    console.log("RESET ERROR:", err);
    res.send({ message: "token หมดอายุหรือไม่ถูกต้อง" });
  }
});

// ================= AUTH MIDDLEWARE =================
const auth = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.send({ message: "no token" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.send({ message: "token ไม่ถูกต้อง" });
  }
};


// ===== สร้างโต๊ะ 170 ตัว =====
"ABCDEFGHIJ".split("").forEach(r => {
  for (let i = 1; i <= 17; i++) {
    tables.push({
      id: r + i,
      people: 0,
      userIds: [],
      peopleList: [],
      status: "EMPTY",
      reservedAt: null,
      lockedBy: null,
      lockedAt: null
    });
  }
});

//---------locktable-------------
app.post("/lockTable", auth, (req, res) => {

  const { tableId } = req.body;
  const userId = req.user.id;

  let table = tables.find(t => t.id === tableId);

  if (!table) {
    return res.send({ message: "ไม่พบโต๊ะ" });
  }

  const now = Date.now();

  if (
    table.lockedBy &&
    table.lockedBy !== userId &&
    now - table.lockedAt < 10000
  ) {
    return res.send({ message: "โต๊ะถูกเลือกโดยคนอื่น" });
  }

  table.lockedBy = userId;
  table.lockedAt = now;

  res.send({ success: true });

});

// ===== API: GET TABLES =====
app.get("/tables", auth, (req, res) => {
  const userId = req.user.id;

  const result = tables.map(t => ({
    id: t.id,
    people: t.people,
    status:
      t.status === "RESERVED" ? "BLUE" :
      t.people === 0 ? "GREEN" :
      t.people < 4 ? "YELLOW" : "RED",
      myTable: t.userIds.includes(userId),
      reservedAt: t.reservedAt
  }));

  res.send(result);
});

//--------------scan-----------

app.post("/scan", auth, (req, res) => {
  const { tableId } = req.body;

  let table = tables.find(t => t.id === tableId);

  if (!table) {
    return res.send({ message: "ไม่พบโต๊ะ" });
  }

  if (!table.userIds.includes(req.user.id)) {
    return res.send({ message: "นี่ไม่ใช่โต๊ะของคุณ" });
  }

  if (table.status !== "RESERVED") {
    return res.send({ message: "โต๊ะนี้ไม่ได้อยู่ในสถานะจอง" });
  }

  table.status = "CONFIRMED";
  table.reservedAt = null;

  res.send({ message: "ยืนยันโต๊ะสำเร็จ ✅" });
});

// ===== RESERVE TABLE =====
app.post("/reserve", auth , (req, res) => {
  try {

    const { people, tableId } = req.body;
    const userId = req.user.id;

    const p = parseInt(people);   // ✅ ประกาศตรงนี้ครั้งเดียว

    console.log("🔥 /reserve called");
    console.log("REQ BODY:", req.body);

    let hasTable = tables.find(t => t.userIds.includes(userId));
    if (hasTable) {
      return res.send({ message: "คุณมีโต๊ะอยู่แล้ว" });
    }

    let inQueue = queue.find(q => q.userId === userId);
    if (inQueue) {
      return res.send({ message: "คุณอยู่ในคิวแล้ว" });
    }

    if (tableId) {

      let table = tables.find(t => t.id === tableId);

      if (!table) {
        return res.send({ message: "ไม่พบโต๊ะ" });
      }

      if (!p || p <= 0) {
        return res.send({ message: "จำนวนคนไม่ถูกต้อง" });
      }

      if (table.people + p > 6) {
        return res.send({ message: "ที่นั่งไม่พอ" });
      }

      if (!table.userIds.includes(userId)) {
        table.userIds.push(userId);
        table.peopleList.push(p);
      }

      table.people += p;

      if (table.status === "EMPTY") {
        table.status = "RESERVED";
        table.reservedAt = Date.now();
      }

      table.lockedBy = null;
      table.lockedAt = null;

      return res.send({
        success: true,
        tableId: table.id,
        message: "เข้าร่วมโต๊ะ " + table.id
      });
    }

    // ✅ ใช้ p ตรงนี้ได้เลย
    queue.push({
      people: p,
      time: Date.now(),
      status: "waiting",
      userId: userId
    });

    return res.send({
      success: false,
      message: "โต๊ะเต็ม เข้าคิวลำดับที่ " + queue.length
    });

  } catch (err) {
    console.log("❌ RESERVE ERROR:", err);
    res.status(500).send({ message: "server error" });
  }
});

//--------------------------
//leave
//--------------------------

app.post("/leave", auth, (req, res) => {
  const { tableId } = req.body;

    console.log("LEAVE called, tableId:", tableId);  // ✅
  console.log("queue before:", queue);

  let table = tables.find(t => t.id === tableId);

  if (!table) {
    return res.send({ message: "ไม่พบโต๊ะ" });
  }

  // 🔥 หา index ก่อน
  const index = table.userIds.indexOf(req.user.id);

  if (index === -1) {
    return res.send({ message: "คุณไม่ได้อยู่โต๊ะนี้" });
  }

  // 🔥 เอาจำนวนคนออก
  const userPeople = table.peopleList[index];
  table.people -= userPeople;

  // 🔥 ลบ user + peopleList (ต้องลบคู่กัน)
  table.userIds.splice(index, 1);
  table.peopleList.splice(index, 1);

  // 🔥 ถ้าโต๊ะว่าง
  if (table.people <= 0) {
    table.people = 0;
    table.userIds = [];
    table.peopleList = [];
    table.status = "EMPTY";
    table.reservedAt = null;

    // 🔥 ดึง queue มาแทน
    if (queue.length > 0) {
      let next = queue.shift();

      table.userIds = [next.userId];
      table.peopleList = [next.people];
      table.people = next.people;

      table.status = "RESERVED";
      table.reservedAt = Date.now();

      next.assignedTableId = table.id;  // ✅ เพิ่มบรรทัดนี้

      // ✅ เก็บไว้ให้ polling ดึง
      assignedQueue.push({
        userId: next.userId,
        tableId: table.id,
        assignedAt: Date.now()
      });

      return res.send({
        message: "ออกจากโต๊ะแล้ว"
      });
    }
  }

  return res.send({
    message: "ออกจากโต๊ะแล้ว"
  });
});
//--------------------------

setInterval(() => {
  const now = Date.now();

  tables.forEach(t => {
    if (t.status === "RESERVED") {
      if (now - t.reservedAt > 300000) { // 5 นาที
        console.log("โต๊ะถูกปล่อย:", t.id);

        t.people = 0;
        t.userIds = [];
        t.status = "EMPTY";
        t.reservedAt = null;

        // 🔥 เอาคิวมาแทน
        if (queue.length > 0 && t.people === 0) {
          let next = queue.shift();

          t.people = next.people;
          t.userIds = [next.userId];
          t.status = "RESERVED";
          t.reservedAt = Date.now();

          // ✅ เพิ่มตรงนี้
          assignedQueue.push({
            userId: next.userId,
            tableId: t.id,
            assignedAt: Date.now()
          });
        }
      }
    }
  });
}, 5000);

//====== CALL QUEUE ======
app.post("/callQueue", (req, res) => {
  if (queue.length === 0) {
    return res.send({ message: "ไม่มีคิว" });
  }

  const next = queue.shift(); // เอาคิวแรกออก

  res.send({
    message: `เรียกคิว ${next.people} คน`
  });
});

// ===== MY QUEUE POSITION =====
app.get("/myQueue", auth, (req, res) => {
  
  const userId = req.user.id;
  console.log("assignedQueue:", assignedQueue); // ✅ เพิ่มตรงนี้
  console.log("userId:", userId);

  const assigned = assignedQueue.find(a => a.userId === userId);
  if (assigned) {
    assignedQueue = assignedQueue.filter(a => a.userId !== userId); // เคลียร์ทิ้ง
    return res.send({
      inQueue: false,
      assigned: true,
      tableId: assigned.tableId,
      message: `คิวเข้าโต๊ะ ${assigned.tableId} แล้ว`
    });
  }

  // หาตำแหน่งคิวของ user
  const index = queue.findIndex(q => q.userId === userId);

  // ถ้าไม่อยู่ในคิว
  if (index === -1) {
    return res.send({
      inQueue: false
    });
  }

  // ถ้าอยู่ในคิว
  res.send({
    inQueue: true,
    position: index + 1
  });

});

// ===== GET QUEUE =====  ← วางตรงนี้
app.get("/queue", auth, (req, res) => {
  res.send(queue);
});

// ===== START SERVER =====
app.listen(process.env.PORT || 4000, () => {
  console.log("Server running on 4000");
});
