import Image from "next/image";

export default function Logo({
  size = 44,
  variant = "mark",
}: {
  size?: number;
  variant?: "mark" | "wordmark";
}) {
  if (variant === "wordmark") {
    return (
      <Image
        src="/brand/nexio-wordmark.png"
        alt="NexioBooks"
        width={220}
        height={72}
        className="h-10 w-auto object-contain sm:h-12"
        priority
      />
    );
  }

  return (
    <Image
      src="/brand/nexio-mark.png"
      alt="NexioBooks"
      width={size}
      height={size}
      className="rounded-md object-contain"
      style={{ width: size, height: size }}
      priority
    />
  );
}
