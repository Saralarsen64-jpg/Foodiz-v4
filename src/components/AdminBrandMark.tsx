export default function AdminBrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "sm" ? "h-11 w-11" : size === "lg" ? "h-20 w-20" : "h-16 w-16";

  return (
    <div
      className={`${dimensions} relative shrink-0 overflow-hidden rounded-full border-2 border-foodiz-gold/70 bg-foodiz-kraft shadow-[0_0_24px_rgba(216,168,79,.2)]`}
      aria-label="Weello"
    >
      <img
        src="/images/weello-app-icon-v2.png"
        alt="Weello"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
