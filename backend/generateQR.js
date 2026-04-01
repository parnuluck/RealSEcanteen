const QRCode = require("qrcode");
const fs = require("fs");

// สร้าง list โต๊ะ
const tables = [];

"ABCDEFGHIJKLMNOPQ".split("").forEach(r => {
  for (let i = 1; i <= 10; i++) {
    tables.push(r + i);
  }
});

// สร้าง QR ทีละโต๊ะ
tables.forEach(id => {
  const text = id; // 👉 นี่คือข้อมูลใน QR

  QRCode.toFile(`./qrcodes/${id}.png`, text, {
    width: 300
  }, (err) => {
    if (err) console.log(err);
    else console.log("สร้าง QR:", id);
  });
});