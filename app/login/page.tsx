import { LoginCard } from "@/components/login-card.client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | NextFlow",
  description: "Sign in to NextFlow to create your workflows",
};

export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <LoginCard />
      </div>
    </main>
  );
}
