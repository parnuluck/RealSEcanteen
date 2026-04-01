require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();

// ================== CONFIG ==================
// ✅ All secrets now come from environment variables (set these in Render dashboard)
const SECRET        = process.env.JWT_SECRET;
const VERIFY_SECRET = process.env.VERIFY_SECRET;
const RESET_SECRET  = process.env.RESET_SECRET;
const EMAIL         = process.env.EMAIL_USER;
const PASS          = process.env.EMAIL_PASS;
const CLIENT_URL    = process.env.CLIENT_URL;   // your frontend Render URL
const BACKEND_URL   = process.env.BACKEND_URL;  // your backend Render URL

// ================== MIDDLEWARE ==================
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// ================== TEST ==================
app.get("/", (req, res) => {
  res.send("API running ✅");
});

// ================== MONGODB ==================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ Mongo error:", err));

// ================== MODEL ==================
const User = mongoose.model("User", {
  username: String,
  email: String,
  password: String,
  verified: { type: Boolean, default: false },
  verifyToken: String,
  resetToken: String
});

// ================== EMAIL ==================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: EMAIL,
    pass: PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// ================== AUTH MIDDLEWARE ==================
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.send({ message: "no token" });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.send({ message: "token ไม่ถูกต้อง" });
  }
};

// ================== DATABASE (in-memory) ==================
let tables = [];
let queue = [];
let assignedQueue = [];

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

// ================== REGISTER ==================
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword)
      return res.send({ message: "รหัสผ่านไม่ตรงกัน" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.send({ message: "email ไม่ถูกต้อง" });

    const exist = await User.findOne({ $or: [{ username }, { email }] });
    if (exist) return res.send({ message: "username หรือ email ซ้ำ" });

    const hash = await bcrypt.hash(password, 10);
    const verifyToken = jwt.sign({ email }, VERIFY_SECRET, { expiresIn: "1h" });

    const user = new User({ username, email, password: hash, verifyToken });
    await user.save();

    // ✅ Link points to backend /verify route (not localhost)
    const link = `${BACKEND_URL}/verify/${verifyToken}`;

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

// ================== VERIFY ==================
app.get("/verify/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, VERIFY_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.send("ไม่พบ user");

    user.verified = true;
    user.verifyToken = null;
    await user.save();

    // ✅ Redirect to frontend (not localhost)
    res.redirect(`${CLIENT_URL}/login`);
  } catch (err) {
    console.log("VERIFY ERROR:", err);
    res.send("token ไม่ถูกต้อง");
  }
});

// ================== LOGIN ==================
app.post("/login", async (req, res) => {
  const { iden, password } = req.body;

  const user = await User.findOne({
    $or: [{ username: iden }, { email: iden }]
  });

  if (!user) return res.send({ message: "ไม่พบ user" });
  if (!user.verified) return res.send({ message: "กรุณายืนยัน email" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.send({ message: "username/email or password is wrong" });

  const token = jwt.sign({ id: user._id }, SECRET);
  res.send({ token, username: user.username });
});

// ================== FORGOT PASSWORD ==================
app.post("/forget", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.send({ message: "ไม่พบ email" });

  const resetToken = jwt.sign({ email: user.email }, RESET_SECRET);
  user.resetToken = resetToken;
  await user.save();

  // ✅ Reset link goes to frontend (not localhost)
  const link = `${CLIENT_URL}/reset/${resetToken}`;

  await transporter.sendMail({
    to: user.email,
    subject: "Reset Password",
    html: `<a href="${link}">Reset</a>`
  });

  res.send({ message: "ส่งลิงก์แล้ว" });
});

// ================== RESET PASSWORD ==================
app.post("/reset/:token", async (req, res) => {
  try {
    const token = decodeURIComponent(req.params.token);
    const decoded = jwt.verify(token, RESET_SECRET);

    const user = await User.findOne({ email: decoded.email });
    if (!user || user.resetToken !== token)
      return res.send({ message: "token ไม่ถูกต้อง" });

    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword)
      return res.send({ message: "รหัสไม่ตรงกัน" });

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = null;
    await user.save();

    res.send({ message: "เปลี่ยนรหัสสำเร็จ" });
  } catch (err) {
    console.log("RESET ERROR:", err);
    res.send({ message: "token หมดอายุหรือไม่ถูกต้อง" });
  }
});

// ================== LOCK TABLE ==================
app.post("/lockTable", auth, (req, res) => {
  const { tableId } = req.body;
  const userId = req.user.id;

  let table = tables.find(t => t.id === tableId);
  if (!table) return res.send({ message: "ไม่พบโต๊ะ" });

  const now = Date.now();
  if (table.lockedBy && table.lockedBy !== userId && now - table.lockedAt < 10000)
    return res.send({ message: "โต๊ะถูกเลือกโดยคนอื่น" });

  table.lockedBy = userId;
  table.lockedAt = now;
  res.send({ success: true });
});

