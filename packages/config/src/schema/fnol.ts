import { z } from "zod";

/**
 * FNOL (First Notice of Loss) Schema for Private Liability Insurance Claims
 *
 * This schema follows German insurance claim requirements and includes all
 * necessary fields for processing claims efficiently.
 *
 * Design principles:
 * - All fields nullable (progressive collection)
 * - Never invent data (especially dates/costs)
 * - Strict validation on critical fields
 * - Conditional fields based on damage type
 */

// ============================================================================
// ENUMS - Damage Types and Categories
// ============================================================================

export const damageTypeEnum = z.enum([
  "object",      // Gegenstand
  "person",      // Person
  "animal",      // Tier
  "building",    // Gebäude/Grundstück
  "vehicle",     // Kraftfahrzeug
  "other",       // Sonstiges
]);

// Object subcategories
export const objectCategoryEnum = z.enum([
  "electronics",           // Elektronik
  "glasses",              // Brille
  "tools_garden",         // Werkzeug/Gartengeräte
  "furniture",            // Mobiliar/Einrichtung
  "clothing",             // Kleidung
  "musical_instruments",  // Musikinstrumente
  "drone",                // Drohne
  "other",                // Sonstiges
]);

export const electronicsSubcategoryEnum = z.enum([
  "smartphone_tablet",    // Handy/Tablet
  "computer_laptop",      // Computer/Laptop
  "camera",               // Kamera & Zubehör
  "tv",                   // TV & Zubehör
  "household_appliance",  // Cerankochfeld/Haushaltsgerät
  "other",                // Sonstiges
]);

export const toolsSubcategoryEnum = z.enum([
  "power_tool",           // Elektrowerkzeug
  "lawn_mower",           // Rasenmäher
  "hand_tool",            // Handwerkzeug
  "other",                // Sonstiges
]);

export const furnitureSubcategoryEnum = z.enum([
  "sofa_seating",         // Sofa / Sitzmöbel
  "kitchen_furniture",    // Küchenmöbel
  "lamp",                 // Lampe
  "mirror",               // Spiegel
  "carpet_textiles",      // Teppich / Heimtextilien
  "dishes",               // Geschirr
  "art_decoration",       // Kunst / Dekoration
  "other",                // Sonstiges
]);

export const clothingSubcategoryEnum = z.enum([
  "jacket_coat",          // Jacke / Mantel
  "blouse_shirt_sweater", // Bluse / Hemd / Pullover
  "dress_skirt",          // Kleid / Rock
  "suit",                 // Anzug
  "trousers",             // Hosen
  "other",                // Sonstiges
]);

export const itemAgeEnum = z.enum([
  "0_12_months",          // 0–12 Monate
  "1_2_years",            // 1–2 Jahre
  "over_2_years",         // >2 Jahre
  "unknown",              // unbekannt
]);

export const ownershipEnum = z.enum([
  "mine",                 // mein Eigentum
  "rented_borrowed",      // gemietet/geliehen/geleast
  "not_mine",             // nicht mein Eigentum
]);

// Person subcategories
export const relationshipEnum = z.enum([
  "family",               // Familie
  "spouse",               // Ehepartner
  "friend",               // Freund/in
  "neighbor",             // Nachbar/in
  "colleague",            // Kollege/Kollegin
  "hotel_guest",          // Hotelgast / Gastgeber
  "other",                // Sonstiges
]);

// Building subcategories
export const buildingAreaEnum = z.enum([
  "interior",             // Innenbereich
  "exterior",             // Außenbereich
  "property",             // Grundstück
]);

export const interiorSubcategoryEnum = z.enum([
  "bathroom",             // Badezimmer
  "flooring",             // Bodenbelag
  "kitchen",              // Einbauküche
  "heating_fireplace",    // Heizung / Kamin
  "window_door",          // Fenster / Tür
  "wall_ceiling",         // Wand / Decke
  "shutters_blinds",      // Rollläden / Jalousien
  "water_power_line",     // Wasser-/Stromleitung
  "other",                // Sonstiges
]);

export const bathroomItemEnum = z.enum([
  "sink",                 // Waschbecken
  "bathtub",              // Badewanne
  "shower",               // Dusche / Duschwanne
  "cistern",              // Spülkasten
  "toilet_bidet",         // Toilette / Bidet
  "other",                // Sonstiges
]);

export const flooringTypeEnum = z.enum([
  "laminate",             // Laminat
  "parquet",              // Parkett
  "tiles",                // Fliesen
  "carpet",               // Teppich
  "pvc_vinyl",            // PVC / Vinyl / Linoleum
  "other",                // Sonstiges
]);

export const exteriorSubcategoryEnum = z.enum([
  "windows_doors",        // Fenster / Türen
  "facade",               // Fassade
  "roof",                 // Dach
  "shutters",             // Rollläden
  "garage_door",          // Garagentor
  "fence_gate",           // Zaun / Tor
  "plants_hedge",         // Pflanzen / Hecke
  "other",                // Sonstiges
]);

