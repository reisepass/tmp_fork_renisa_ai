import { FnolData, DamageType } from "@renisa-ai/config/schema";

/**
 * Completeness Scoring for FNOL Data
 *
 * Determines if we have enough information to proceed with claim submission.
 * Based on damage type, different fields are required.
 */

export interface CompletenessScore {
  overall: number; // 0-100
  hasBasicStory: boolean;
  hasTimeInfo: boolean;
  hasDamageInfo: boolean;
  canProceed: boolean;
  missingCritical: string[];
  missingOptional: string[];
}

/**
 * Check if a field has a meaningful value
 */
function notEmpty(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (typeof value === "number" && isNaN(value)) return false;
  return true;
}

/**
 * Get required fields based on damage type
 */
function getRequiredFieldsByDamageType(damageType: DamageType | null): string[] {
  const commonRequired = [
    "damageType",
    "incidentDate",
    "damageDescription",
    "whoCausedDamage",
    "howDamageOccurred",
    "estimatedCost",
  ];

  if (!damageType) return commonRequired;

  const typeSpecificRequired: Record<DamageType, string[]> = {
    object: [
      ...commonRequired,
      "objectCategory",
      "ownership",
    ],
    person: [
      ...commonRequired,
      "relationshipToInjured",
      "injuredPersonIsAdult",
    ],
    animal: [
      ...commonRequired,
      "animalDescription",
    ],
    building: [
      ...commonRequired,
      "buildingArea",
      "isRentedProperty",
    ],
    vehicle: [
      ...commonRequired,
      "vehicleType",
    ],
    other: [
      ...commonRequired,
      "otherDamageDescription",
    ],
  };

  return typeSpecificRequired[damageType] || commonRequired;
}

/**
 * Get optional but recommended fields
 */
function getOptionalFieldsByDamageType(damageType: DamageType | null): string[] {
  const commonOptional = [
    "incidentTime",
    "wasRecordedByPolice",
    "hasWitnesses",
    "claimJustified",
  ];

  if (!damageType) return commonOptional;

  const typeSpecificOptional: Record<DamageType, string[]> = {
    object: [
      ...commonOptional,
      "itemDetails",
      "damagedDuringProfessionalActivity",
    ],
    person: [
      ...commonOptional,
      "hasInjuredPersonContactDetails",
      "injuredPersonContact",
    ],
    animal: [...commonOptional],
    building: [
      ...commonOptional,
      "interiorSubcategory",
      "exteriorSubcategory",
      "hasLandlordContactDetails",
    ],
    vehicle: [
      ...commonOptional,
      "vehicleLicensePlate",
      "vehicleInfo",
    ],
    other: [...commonOptional],
  };

  return typeSpecificOptional[damageType] || commonOptional;
}

/**
 * Score the completeness of collected FNOL data
 */
export function scoreCompleteness(data: Partial<FnolData>): CompletenessScore {
  const damageType = data.damageType || null;
  const requiredFields = getRequiredFieldsByDamageType(damageType);
  const optionalFields = getOptionalFieldsByDamageType(damageType);

  // Check required fields
  const missingRequired = requiredFields.filter(
    (field) => !notEmpty((data as any)[field])
  );

  // Check optional fields
  const missingOptional = optionalFields.filter(
    (field) => !notEmpty((data as any)[field])
  );

  // Calculate individual checks
  const hasBasicStory = notEmpty(data.damageDescription);

  const hasTimeInfo =
    notEmpty(data.incidentDate) ||
    notEmpty(data.incidentTime);

  const hasDamageInfo =
    notEmpty(data.damageType) &&
    (notEmpty(data.estimatedCost) || notEmpty((data.itemDetails as any)?.estimatedValue));

  // Calculate overall score (0-100)
  const requiredCount = requiredFields.length;
  const filledRequiredCount = requiredCount - missingRequired.length;
  const optionalCount = optionalFields.length;
  const filledOptionalCount = optionalCount - missingOptional.length;

  // Weight: 80% required, 20% optional
  const requiredScore = requiredCount > 0 ? (filledRequiredCount / requiredCount) * 80 : 80;
  const optionalScore = optionalCount > 0 ? (filledOptionalCount / optionalCount) * 20 : 20;
  const overall = Math.round(requiredScore + optionalScore);

  // Can proceed if:
  // 1. All required fields filled
  // 2. Has basic story, time info, and damage info
  // 3. Overall score >= 70%
  const canProceed =
    missingRequired.length === 0 &&
    hasBasicStory &&
    hasTimeInfo &&
    hasDamageInfo &&
    overall >= 70;

  return {
    overall,
    hasBasicStory,
    hasTimeInfo,
    hasDamageInfo,
    canProceed,
    missingCritical: missingRequired,
    missingOptional,
  };
}

/**
 * Get a natural language explanation of what's missing
 */
