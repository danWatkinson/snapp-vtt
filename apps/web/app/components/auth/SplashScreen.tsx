"use client";

interface SplashScreenProps {
  dimmed?: boolean;
}

export default function SplashScreen({ dimmed = false }: SplashScreenProps) {
  return (
    <div
      className={
        "relative aspect-[16/9] w-full overflow-hidden rounded-lg border" +
        (dimmed ? " pointer-events-none" : "")
      }
      style={{
        borderColor: "#8b6f47",
        backgroundImage:
          "linear-gradient(45deg, #facc15 25%, transparent 25%, transparent 50%, #facc15 50%, #facc15 75%, transparent 75%, transparent)",
        backgroundSize: "40px 40px",
        backgroundColor: "#fefce8"
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: "rotate(-15deg" }}
      >
        <span
          className="text-6xl sm:text-7xl font-extrabold uppercase tracking-widest"
          style={{
            fontFamily: "'Cinzel', serif",
            color: "#3d2817",
            textShadow: "2px 2px 0 #fefce8"
          }}
        >
          Snapp
        </span>
      </div>
    </div>
  );
}

