import { cookies } from 'next/headers';
import { PASSWORDS } from './constants';

export interface User {
  name: string;
  isAdmin: boolean;
  isSpotOperator: boolean;
  spotId?: string;
  phoneLast4?: string;
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  if (!userCookie) return null;
  try { return JSON.parse(userCookie.value); } catch { return null; }
}

export async function createSession(user: User) {
  const cookieStore = await cookies();
  cookieStore.set('user', JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete('user');
}

export interface PasswordVerificationResult {
  isValid: boolean;
  isAdmin: boolean;
  isSpotOperator: boolean;
  spotId?: string;
}

export function verifyPassword(password: string): PasswordVerificationResult {
  if (password === PASSWORDS.ADMIN) return { isValid: true, isAdmin: true, isSpotOperator: false };
  if (password === PASSWORDS.USER) return { isValid: true, isAdmin: false, isSpotOperator: false };

  const spotOperators = PASSWORDS.SPOT_OPERATORS as Record<string, string>;
  for (const [spotId, spotPassword] of Object.entries(spotOperators)) {
    if (password === spotPassword) return { isValid: true, isAdmin: false, isSpotOperator: true, spotId };
  }

  return { isValid: false, isAdmin: false, isSpotOperator: false };
}