export function getMissingFieldsExplanation(
  missingFields: string[],
  locale: "de" | "en" = "de"
): string {
  if (missingFields.length === 0) {
    return locale === "de"
      ? "Alle wichtigen Informationen sind vorhanden."
      : "All important information is available.";
  }

  const fieldNames: Record<string, { de: string; en: string }> = {
    damageType: { de: "Art des Schadens", en: "Type of damage" },
    incidentDate: { de: "Datum des Vorfalls", en: "Incident date" },
    incidentTime: { de: "Uhrzeit des Vorfalls", en: "Incident time" },
    damageDescription: { de: "Beschreibung des Schadens", en: "Damage description" },
    whoCausedDamage: { de: "Verursacher des Schadens", en: "Who caused the damage" },
    howDamageOccurred: { de: "Wie der Schaden entstanden ist", en: "How damage occurred" },
    estimatedCost: { de: "Geschätzte Schadenshöhe", en: "Estimated cost" },
    objectCategory: { de: "Kategorie des Gegenstands", en: "Object category" },
    ownership: { de: "Eigentumsverhältnis", en: "Ownership" },
    relationshipToInjured: { de: "Verhältnis zur verletzten Person", en: "Relationship to injured" },
    injuredPersonIsAdult: { de: "Alter der verletzten Person", en: "Age of injured person" },
    animalDescription: { de: "Beschreibung des Tiers", en: "Animal description" },
    buildingArea: { de: "Bereich des Gebäudes", en: "Building area" },
    isRentedProperty: { de: "Mietverhältnis", en: "Rental status" },
    vehicleType: { de: "Fahrzeugtyp", en: "Vehicle type" },
    otherDamageDescription: { de: "Beschreibung des Schadens", en: "Damage description" },
  };

  const translatedFields = missingFields
    .map((field) => fieldNames[field]?.[locale] || field)
    .slice(0, 3); // Show max 3 missing fields

  if (locale === "de") {
    if (translatedFields.length === 1) {
      return `Noch erforderlich: ${translatedFields[0]}.`;
    } else if (translatedFields.length === 2) {
      return `Noch erforderlich: ${translatedFields[0]} und ${translatedFields[1]}.`;
    } else {
      const last = translatedFields.pop();
      return `Noch erforderlich: ${translatedFields.join(", ")} und ${last}.`;
    }
  } else {
    if (translatedFields.length === 1) {
      return `Still required: ${translatedFields[0]}.`;
    } else if (translatedFields.length === 2) {
      return `Still required: ${translatedFields[0]} and ${translatedFields[1]}.`;
    } else {
      const last = translatedFields.pop();
      return `Still required: ${translatedFields.join(", ")}, and ${last}.`;
    }
  }
}

/**
 * Validate date format (DD.MM.YYYY)
 */
export function isValidDate(dateString: string | null): boolean {
  if (!dateString) return false;

  const datePattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
  const match = dateString.match(datePattern);

  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Basic validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;

  return true;
}

/**
 * Validate cost is a positive number
 */
export function isValidCost(cost: number | null): boolean {
  if (cost === null || cost === undefined) return false;
  if (isNaN(cost)) return false;
  if (cost < 0) return false;
  return true;
}

/**
 * Check if we need more details for a specific damage type
 */
export function needsMoreDetails(data: Partial<FnolData>): {
  needed: boolean;
  reason: string;
} {
  const { damageType } = data;

  if (!damageType) {
    return {
      needed: true,
      reason: "Damage type not classified",
    };
  }

  // Check type-specific requirements
  switch (damageType) {
    case "object":
      if (!data.objectCategory) {
        return { needed: true, reason: "Object category not specified" };
      }
      if (!data.ownership) {
        return { needed: true, reason: "Ownership not specified" };
      }
      break;

    case "person":
      if (!data.relationshipToInjured) {
        return { needed: true, reason: "Relationship to injured not specified" };
      }
      if (data.injuredPersonIsAdult === null || data.injuredPersonIsAdult === undefined) {
        return { needed: true, reason: "Age of injured person not specified" };
      }
      break;

    case "building":
      if (!data.buildingArea) {
        return { needed: true, reason: "Building area not specified" };
      }
      if (data.isRentedProperty === null || data.isRentedProperty === undefined) {
        return { needed: true, reason: "Rental status not specified" };
      }
      break;

    case "vehicle":
      if (!data.vehicleType) {
        return { needed: true, reason: "Vehicle type not specified" };
      }
      break;

    case "animal":
      if (!data.animalDescription) {
        return { needed: true, reason: "Animal not described" };
      }
      break;

    case "other":
      if (!data.otherDamageDescription) {
        return { needed: true, reason: "Damage not described" };
      }
      break;
  }

  return { needed: false, reason: "" };
}
