"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Login() {

  const [iden, setIden] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const router = useRouter();

  const login = async () => {
    try {
      const res = await axios.post("https://realsecanteen-3.onrender.com/login", { iden, password });
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify({ name: res.data.username }));
        router.push("/");
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white shadow-xl rounded-2xl p-8 flex flex-col gap-4 items-center">

        <h1 className="text-2xl font-bold">Login</h1>

        {/* USERNAME */}
        <input
          placeholder="Username / Email"
          onChange={(e) => setIden(e.target.value)}
          className="border rounded-full px-4 py-2 w-64 outline-none focus:border-orange-500"
        />

        {/* PASSWORD */}
        <div className="flex items-center gap-2 w-64">
          <input
            placeholder="Password"
            type={show ? "text" : "password"}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-full px-4 py-2 w-full outline-none focus:border-orange-500"
          />

          <button type="button" onClick={() => setShow(!show)} className="p-2 text-gray-600">
            {show ? (
              // Eye open
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              // Eye closed
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            )}
          </button>
        </div>

        {/* LOGIN */}
        <button
          onClick={login}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 py-2 w-64 font-semibold"
        >
          Login
        </button>

        {/* REGISTER */}
        <button
          onClick={() => router.push("/register")}
          className="border border-orange-500 text-orange-500 rounded-full px-4 py-2 w-64 hover:bg-orange-50"
        >
          Register
        </button>

        {/* FORGET */}
        <button
          onClick={() => router.push("/forget")}
          className="text-sm text-gray-500 hover:text-orange-500"
        >
          Forget Password
        </button>

      </div>
    </div>
  );
}
