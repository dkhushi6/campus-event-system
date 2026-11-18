"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { Alert, Field } from "@/components/ui";

type Mode = "login" | "signup";

/** Shared sign-in / sign-up form. Both modes post to the auth API routes. */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [role, setRole] = useState<string>("STUDENT");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);
    setFields({});

    const form = new FormData(formEvent.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const response = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setFields(data.fields ?? {});
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-6 flex items-center gap-2 font-bold">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">
          CE
        </span>
        Campus Events
      </Link>

      <div className="card p-6">
        <h1 className="text-xl font-bold">
          {isSignup ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isSignup
            ? "Students register for events; organizers publish them and scan tickets."
            : "Use the email and password for your campus account."}
        </p>

        <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
          {error ? <Alert>{error}</Alert> : null}

          {isSignup ? (
            <Field label="Full name" htmlFor="name" error={fields.name}>
              <input
                id="name"
                name="name"
                className="input"
                required
                autoComplete="name"
                placeholder="Asha Verma"
              />
            </Field>
          ) : null}

          <Field label="Email" htmlFor="email" error={fields.email}>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              required
              autoComplete="email"
              placeholder="you@college.edu"
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            error={fields.password}
            hint={isSignup ? "At least 8 characters." : undefined}
          >
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              required
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </Field>

          {isSignup ? (
            <>
              <Field label="I am a" htmlFor="role" error={fields.role}>
                <select
                  id="role"
                  name="role"
                  className="select"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  {ROLES.filter((r) => r !== "ADMIN").map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </Field>

              {role === "STUDENT" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Enrollment no."
                    htmlFor="enrollmentNo"
                    error={fields.enrollmentNo}
                  >
                    <input
                      id="enrollmentNo"
                      name="enrollmentNo"
                      className="input"
                      placeholder="21CS1234"
                    />
                  </Field>
                  <Field
                    label="Department"
                    htmlFor="department"
                    error={fields.department}
                  >
                    <input
                      id="department"
                      name="department"
                      className="input"
                      placeholder="Computer Science"
                    />
                  </Field>
                </div>
              ) : null}
            </>
          ) : null}

          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending
              ? "Please wait…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {isSignup ? (
            <>
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-primary">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/signup" className="font-semibold text-primary">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
