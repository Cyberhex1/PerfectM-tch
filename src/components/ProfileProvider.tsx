"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadFoundations, type FoundationDb } from "@/lib/foundations";
import { buildSkinModel, type SkinModel } from "@/lib/learning";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { emptyProfile, type Profile } from "@/lib/types";

const STORAGE_KEY = "perfectmatch.profile.v1";
const OWNER_KEY = "perfectmatch.owner";

type SyncState = "local" | "syncing" | "synced" | "error";
type User = { id: string; email?: string };

type Ctx = {
  ready: boolean;
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
  reset: () => void;
  user: User | null;
  accountsEnabled: boolean;
  sync: SyncState;
  syncError?: string;
  signOut: () => Promise<void>;
  db: FoundationDb | null;
  dbError?: string;
  model: SkinModel;
};

const ProfileContext = createContext<Ctx | null>(null);

/** Placeholder used for the server render, before browser storage is read. */
const PLACEHOLDER = emptyProfile("1970-01-01T00:00:00.000Z");

function readLocal(): { profile: Profile; owner: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const owner = localStorage.getItem(OWNER_KEY) ?? "guest";
    if (!raw) return { profile: emptyProfile(), owner };
    return { profile: hydrate(JSON.parse(raw)), owner };
  } catch {
    return { profile: emptyProfile(), owner: "guest" };
  }
}

/** Fill in any fields added since the profile was saved. */
function hydrate(data: Partial<Profile> | null | undefined): Profile {
  const base = emptyProfile();
  if (!data || typeof data !== "object") return base;
  return {
    ...base,
    ...data,
    quiz: { ...base.quiz, ...(data.quiz ?? {}) },
    preferences: { ...base.preferences, ...(data.preferences ?? {}) },
    onboarding: { ...base.onboarding, ...(data.onboarding ?? {}) },
    products: Array.isArray(data.products) ? data.products : [],
    watchlist: Array.isArray(data.watchlist) ? data.watchlist : [],
    cleared: Array.isArray(data.cleared) ? data.cleared : [],
  };
}

function writeLocal(profile: Profile, owner: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(OWNER_KEY, owner);
  } catch {
    // storage full or blocked (private mode) — the in-memory profile still works
  }
}

const hasData = (p: Profile) => !!(p.photo || p.products.length || p.onboarding.quiz);
const uniq = (a: string[]) => [...new Set(a)];

/** Combine a guest profile into an account's profile so nothing logged is lost. */
function mergeGuestInto(account: Profile, guest: Profile): Profile {
  const newer = Date.parse(guest.updatedAt) > Date.parse(account.updatedAt) ? guest : account;
  const ids = new Set(account.products.map((p) => p.id));
  return {
    ...newer,
    photo: newer.photo ?? account.photo ?? guest.photo,
    products: [...account.products, ...guest.products.filter((p) => !ids.has(p.id))],
    watchlist: uniq([...account.watchlist, ...guest.watchlist]),
    cleared: uniq([...account.cleared, ...guest.cleared]),
    onboarding: {
      photo: account.onboarding.photo || guest.onboarding.photo,
      quiz: account.onboarding.quiz || guest.onboarding.quiz,
      products: account.onboarding.products || guest.onboarding.products,
      budget: account.onboarding.budget || guest.onboarding.budget,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(PLACEHOLDER);
  const [user, setUser] = useState<User | null>(null);
  const [sync, setSync] = useState<SyncState>("local");
  const [syncError, setSyncError] = useState<string>();
  const [db, setDb] = useState<FoundationDb | null>(null);
  const [dbError, setDbError] = useState<string>();
  const ownerRef = useRef("guest");
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(profile);

  const push = useCallback(async (p: Profile, uid: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    setSync("syncing");
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: uid, data: p, updated_at: p.updatedAt }, { onConflict: "user_id" });
    if (error) {
      setSync("error");
      setSyncError(
        /relation .* does not exist|schema cache/i.test(error.message)
          ? "The profiles table is missing — run supabase/schema.sql in your Supabase project."
          : error.message,
      );
    } else {
      setSync("synced");
      setSyncError(undefined);
    }
  }, []);

  const adopt = useCallback((p: Profile, owner: string) => {
    ownerRef.current = owner;
    latest.current = p;
    setProfile(p);
    writeLocal(p, owner);
  }, []);

  // 1) local profile + foundation library
  useEffect(() => {
    const local = readLocal();
    ownerRef.current = local.owner;
    latest.current = local.profile;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount avoids a hydration mismatch
    setProfile(local.profile);
    if (!supabaseConfigured) setReady(true);
    loadFoundations()
      .then(setDb)
      .catch((e: Error) => setDbError(e.message));
  }, []);

  // 2) account session + cloud sync
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;

    const onSession = async (sessionUser: User | null) => {
      if (cancelled) return;
      setUser(sessionUser);
      if (!sessionUser) {
        setSync("local");
        setReady(true);
        return;
      }
      setSync("syncing");
      const { data, error } = await supabase.from("profiles").select("data, updated_at").eq("user_id", sessionUser.id).maybeSingle();
      if (cancelled) return;
      const local = latest.current;
      if (error) {
        setSync("error");
        setSyncError(
          /relation .* does not exist|schema cache/i.test(error.message)
            ? "The profiles table is missing — run supabase/schema.sql in your Supabase project."
            : error.message,
        );
        setReady(true);
        return;
      }
      const remote = data?.data ? hydrate(data.data as Profile) : null;
      let next: Profile;
      if (!remote) next = local; // first sign-in: the guest profile becomes the account's
      else if (ownerRef.current === sessionUser.id)
        next = Date.parse(local.updatedAt) > Date.parse(remote.updatedAt) ? local : remote;
      else if (ownerRef.current === "guest" && hasData(local)) next = mergeGuestInto(remote, local);
      else next = remote; // local data belonged to someone else on this device
      adopt(next, sessionUser.id);
      setReady(true);
      if (next !== remote) await push(next, sessionUser.id);
      else setSync("synced");
    };

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      onSession(u ? { id: u.id, email: u.email } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        const u = session?.user;
        // defer: supabase-js warns against awaiting other calls inside this callback
        setTimeout(() => onSession(u ? { id: u.id, email: u.email } : null), 0);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [adopt, push]);

  const update = useCallback(
    (fn: (p: Profile) => Profile) => {
      const next = { ...fn(latest.current), updatedAt: new Date().toISOString() };
      latest.current = next;
      setProfile(next);
      writeLocal(next, ownerRef.current);
      const uid = ownerRef.current !== "guest" ? ownerRef.current : null;
      if (uid && supabaseConfigured) {
        if (pushTimer.current) clearTimeout(pushTimer.current);
        setSync("syncing");
        pushTimer.current = setTimeout(() => push(latest.current, uid), 700);
      }
    },
    [push],
  );

  const reset = useCallback(() => {
    update(() => ({ ...emptyProfile(), displayName: latest.current.displayName }));
  }, [update]);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
      if (user) await push(latest.current, user.id);
    }
    await supabase?.auth.signOut();
    // the profile lives in the account now; don't leave a copy on a shared device
    adopt(emptyProfile(), "guest");
    setUser(null);
    setSync("local");
  }, [adopt, push, user]);

  const model = useMemo(() => buildSkinModel(profile, db), [profile, db]);

  const value = useMemo<Ctx>(
    () => ({ ready, profile, update, reset, user, accountsEnabled: supabaseConfigured, sync, syncError, signOut, db, dbError, model }),
    [ready, profile, update, reset, user, sync, syncError, signOut, db, dbError, model],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}
