import iconAsset from "@/assets/comptext-icon.jpg.asset.json";
import wordmarkAsset from "@/assets/comptext-logo-mark.png.asset.json";

type Props = { className?: string; alt?: string };

export function BrandIcon({ className = "size-7", alt = "Comptext" }: Props) {
  return (
    <img
      src={iconAsset.url}
      alt={alt}
      className={`${className} rounded-md object-contain`}
      width={64}
      height={64}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Cut-out wordmark on transparent background.
 * `tone="auto"` inverts to white in dark mode so the mark melts into the bg.
 */
export function BrandLogo({
  className = "h-10",
  alt = "Comptext",
  tone = "auto",
}: Props & { tone?: "auto" | "dark" | "light" }) {
  const invert =
    tone === "light"
      ? "invert"
      : tone === "auto"
        ? "dark:invert"
        : "";
  return (
    <img
      src={wordmarkAsset.url}
      alt={alt}
      className={`${className} object-contain select-none ${invert}`}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}

export function BrandLockup({ tagline = false }: { tagline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandIcon className="size-7" />
      <BrandLogo className="h-4" />
      {tagline && (
        <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          os for context
        </span>
      )}
    </div>
  );
}
