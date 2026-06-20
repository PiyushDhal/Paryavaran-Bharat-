"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "analyst"
  });
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await api.register(form);
      setToken(response.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register");
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-lg items-center">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-md border border-white/[0.08] bg-emerald-400/10">
            <UserPlus className="h-5 w-5 text-emerald-100" />
          </div>
          <CardTitle>Create Operator Account</CardTitle>
          <CardDescription>JWT authentication with analyst, planner, and admin-ready roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            {[
              ["full_name", "Full name", "text"],
              ["email", "Email", "email"],
              ["password", "Password", "password"]
            ].map(([key, label, type]) => (
              <div className="grid gap-2" key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  required
                />
              </div>
            ))}
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm text-white"
              >
                <option value="analyst">Analyst</option>
                <option value="planner">Planner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error ? <p className="rounded-md bg-red-400/10 p-3 text-sm text-red-100">{error}</p> : null}
            <Button type="submit">
              <UserPlus className="h-4 w-4" />
              Register
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
