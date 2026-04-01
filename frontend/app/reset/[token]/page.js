"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

const EyeOpen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeClosed = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const PasswordInput = ({ placeholder, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2 w-64">
      <input
        placeholder={placeholder}
        type={show ? "text" : "password"}
        onChange={onChange}
        className="border rounded-full px-4 py-2 w-full outline-none focus:border-orange-500"
      />
      <button type="button" onClick={() => setShow(!show)} className="p-2 text-gray-600">
        {show ? <EyeOpen /> : <EyeClosed />}
      </button>
    </div>
  );
};

export default function Reset() {
  const { token } = useParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");

  const reset = async () => {
    try {
      const res = await axios.post(`https://realsecanteen-4.onrender.com/reset/${token}`, {
        password,
        confirmPassword,
      });

      alert(res.data.message);

      if (res.data.message === "เปลี่ยนรหัสสำเร็จ") {
        router.push("/login");
      }
    } catch (err) {
      alert("error");
      console.log(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white shadow-xl rounded-2xl p-8 flex flex-col gap-4 items-center">

        <h1 className="text-2xl font-bold">Reset Password</h1>

        {/* PASSWORD */}
        <PasswordInput
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* CONFIRM PASSWORD */}
        <PasswordInput
          placeholder="Confirm Password"
          onChange={(e) => setConfirm(e.target.value)}
        />

        {/* RESET */}
        <button
          onClick={reset}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 py-2 w-64 font-semibold"
        >
          Reset Password
        </button>

        {/* BACK TO LOGIN */}
        <button
          onClick={() => router.push("/login")}
          className="border border-orange-500 text-orange-500 rounded-full px-4 py-2 w-64 hover:bg-orange-50"
        >
          Back to Login
        </button>

      </div>
    </div>
  );
}
