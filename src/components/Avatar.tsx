type AvatarProps = {
  name?: string | null;
  initials?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-xl",
};

function fallbackInitials(name?: string | null, initials?: string | null) {
  if (initials?.trim()) return initials.trim().slice(0, 2).toUpperCase();
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Avatar({
  name,
  initials,
  src,
  size = "md",
  className = "",
}: AvatarProps) {
  const label = fallbackInitials(name, initials);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name}'s profile photo` : "Profile photo"}
        className={`rounded-full object-cover ${sizeClass[size]} ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full bg-[var(--gold)]/20 font-semibold text-[var(--gold-muted)] ${sizeClass[size]} ${className}`}
    >
      {label}
    </span>
  );
}
