import { cx } from "./ui";

export function Disclaimer({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cx("rounded-2xl border border-accent/20 bg-accent-soft/60 px-5 py-4 text-sm leading-relaxed", className)}>
      <p className="font-medium text-accent">Your matches get better with time</p>
      <p className="mt-1 text-ink/80">
        We work hard to give you the best possible matches from your starting info — but a photo and a quiz can only
        tell us so much. {compact ? "" : "Lighting, cameras and swatch photos all vary. "}The perfect matches come from
        what you tell us next: every product you log as loved, tolerated or not-for-you teaches your profile a little
        more.
      </p>
    </div>
  );
}
