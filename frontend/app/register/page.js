"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();

  const register = async () => {
    try {
      const res = await axios.post("http://localhost:4000/register", {
        username,
        email,
        password,
        confirmPassword: confirm,
      });
      alert(res.data.message);

      if (res.data.message === "สมัครสำเร็จ เช็ค email") {
        router.push("/login");
      }
    } catch (err) {
      alert("Register failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white shadow-xl rounded-2xl p-8 flex flex-col gap-4 items-center">

        <h1 className="text-2xl font-bold">Register</h1>

        {/* USERNAME */}
        <input
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
          className="border rounded-full px-4 py-2 w-64 outline-none focus:border-orange-500"
        />

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded-full px-4 py-2 w-64 outline-none focus:border-orange-500"
        />

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

        {/* REGISTER */}
        <button
          onClick={register}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 py-2 w-64 font-semibold"
        >
          Register
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