// Vehicle subcategories
export const vehicleTypeEnum = z.enum([
  "car",                  // Auto
  "motorcycle",           // Motorrad
  "bike_ebike",           // Fahrrad / E-Bike
  "other",                // Sonstiges
]);

// Common context enums
export const causerEnum = z.enum([
  "myself",               // Ich selbst
  "spouse_partner",       // Ehepartner/in / Partner/in
  "child",                // Kind
  "animal",               // Durch ein Tier verursacht
  "building",             // Durch Gebäude / Grundstück verursacht
  "uncertain",            // Unklar / Unbekannt
]);

export const buildingRelationshipEnum = z.enum([
  "owner",                // Eigentümer/in
  "landlord",             // Vermieter/in
  "tenant",               // Mieter/in
]);

export const claimJustificationEnum = z.enum([
  "yes",                  // Ja
  "partially",            // Teilweise
  "no",                   // Nein
]);

export const payoutRecipientEnum = z.enum([
  "claimant",             // An den/die Geschädigte/n
  "repair_company",       // An die Reparaturfirma
  "policyholder",         // An mich
]);

// ============================================================================
// SUB-SCHEMAS - Nested Objects
// ============================================================================

export const contactDetailsSchema = z.object({
  firstName: z.string().nullable().describe("First name"),
  lastName: z.string().nullable().describe("Last name"),
  email: z.string().nullable().describe("Email address"),
  phone: z.string().nullable().describe("Phone number"),
  street: z.string().nullable().describe("Street name"),
  houseNumber: z.string().nullable().describe("House number"),
  zipCode: z.string().nullable().describe("ZIP/postal code"),
  city: z.string().nullable().describe("City"),
});

export const itemDetailsSchema = z.object({
  manufacturer: z.string().nullable().describe("Manufacturer/brand"),
  model: z.string().nullable().describe("Model name or number"),
  serialNumber: z.string().nullable().describe("Serial number if available"),
  estimatedValue: z.number().nullable().describe("Estimated value in EUR"),
  age: itemAgeEnum.nullable().describe("Age of the item"),
});

export const witnessSchema = z.object({
  firstName: z.string().nullable().describe("Witness first name"),
  lastName: z.string().nullable().describe("Witness last name"),
  email: z.string().nullable().describe("Witness email"),
  phone: z.string().nullable().describe("Witness phone"),
  street: z.string().nullable().describe("Witness street"),
  houseNumber: z.string().nullable().describe("Witness house number"),
  zipCode: z.string().nullable().describe("Witness ZIP code"),
  city: z.string().nullable().describe("Witness city"),
});

export const otherInsuranceSchema = z.object({
  insurerName: z.string().nullable().describe("Name of other insurance company"),
  policyNumber: z.string().nullable().describe("Policy/contract number"),
  contactPerson: z.string().nullable().describe("Contact person/department"),
  contactDetails: z.string().nullable().describe("Phone/Email"),
  claimNumber: z.string().nullable().describe("Claim number if known"),
});

// ============================================================================
// MAIN FNOL SCHEMA
// ============================================================================