// ================== GET TABLES ==================
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

// ================== SCAN QR ==================
app.post("/scan", auth, (req, res) => {
  const { tableId } = req.body;

  let table = tables.find(t => t.id === tableId);
  if (!table) return res.send({ message: "ไม่พบโต๊ะ" });
  if (!table.userIds.includes(req.user.id))
    return res.send({ message: "นี่ไม่ใช่โต๊ะของคุณ" });
  if (table.status !== "RESERVED")
    return res.send({ message: "โต๊ะนี้ไม่ได้อยู่ในสถานะจอง" });

  table.status = "CONFIRMED";
  table.reservedAt = null;
  res.send({ message: "ยืนยันโต๊ะสำเร็จ ✅" });
});

// ================== RESERVE TABLE ==================
app.post("/reserve", auth, (req, res) => {
  try {
    const { people, tableId } = req.body;
    const userId = req.user.id;
    const p = parseInt(people);

    let hasTable = tables.find(t => t.userIds.includes(userId));
    if (hasTable) return res.send({ message: "คุณมีโต๊ะอยู่แล้ว" });

    let inQueue = queue.find(q => q.userId === userId);
    if (inQueue) return res.send({ message: "คุณอยู่ในคิวแล้ว" });

    if (tableId) {
      let table = tables.find(t => t.id === tableId);

      if (!table) return res.send({ message: "ไม่พบโต๊ะ" });
      if (!p || p <= 0) return res.send({ message: "จำนวนคนไม่ถูกต้อง" });
      if (table.people + p > 6) return res.send({ message: "ที่นั่งไม่พอ" });

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

    queue.push({ people: p, time: Date.now(), status: "waiting", userId });

    return res.send({
      success: false,
      message: "โต๊ะเต็ม เข้าคิวลำดับที่ " + queue.length
    });

  } catch (err) {
    console.log("❌ RESERVE ERROR:", err);
    res.status(500).send({ message: "server error" });
  }
});

// ================== LEAVE TABLE ==================
app.post("/leave", auth, (req, res) => {
  const { tableId } = req.body;

  let table = tables.find(t => t.id === tableId);
  if (!table) return res.send({ message: "ไม่พบโต๊ะ" });

  const index = table.userIds.indexOf(req.user.id);
  if (index === -1) return res.send({ message: "คุณไม่ได้อยู่โต๊ะนี้" });

  table.people -= table.peopleList[index];
  table.userIds.splice(index, 1);
  table.peopleList.splice(index, 1);

  if (table.people <= 0) {
    table.people = 0;
    table.userIds = [];
    table.peopleList = [];
    table.status = "EMPTY";
    table.reservedAt = null;

    if (queue.length > 0) {
      let next = queue.shift();
      table.userIds = [next.userId];
      table.peopleList = [next.people];
      table.people = next.people;
      table.status = "RESERVED";
      table.reservedAt = Date.now();
      assignedQueue.push({ userId: next.userId, tableId: table.id, assignedAt: Date.now() });
    }
  }

  return res.send({ message: "ออกจากโต๊ะแล้ว" });
});

// ================== AUTO-RELEASE TABLES (5 min timeout) ==================
setInterval(() => {
  const now = Date.now();
  tables.forEach(t => {
    if (t.status === "RESERVED" && now - t.reservedAt > 300000) {
      console.log("โต๊ะถูกปล่อย:", t.id);

      t.people = 0;
      t.userIds = [];
      t.peopleList = [];
      t.status = "EMPTY";
      t.reservedAt = null;

      if (queue.length > 0) {
        let next = queue.shift();
        t.people = next.people;
        t.userIds = [next.userId];
        t.peopleList = [next.people];
        t.status = "RESERVED";
        t.reservedAt = Date.now();
        assignedQueue.push({ userId: next.userId, tableId: t.id, assignedAt: Date.now() });
      }
    }
  });
}, 5000);

// ================== CALL QUEUE ==================
app.post("/callQueue", (req, res) => {
  if (queue.length === 0) return res.send({ message: "ไม่มีคิว" });
  const next = queue.shift();
  res.send({ message: `เรียกคิว ${next.people} คน` });
});

// ================== MY QUEUE POSITION ==================
app.get("/myQueue", auth, (req, res) => {
  const userId = req.user.id;

  const assigned = assignedQueue.find(a => a.userId === userId);
  if (assigned) {
    assignedQueue = assignedQueue.filter(a => a.userId !== userId);
    return res.send({
      inQueue: false,
      assigned: true,
      tableId: assigned.tableId,
      message: `คิวเข้าโต๊ะ ${assigned.tableId} แล้ว`
    });
  }

  const index = queue.findIndex(q => q.userId === userId);
  if (index === -1) return res.send({ inQueue: false });

  res.send({ inQueue: true, position: index + 1 });
});

// ================== GET QUEUE ==================
app.get("/queue", auth, (req, res) => {
  res.send(queue);
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});
