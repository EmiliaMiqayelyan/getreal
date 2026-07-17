import type { Metadata } from "next";

import { plusJakartaSans } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GetReal Food",
    template: "%s | GetReal Food",
  },
  description: "GetReal Food administration panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} min-h-dvh font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
