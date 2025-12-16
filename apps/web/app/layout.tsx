import type { ReactNode } from "react";
import "./globals.css";
import Banner from "./components/Banner";

export const metadata = {
  title: "Snapp VTT",
  description: "Virtual Table Top – Auth and Roles"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Banner />
        <main className="mx-auto max-w-3xl p-6">{children}</main>
      </body>
    </html>
  );
}