export const fnolDataSchema = z.object({
  // ===== Policyholder Information =====
  policyId: z.string().nullable().describe("Policy ID (assumed from phone number in v0)"),
  policyholderName: z.string().nullable().describe("Policyholder's full name"),
  policyholderEmail: z.string().nullable().describe("Policyholder's email"),
  policyholderDateOfBirth: z.string().nullable().describe("Policyholder's date of birth (DD.MM.YYYY format)"),
  policyholderPhone: z.string().nullable().describe("Policyholder's phone number"),

  // ===== Incident Date & Time =====
  incidentDate: z.string().nullable().describe(
    "Date of the incident (DD.MM.YYYY format). NEVER invent this - only extract if explicitly mentioned."
  ),
  incidentTime: z.string().nullable().describe(
    "Time of the incident (HH:MM format). NEVER invent this - only extract if explicitly mentioned."
  ),

  // ===== Damage Type =====
  damageType: damageTypeEnum.nullable().describe("The type of entity that was damaged"),

  // ===== Object-Specific Fields =====
  objectCategory: objectCategoryEnum.nullable().describe("Category of damaged object"),
  electronicsSubcategory: electronicsSubcategoryEnum.nullable(),
  toolsSubcategory: toolsSubcategoryEnum.nullable(),
  furnitureSubcategory: furnitureSubcategoryEnum.nullable(),
  clothingSubcategory: clothingSubcategoryEnum.nullable(),
  itemDetails: itemDetailsSchema.nullable().describe("Details about the damaged item"),
  ownership: ownershipEnum.nullable().describe("Who owns the damaged item"),
  damagedDuringProfessionalActivity: z.boolean().nullable().describe("Was item damaged during professional/commercial activity?"),

  // ===== Person-Specific Fields =====
  relationshipToInjured: relationshipEnum.nullable().describe("Relationship to the injured person"),
  injuredPersonIsAdult: z.boolean().nullable().describe("Is the injured person 18 years or older?"),
  hasInjuredPersonContactDetails: z.boolean().nullable().describe("Do you have contact details for the injured person?"),
  injuredPersonContact: contactDetailsSchema.nullable().describe("Injured person's contact details"),
  hasAdditionalInjuredPersons: z.boolean().nullable().describe("Are there additional injured persons?"),

  // ===== Animal-Specific Fields =====
  animalDescription: z.string().nullable().describe("Description of the injured animal"),

  // ===== Building-Specific Fields =====
  buildingArea: buildingAreaEnum.nullable().describe("Which area of the building was damaged"),
  interiorSubcategory: interiorSubcategoryEnum.nullable(),
  bathroomItem: bathroomItemEnum.nullable(),
  flooringType: flooringTypeEnum.nullable(),
  exteriorSubcategory: exteriorSubcategoryEnum.nullable(),
  isRentedProperty: z.boolean().nullable().describe("Did damage occur in rented property?"),
  hasLandlordContactDetails: z.boolean().nullable().describe("Can you provide landlord contact details?"),
  landlordContact: contactDetailsSchema.nullable().describe("Landlord contact details"),

  // ===== Vehicle-Specific Fields =====
  vehicleType: vehicleTypeEnum.nullable().describe("Type of motor vehicle"),
  vehicleLicensePlate: z.string().nullable().describe("License plate number"),
  vehicleInfo: z.string().nullable().describe("Vehicle brand, model, and other information"),

  // ===== Other Damage Type =====
  otherDamageDescription: z.string().nullable().describe("Free text description of what was damaged"),

  // ===== Context Questions (Common for ALL damage types) =====

  // Damage narrative
  damageDescription: z.string().nullable().describe(
    "Detailed description of what happened - the user's story in their own words"
  ),

  // Police report
  wasRecordedByPolice: z.boolean().nullable().describe("Was the damage recorded by police?"),
  policeCaseNumber: z.string().nullable().describe("Police case number"),
  policeStation: z.string().nullable().describe("Police station that recorded the report"),

  // Cause & Causer
  whoCausedDamage: causerEnum.nullable().describe("Who caused the damage"),
  causerChildDateOfBirth: z.string().nullable().describe("If child caused damage, their date of birth (DD.MM.YYYY)"),
  causerAnimalDescription: z.string().nullable().describe("If animal caused damage, which animal and are you the owner?"),
  causerBuildingRelationship: buildingRelationshipEnum.nullable().describe("If building caused damage, your relationship to the building"),
  causerUncertainDescription: z.string().nullable().describe("If uncertain who caused damage, description of possibilities"),
  howDamageOccurred: z.string().nullable().describe("Free text explanation of how the damage occurred"),

  // Witnesses
  hasWitnesses: z.boolean().nullable().describe("Are there witnesses who saw the damage occur?"),
  witnesses: z.array(witnessSchema).nullable().describe("List of witnesses"),

  // Claim fairness
  claimJustified: claimJustificationEnum.nullable().describe("Do you believe the claimant's demand is justified?"),

  // Estimated cost
  estimatedCost: z.number().nullable().describe(
    "Estimated cost of damage in EUR. NEVER invent this - only extract if explicitly mentioned with a specific number."
  ),
  estimatedCostConfidence: z.enum(["high", "medium", "low", "none"]).nullable().describe(
    "Confidence level in the estimated cost. 'high' if user provided specific number, 'medium' if user gave range, 'low' if guessed, 'none' if not mentioned."
  ),

  // Payout details
  payoutRecipient: payoutRecipientEnum.nullable().describe("Who should receive the payout"),
  payoutIBAN: z.string().nullable().describe("IBAN for payout"),
  payoutAccountHolder: z.string().nullable().describe("Account holder name for payout"),

  // ===== Documents =====
  hasUploadedDocuments: z.boolean().nullable().describe("Has the user uploaded documents?"),
  documentCount: z.number().nullable().describe("Number of documents uploaded"),

  // ===== Legal Declaration =====
  hasReadLegalDeclaration: z.boolean().nullable().describe("User confirmed reading legal declaration"),
  reportedToOtherInsurance: z.boolean().nullable().describe("Has damage been reported to another insurance?"),
  otherInsuranceDetails: otherInsuranceSchema.nullable().describe("Details of other insurance if reported"),

  // ===== Internal Tracking =====
  extractionConfidence: z.number().nullable().describe(
    "Internal: LLM confidence in extracted data (0-100). Updated each turn."
  ),
  missingCriticalFields: z.array(z.string()).nullable().describe(
    "Internal: List of critical fields still missing"
  ),
});

export type FnolData = z.infer<typeof fnolDataSchema>;
export type DamageType = z.infer<typeof damageTypeEnum>;
export type ObjectCategory = z.infer<typeof objectCategoryEnum>;
export type ContactDetails = z.infer<typeof contactDetailsSchema>;
export type ItemDetails = z.infer<typeof itemDetailsSchema>;
export type Witness = z.infer<typeof witnessSchema>;
