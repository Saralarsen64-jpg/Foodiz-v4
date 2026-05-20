import { cn } from "../utils/cn";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "gold" | "black" | "cream";
  className?: string;
}

const sizes = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
  "2xl": "text-8xl",
};

const colors = {
  gold: "#D8A84F",
  black: "#0A0A0A",
  cream: "#FFF8EA",
};

/**
 * Real Foodiz logo: serif italic premium (Playfair Display Italic),
 * F capital + rest lowercase, decorative swash on Z, curved underline beneath.
 */
export default function Logo({ size = "md", variant = "gold", className }: LogoProps) {
  const color = colors[variant];

  return (
    <div className={cn("inline-flex flex-col items-center leading-none select-none", className)}>
      <span
        className={cn("foodiz-logo-text", sizes[size])}
        style={{ color, fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 600, letterSpacing: "-0.01em" }}
      >
        Foodi<span className="foodiz-logo-z" style={{ display: "inline-block" }}>z</span>
      </span>
      {/* Curved underline SVG */}
      <svg
        viewBox="0 0 120 12"
        className={cn(
          "mt-0.5 w-full",
          size === "sm" && "max-w-[60px]",
          size === "md" && "max-w-[80px]",
          size === "lg" && "max-w-[140px]",
          size === "xl" && "max-w-[200px]",
          size === "2xl" && "max-w-[280px]",
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 6 Q 30 2, 60 6 T 118 6"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
