interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "gold" | "black" | "cream";
  className?: string;
}

const sizes = {
  sm: "h-9 w-20",
  md: "h-12 w-28",
  lg: "h-20 w-48",
  xl: "h-28 w-64",
  "2xl": "h-36 w-80",
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <div className={`${sizes[size]} ${className} relative shrink-0 overflow-hidden rounded-xl border border-foodiz-gold/20 bg-foodiz-kraft shadow-[0_0_24px_rgba(216,168,79,.12)]`}>
      <img
        src="/images/Logo-Foodiz.PNG"
        alt="Foodiz"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
    </div>
  );
}
