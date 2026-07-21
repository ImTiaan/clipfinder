import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Clipfinder",
    template: "%s | Clipfinder",
  },
  description:
    "On-stream Twitch clip queue for filtered ChaseRP moments, styled to match the teewee.live presentation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
