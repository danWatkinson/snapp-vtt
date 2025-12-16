"use client";

import Link from "next/link";
import HeaderAuth from "./HeaderAuth";
import SnappMenu from "./SnappMenu";

export default function Banner() {
  return (
    <header
      data-component="Banner"
      className="relative flex items-center justify-between border-b px-6 py-4 snapp-header"
    >
      {/* Left: Snapp menu pinned to the left edge */}
      <div className="flex-shrink-0">
        <SnappMenu />
      </div>

      {/* Center: title + description */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center">
        <h1
          className="text-2xl sm:text-3xl font-bold snapp-heading leading-tight"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Snapp VTT
        </h1>
        <p className="text-xs sm:text-sm snapp-muted mt-0.5">
          Adventure & campaign planner
        </p>
      </div>

      {/* Right: login / user controls pinned to the right edge */}
      <div className="flex-shrink-0">
        <HeaderAuth />
      </div>
    </header>
  );
}
