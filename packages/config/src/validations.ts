import { config } from "./index";
import { parse, isValid, format, differenceInYears } from "date-fns";
import { de, enGB } from "date-fns/locale";

export type ValidationHandler = (
  input: string | null | undefined
) => ValidationResult;
export type AsyncValidationHandler = (
  input: string
) => Promise<ValidationResult>;

export interface ValidationResult {
  valid: boolean;
  value?: string;
  error?: string;
}

export const validateIBAN: ValidationHandler = (input) => {
  if (!input) {
    return { valid: false, error: "empty" };
  }

  const cleaned = input.replace(/\s+/g, "").toUpperCase();

  // German IBAN must be 22 characters: DE + 2 check digits + 18 digits (BBAN)
  if (!/^DE\d{20}$/.test(cleaned)) {
    return { valid: false, error: "format" };
  }

  // Move first 4 chars to the end and compute mod-97 per ISO 13616
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);

  let remainder = 0;
  for (let i = 0; i < rearranged.length; i++) {
    const ch = rearranged[i];
    const value =
      ch >= "A" && ch <= "Z" ? ch.charCodeAt(0) - 55 : ch.charCodeAt(0) - 48; // A=10..Z=35, 0..9
    const digits = String(value);
    for (let j = 0; j < digits.length; j++) {
      remainder = (remainder * 10 + (digits.charCodeAt(j) - 48)) % 97;
    }
  }

  if (remainder !== 1) {
    return { valid: false, error: "checksum" };
  }

  return { valid: true, value: cleaned };
};

export const validateZipCode: ValidationHandler = (input) => {
  if (!input) {
    return { valid: false, error: "empty" };
  }

  const cleaned = input.replace(/\s/g, "");

  // Check for 5-digit zip code format
  if (!/^\d{5}$/.test(cleaned)) {
    return { valid: false, error: "format" };
  }

  // Additional validation: ensure it's not all zeros or all same digits
  if (/^0{5}$|^(\d)\1{4}$/.test(cleaned)) {
    return { valid: false, error: "invalid" };
  }

  return { valid: true, value: cleaned };
};

export const validateEmail: ValidationHandler = (input) => {
  if (!input) {
    return { valid: false, error: "empty" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
    return { valid: false, error: "invalid" };
  }
  return { valid: true, value: input };
};

export const validateDate: ValidationHandler = (input) => {
  if (!input) {
    return { valid: false, error: "empty" };
  }

  const cleanInput = input.trim();

  // Date formats to try in order of preference
  const dateFormats = [
    // German standard formats
    "dd.MM.yy", // 15.08.92
    "dd.MM.yyyy", // 15.08.1992
    "d.M.yy", // 5.8.92
    "d.M.yyyy", // 5.8.1992

    // English standard formats
    "MM/dd/yy", // 08/15/92
    "MM/dd/yyyy", // 08/15/1992
    "M/d/yy", // 8/15/92
    "M/d/yyyy", // 8/15/1992

    // Alternative separators
    "dd/MM/yy", // 15/08/92
    "dd/MM/yyyy", // 15/08/1992
    "dd-MM-yy", // 15-08-92
    "dd-MM-yyyy", // 15-08-1992

    // Space separated
    "dd MM yy", // 15 08 92
    "dd MM yyyy", // 15 08 1992

    // German month names
    "dd. MMMM yyyy", // 15. August 1992
    "dd MMMM yyyy", // 15 August 1992
    "dd. MMM yyyy", // 15. Aug 1992
    "dd MMM yyyy", // 15 Aug 1992

    // ISO format
    "yyyy-MM-dd", // 1992-08-15

    // US format (less priority)
    "MM/dd/yyyy", // 08/15/1992
  ];

  // Helper function to try parsing with different formats
  function tryParseDate(input: string, dateFormats: string[]): Date | null {
    // Try each format
    for (const dateFormat of dateFormats) {
      try {
        for (const locale of [de, enGB]) {
          const parsed = parse(input, dateFormat, new Date(), {
            locale,
          });
          if (isValid(parsed)) {
            return parsed;
          }
        }
      } catch {
        // Continue to next format
        continue;
      }
    }
    return null;
  }

  const parsedDate = tryParseDate(cleanInput, dateFormats);

  // If no format worked, return error
  if (!parsedDate || !isValid(parsedDate)) {
    return { valid: false, error: "wrong_format" };
  }

  return { valid: true, value: format(parsedDate, config.dateFormat) };
};

export const validateDateInFuture: ValidationHandler = (input) => {
  const parsedDate = validateDate(input);
  if (!parsedDate.valid) {
    return parsedDate;
  }
  if (!parsedDate.value) {
    return { valid: false, error: "empty" };
  }
  const date = new Date(parsedDate.value);
  const today = new Date();
  if (date < today) {
    return { valid: false, error: "past_date" };
  }
  return { valid: true, value: format(date, config.dateFormat) };
};

export const validateDateOfBirth: ValidationHandler = (input) => {
  const parsedDate = validateDate(input);
  if (!parsedDate.valid) {
    return parsedDate;
  }
  if (!parsedDate.value) {
    return { valid: false, error: "empty" };
  }
  const date = new Date(parsedDate.value);

  // Validate date constraints
  const today = new Date();

  // Check if date is in the future
  if (date > today) {
    return { valid: false, error: "future_date" };
  }

  // Calculate age
  const age = differenceInYears(today, date);

  if (age < config.validations.ageMin) {
    return {
      valid: false,
      error: `too_young min_age ${config.validations.ageMin}`,
    };
  }

  if (age > config.validations.ageMax) {
    return {
      valid: false,
      error: `too_old max_age ${config.validations.ageMax}`,
    };
  }

  return {
    valid: true,
    value: format(date, config.dateFormat),
  };
};

export const validateName: ValidationHandler = (input) => {
  if (!input) {
    return { valid: false, error: "empty" };
  }

  const cleaned = input.trim();

  // Allow letters, spaces, hyphens, apostrophes (for names like O'Connor, Jean-Pierre)
  if (!/^[a-zA-ZäöüÄÖÜß\s'-]+$/.test(cleaned)) {
    return { valid: false, error: "invalid_characters" };
  }

  // At least one letter (not just spaces/punctuation)
  if (!/[a-zA-ZäöüÄÖÜß]/.test(cleaned)) {
    return { valid: false, error: "no_letters" };
  }

  return { valid: true, value: cleaned };
};

export const validateAddress: ValidationHandler = (input) => {
  if (!input) {
    return { valid: false, error: "empty" };
  }

  const cleaned = input.trim();
  return { valid: true, value: cleaned };
};
