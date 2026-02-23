"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";

interface Props {
  userRole: "admin" | "agent";
}

interface SimpleUser {
  clerk_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export default function AppNav({ userRole }: Props) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [users, setUsers] = useState<SimpleUser[] | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === "admin";

  const navLinks = [
    { href: "/train", label: "Train" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [dropdownOpen]);

  // Fetch users when admin opens dropdown
  useEffect(() => {
    if (dropdownOpen && isAdmin && !users) {
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setUsers(data);
        })
        .catch(() => {});
    }
  }, [dropdownOpen, isAdmin, users]);

  const displayName = (u: SimpleUser) => {
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
    return name || u.email;
  };

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-6">
      <Link href="/train" className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          K
        </div>
        <span className="font-semibold text-gray-900 text-sm">Kairos AI</span>
      </Link>

      <div className="flex items-center gap-1 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(link.href)
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {link.label}
          </Link>
        ))}

        {/* Profile link — dropdown for admins, simple link for agents */}
        {isAdmin ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                pathname.startsWith("/profile")
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Profiles
              <svg
                className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-900 font-medium hover:bg-gray-50 border-b border-gray-100"
                >
                  My Profile
                </Link>
                {users === null ? (
                  <div className="px-4 py-3 text-xs text-gray-400">
                    Loading...
                  </div>
                ) : (
                  users.map((u) => (
                    <Link
                      key={u.clerk_user_id}
                      href={`/profile/${u.clerk_user_id}`}
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {displayName(u)}
                      <span className="text-gray-400 text-xs block">
                        {u.email}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/profile"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith("/profile")
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Profile
          </Link>
        )}
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
