import React from "react";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function Card({ className = "", children }: Props) {
  return (
    <div
      className={[
        "rounded-[28px] bg-white/70 border border-white/60 shadow-soft backdrop-blur-xl",
        className
      ].join(" ")}
    >
      {children}
    </div>
  );
}