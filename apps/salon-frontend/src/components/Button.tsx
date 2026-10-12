import React from "react";

type Variant = "primary" | "secondary" | "ghost";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition " +
  "focus:outline-none focus:ring-4 focus:ring-[var(--ring)] active:scale-[0.99]";

const variants: Record<Variant, string> = {
  primary:
    "bg-blush-500 text-white shadow-glow hover:bg-blush-600 hover:shadow-glow",
  secondary:
    "bg-white/80 text-slate-900 border border-white/60 shadow-soft hover:bg-white",
  ghost: "bg-transparent text-slate-800 hover:bg-white/60"
};

export default function Button({
  variant = "primary",
  fullWidth,
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={[
        base,
        variants[variant],
        fullWidth ? "w-full" : "",
        className
      ].join(" ")}
      {...props}
    />
  );
}