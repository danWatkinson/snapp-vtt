"use client";

import Link from "next/link";
import HeaderAuth from "./HeaderAuth";

export default function Banner() {
  return (
    <header
      data-component="Banner"
      className="relative flex items-center gap-4 border-b px-6 py-4 snapp-header"
    >
      <div className="space-y-1 pr-32">
        <h1
          className="text-2xl sm:text-3xl font-bold snapp-heading"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Snapp VTT
        </h1>
        <p className="text-xs sm:text-sm snapp-muted">
          Virtual Table Top – Auth, Worlds, Campaigns & Sessions
        </p>
      </div>

      <HeaderAuth />
    </header>
  );
}
