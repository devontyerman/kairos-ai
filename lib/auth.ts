/**
 * Server-side auth helpers.
 * Import only from Server Components or Route Handlers — never from client components.
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { upsertUser, getUserByClerkId, AppUser } from "./db";

/**
 * Returns the current app_user row (upserting if needed).
 * Throws if user is not authenticated or is disabled.
 */
export async function requireUser(): Promise<AppUser> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthenticated");

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const firstName = clerkUser.firstName ?? null;
  const lastName = clerkUser.lastName ?? null;
  const user = await upsertUser(userId, email, firstName, lastName);

  if (user.is_disabled) throw new Error("Account disabled");
  return user;
}

/**
 * Returns the current app_user and asserts admin role.
 */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Forbidden: admin only");
  return user;
}

/**
 * Returns null if user is not authenticated or not found.
 * Does NOT throw — safe to use for optional auth checks.
 */
export async function getOptionalUser(): Promise<AppUser | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    return getUserByClerkId(userId);
  } catch {
    return null;
  }
}
