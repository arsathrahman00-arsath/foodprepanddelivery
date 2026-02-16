import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert string to Proper Case: "hello world" → "Hello World" */
export function toProperCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Allow only numeric input (integers and decimals). Blocks letters and special chars except dot. */
export function numericOnly(e: React.KeyboardEvent<HTMLInputElement>) {
  const allowed = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Home", "End"];
  if (allowed.includes(e.key)) return;
  if (e.key === "." && !e.currentTarget.value.includes(".")) return;
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

/** Allow only alphabets and spaces. Blocks numbers and special chars. */
export function alphabetOnly(e: React.KeyboardEvent<HTMLInputElement>) {
  const allowed = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Home", "End"];
  if (allowed.includes(e.key)) return;
  if (!/^[a-zA-Z ]$/.test(e.key)) {
    e.preventDefault();
  }
}

/** Format date string (ISO/yyyy-MM-dd) to DD-MM-YYYY for table display */
export function formatDateForTable(dateStr: string): string {
  if (!dateStr) return "-";
  const cleaned = dateStr.split("T")[0];
  const parts = cleaned.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
}
