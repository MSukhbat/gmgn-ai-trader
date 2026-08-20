import { TokenData } from "../types/token.js";
export function ageScore(token: TokenData): number {
  const age = token.ageMinutes;

  if (age < 5) return 2;
  if (age < 10) return 5;
  if (age <= 60) return 10;
  if (age <= 180) return 8;
  if (age <= 360) return 6;
  if (age <= 720) return 4;

  return 2;
}
