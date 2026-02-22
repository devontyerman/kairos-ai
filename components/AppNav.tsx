"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

interface Props {
  userRole: "admin" | "agent";
}

export default function AppNav({ userRole }: Props) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/train", label: "Train" },
    ...(userRole === "admin"
      ? [{ href: "/admin", label: "Admin" }]
      : []),
  ];

  return (
    <nav className="border-b border-gray-800 bg-gray-950 px-6 py-3 flex items-center gap-6">
      <Link href="/train" className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          K
        </div>
        <span className="font-semibold text-white text-sm">Kairos AI</span>
      </Link>

      <div className="flex items-center gap-1 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(link.href)
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-8 h-8",
          },
        }}
      />
    </nav>
  );
}
