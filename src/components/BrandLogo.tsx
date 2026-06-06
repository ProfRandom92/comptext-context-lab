import iconAsset from "@/assets/comptext-icon.jpg.asset.json";
import logoAsset from "@/assets/comptext-logo.jpg.asset.json";

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

export function BrandLogo({ className = "h-10", alt = "Comptext — The Operating System for Context" }: Props) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      className={`${className} object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}

export function BrandLockup({ tagline = false }: { tagline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandIcon className="size-7" />
      <div className="leading-none">
        <div className="font-mono text-sm font-bold tracking-[0.18em]">COMPTEXT</div>
        {tagline && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            os for context
          </div>
        )}
      </div>
    </div>
  );
}
