import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kairos AI Sales Trainer",
  description: "Practice your sales skills with an AI prospect in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-white text-gray-900 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
