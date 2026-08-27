"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);
    setShake(false);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to callbackUrl or dashboard
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(data.error || "Invalid email or password.");
        setShake(true);
        // Reset shake after animation duration to allow re-triggering
        setTimeout(() => setShake(false), 500);
      }
    } catch (err) {
      console.error("Login request error:", err);
      setError("Unable to connect to the server. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={shake ? styles.cardError : styles.card}>
      <div className={styles.header}>
        <h1 className={styles.brandName}>Aarisha</h1>
        <p className={styles.subtitle}>Admin Portal</p>
      </div>

      {error && (
        <div className={styles.errorAlert} role="alert">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="vishwas@aarisha.com"
            className={styles.input}
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className={styles.input}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <>
              <div className={styles.spinner} />
              Authenticating...
            </>
          ) : (
            "Access Admin"
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className={styles.container}>
      <div className={styles.ambientLight} />
      <Suspense fallback={
        <div className={styles.card} style={{ textAlign: "center" }}>
          <h1 className={styles.brandName}>Aarisha</h1>
          <div className={styles.spinner} style={{ margin: "20px auto" }} />
          <p className={styles.subtitle}>Loading Portal...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}
