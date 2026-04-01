"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Forget() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const forget = async () => {
    try {
      const res = await axios.post("http://localhost:4000/forget", { email });
      alert(res.data.message);
    } catch (err) {
      alert("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white shadow-xl rounded-2xl p-8 flex flex-col gap-4 items-center">

        <h1 className="text-2xl font-bold">Forgot Password</h1>

        <p className="text-sm text-gray-500 text-center w-64">
          Enter your email and we'll send you a reset link.
        </p>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded-full px-4 py-2 w-64 outline-none focus:border-orange-500"
        />

        {/* SEND */}
        <button
          onClick={forget}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 py-2 w-64 font-semibold"
        >
          Send Email
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