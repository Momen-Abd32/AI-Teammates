import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Teammates",
  description: "Secure personal AI teammates for IT teams",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
