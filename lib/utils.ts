import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMiddleInitial(
  middleName: string | null | undefined,
): string {
  // 1. Handle invalid input: If the name is null, undefined, or empty, return an empty string.
  if (!middleName || typeof middleName !== "string") {
    return " ";
  }

  // 2. Trim whitespace from the name to handle inputs like "  David  "
  const trimmedName = middleName.trim();

  // 3. If the trimmed name is empty, there's no initial to get.
  if (trimmedName.length === 0) {
    return " ";
  }

  // 4. Get the first character, convert it to uppercase.
  const initial = trimmedName[0].toUpperCase();

  // 5. Return the initial, adding a period if requested.
  return ` ${initial}. `;
}
