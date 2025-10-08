"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-pink-100 flex items-center justify-center p-4">
      <SignUp
        appearance={{
          elements: {
            card: "shadow-2xl border border-blue-100",
          },
        }}
      />
    </div>
  );
}
