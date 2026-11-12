import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
function sessionKey() {
  const secret=process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(secret);
}
export type User = { id: number; email: string; role: "admin" | "developer" };
export async function setSession(user: User) {
  const token = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(sessionKey());
  (await cookies()).set("session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
}
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, sessionKey())).payload as unknown as User; } catch { return null; }
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
