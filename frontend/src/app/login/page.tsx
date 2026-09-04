"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { InputField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email hoặc mật khẩu không đúng."
          : authError.message
      );
      setLoading(false);
      return;
    }

    const from = searchParams.get("from");
    router.push(from && from !== "/login" ? from : "/admin");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <CardTitle className="text-xl">CLB Cầu Lông HDA</CardTitle>
        <CardSubtitle>Đăng nhập để quản lý lịch, thành viên và quỹ CLB</CardSubtitle>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField
          label="Email"
          type="email"
          placeholder="admin@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <InputField
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="rounded-control bg-danger-50 px-3.5 py-2.5 text-sm text-danger-text">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-1">
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
