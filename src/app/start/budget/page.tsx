"use client";

import { useRouter } from "next/navigation";
import { useProfile } from "@/components/ProfileProvider";
import { BudgetSliders } from "@/components/BudgetSliders";
import { Disclaimer } from "@/components/Disclaimer";
import { Button, Eyebrow, Title } from "@/components/ui";

export default function BudgetStep() {
  const router = useRouter();
  const { profile, update, ready } = useProfile();
  if (!ready) return null;

  return (
    <div className="pm-fade-up space-y-10">
      <div>
        <Eyebrow>Step 3</Eyebrow>
        <Title className="mt-3">Balance your budget.</Title>
        <p className="mt-4 max-w-lg leading-relaxed text-muted">
          Tell us what you&apos;re comfortable spending and how much you care about getting the very best. We&apos;ll
          weigh every recommendation against both.
        </p>
      </div>

      <BudgetSliders value={profile.preferences} onChange={(preferences) => update((p) => ({ ...p, preferences }))} />

      <Disclaimer />

      <div className="flex items-center justify-between border-t border-line pt-6">
        <Button variant="ghost" onClick={() => router.push("/start/products")}>
          Back
        </Button>
        <Button
          onClick={() => {
            update((p) => ({ ...p, onboarding: { ...p.onboarding, budget: true, quiz: true } }));
            router.push("/profile");
          }}
        >
          Build my profile
        </Button>
      </div>
    </div>
  );
}
