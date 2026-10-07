"use client";

import { useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { Button, ButtonLink, Card, Chip, Eyebrow, Field, Input, Notice, Spinner, Title } from "@/components/ui";
import { friendlyAuthError, getSupabase } from "@/lib/supabase";

type Mode = "signin" | "signup" | "magic";

export default function AccountPage() {
  const { ready, user, accountsEnabled, sync, syncError, signOut, profile } = useProfile();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string }>();
  const hasGuestData = !!(profile.photo || profile.products.length || profile.onboarding.quiz);

  if (!ready)
    return (
      <div className="grid min-h-[40vh] place-items-center text-muted">
        <Spinner />
      </div>
    );

  if (!accountsEnabled)
    return (
      <div className="mx-auto max-w-xl space-y-6 px-5 py-16">
        <Eyebrow>Account</Eyebrow>
        <Title>You&apos;re in guest mode.</Title>
        <p className="leading-relaxed text-muted">
          Your profile is saved in this browser. Accounts (so your profile follows you across devices) switch on once
          this site is connected to a free Supabase project — see <code className="text-ink">README.md</code> →
          &ldquo;Accounts&rdquo;.
        </p>
        <ButtonLink href="/profile" variant="secondary">
          Back to my profile
        </ButtonLink>
      </div>
    );

  if (user)
    return (
      <div className="mx-auto max-w-xl space-y-6 px-5 py-16">
        <Eyebrow>Account</Eyebrow>
        <Title>Signed in.</Title>
        <Card className="space-y-2">
          <p className="text-sm text-muted">Email</p>
          <p className="font-medium">{user.email}</p>
          <p className="pt-2 text-sm text-muted">
            Sync:{" "}
            <span className={sync === "error" ? "text-bad" : "text-ink"}>
              {sync === "synced" ? "up to date" : sync === "syncing" ? "saving…" : sync === "error" ? "problem" : "local"}
            </span>
          </p>
          {syncError && <Notice tone="bad">{syncError}</Notice>}
        </Card>
        <div className="flex gap-2">
          <ButtonLink href="/profile">My profile</ButtonLink>
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-faint">
          Signing out removes the copy of your profile from this browser; it stays safe in your account.
        </p>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMessage(undefined);
    const redirect = `${window.location.origin}/account`;
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        setMessage({ tone: "good", text: "Check your email for a sign-in link. Open it in this same browser." });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        if (!data.session) setMessage({ tone: "good", text: "Almost there — confirm your email using the link we just sent, then come back." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage({ tone: "bad", text: friendlyAuthError((err as Error).message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 px-5 py-16">
      <Eyebrow>Account</Eyebrow>
      <Title>{mode === "signup" ? "Save your profile." : "Welcome back."}</Title>
      <p className="leading-relaxed text-muted">
        {hasGuestData
          ? "Create an account and everything you've done so far comes with you."
          : "Sign in to keep your profile in sync across devices."}
      </p>
      <div className="flex gap-2">
        <Chip selected={mode === "signup"} onClick={() => setMode("signup")}>
          Create account
        </Chip>
        <Chip selected={mode === "signin"} onClick={() => setMode("signin")}>
          Sign in
        </Chip>
        <Chip selected={mode === "magic"} onClick={() => setMode("magic")}>
          Email me a link
        </Chip>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {mode !== "magic" && (
          <Field label="Password" hint={mode === "signup" ? "At least 6 characters." : undefined}>
            <Input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy && <Spinner />}
          {mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send link"}
        </Button>
      </form>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {mode === "signin" && (
        <button type="button" className="text-sm text-muted underline underline-offset-4" onClick={() => setMode("magic")}>
          Forgot your password? Sign in with an email link instead.
        </button>
      )}
    </div>
  );
}
