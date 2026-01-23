"use client";
import { useState } from "react";
import DialogueStudy from "@/components/DialogueStudy";

export default function NederlandsPage() {
  const [password, setPassword] = useState("");
  const correctPassword = "nederlands2026";

  if (password !== correctPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            🔒 Page Perso
          </h1>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe..."
            className="w-full p-4 border-2 border-gray-300 rounded-xl text-lg focus:border-blue-500 focus:outline-none"
          />

          <button
            onClick={() => setPassword("")}
            className="w-full mt-4 p-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600"
          >
            Effacer
          </button>
        </div>
      </div>
    );
  }

  return <DialogueStudy />;
}
