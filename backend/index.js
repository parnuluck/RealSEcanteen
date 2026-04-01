require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();

// ================== CONFIG ==================
const SECRET = process.env.JWT_SECRET;

// ================== MIDDLEWARE ==================
app.use(cors({
  origin: process.env.CLIENT_URL,
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
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ================== AUTH MIDDLEWARE ==================
const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) return res.send({ message: "no token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.send({ message: "token ไม่ถูกต้อง" });
  }
};

// ================== AUTH ==================
app.post("/api/register", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.send({ message: "รหัสผ่านไม่ตรงกัน" });
  }

  const exist = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (exist) {
    return res.send({ message: "username หรือ email ซ้ำ" });
  }

  const hash = await bcrypt.hash(password, 10);

  const verifyToken = jwt.sign({ email }, SECRET, { expiresIn: "1h" });

  const user = new User({
    username,
    email,
    password: hash,
    verifyToken
  });

  await user.save();

  const link = `${process.env.CLIENT_URL}/verify/${verifyToken}`;

  await transporter.sendMail({
    to: email,
    subject: "Verify Email",
    html: `<a href="${link}">Verify Email</a>`
  });

  res.send({ message: "สมัครสำเร็จ" });
});

app.get("/api/verify/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, SECRET);

    const user = await User.findOne({ email: decoded.email });

    if (!user) return res.send("ไม่พบ user");

    user.verified = true;
    user.verifyToken = null;
    await user.save();

    res.redirect(`${process.env.CLIENT_URL}/login`);
  } catch {
    res.send("token ไม่ถูกต้อง");
  }
});

app.post("/api/login", async (req, res) => {
  const { iden, password } = req.body;

  const user = await User.findOne({
    $or: [{ username: iden }, { email: iden }]
  });

  if (!user) return res.send({ message: "ไม่พบ user" });

  if (!user.verified) {
    return res.send({ message: "กรุณายืนยัน email" });
  }

  const ok = await bcrypt.compare(password, user.password);

  if (!ok) return res.send({ message: "password ผิด" });

  const token = jwt.sign({ id: user._id }, SECRET);

  res.send({ token, username: user.username });
});

// ================== FORGOT ==================
app.post("/api/forget", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) return res.send({ message: "ไม่พบ email" });

  const resetToken = jwt.sign({ email: user.email }, SECRET, { expiresIn: "15m" });

  user.resetToken = resetToken;
  await user.save();

  const link = `${process.env.CLIENT_URL}/reset/${resetToken}`;

  await transporter.sendMail({
    to: user.email,
    subject: "Reset Password",
    html: `<a href="${link}">Reset Password</a>`
  });

  res.send({ message: "ส่งลิงก์แล้ว" });
});

app.post("/api/reset/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, SECRET);

    const user = await User.findOne({ email: decoded.email });

    if (!user || user.resetToken !== req.params.token) {
      return res.send({ message: "token ไม่ถูกต้อง" });
    }

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.send({ message: "รหัสไม่ตรงกัน" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = null;

    await user.save();

    res.send({ message: "เปลี่ยนรหัสสำเร็จ" });
  } catch {
    res.send({ message: "token หมดอายุ" });
  }
});

// ================== TABLE SYSTEM ==================
let tables = [];
let queue = [];
let assignedQueue = [];

// สร้างโต๊ะ
"ABCDEFGHIJ".split("").forEach(r => {
  for (let i = 1; i <= 17; i++) {
    tables.push({
      id: r + i,
      people: 0,
      userIds: [],
      peopleList: [],
      status: "EMPTY",
      reservedAt: null
    });
  }
});

// ================== API TABLE ==================
app.get("/api/tables", auth, (req, res) => {
  const userId = req.user.id;

  const result = tables.map(t => ({
    id: t.id,
    people: t.people,
    status:
      t.status === "RESERVED" ? "BLUE" :
      t.people === 0 ? "GREEN" :
      t.people < 4 ? "YELLOW" : "RED",
    myTable: t.userIds.includes(userId)
  }));

  res.send(result);
});

// ================== RESERVE ==================
app.post("/api/reserve", auth, (req, res) => {
  const { people, tableId } = req.body;
  const userId = req.user.id;
  const p = parseInt(people);

  let table = tables.find(t => t.id === tableId);

  if (!table) return res.send({ message: "ไม่พบโต๊ะ" });

  if (table.people + p > 6) {
    return res.send({ message: "ที่นั่งไม่พอ" });
  }

  table.people += p;
  table.userIds.push(userId);
  table.peopleList.push(p);
  table.status = "RESERVED";
  table.reservedAt = Date.now();

  res.send({ success: true });
});

// ================== LEAVE ==================
app.post("/api/leave", auth, (req, res) => {
  const { tableId } = req.body;

  let table = tables.find(t => t.id === tableId);

  if (!table) return res.send({ message: "ไม่พบโต๊ะ" });

  const index = table.userIds.indexOf(req.user.id);

  if (index === -1) return res.send({ message: "ไม่ได้อยู่โต๊ะนี้" });

  table.people -= table.peopleList[index];

  table.userIds.splice(index, 1);
  table.peopleList.splice(index, 1);

  if (table.people <= 0) {
    table.status = "EMPTY";
    table.people = 0;
  }

  res.send({ message: "ออกจากโต๊ะแล้ว" });
});

// ================== START ==================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});
