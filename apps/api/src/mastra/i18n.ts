import {
  CoverageScope,
  DataCollection,
  Locale,
  PaymentSchedule,
  Quote,
} from "@renisa-ai/config/types";
import { Markdown } from "@renisa-ai/utils";
import { addDays } from "date-fns";

type Labels = {
  dataReview: string;
  genericError: string;
  coverageScopes: Record<CoverageScope, string>;
  paymentSchedules: Record<PaymentSchedule, string>;
};

const stepCancel = {
  "de-DE": [
    "**Abgebrochen**",
    "",
    "Du kannst gerne eine neue Anfrage starten sobald du wieder bereit bist.",
    "",
    Markdown.insertButton("Neue Anfrage starten", "ListRestart"),
    Markdown.insertButton("Chat beenden", "CircleOff"),
  ].join("\n"),
  "en-GB": [
    "**Canceled**",
    "",
    "You can start a new request whenever you are ready.",
    "",
    Markdown.insertButton("Start new request", "ListRestart"),
    Markdown.insertButton("End chat", "CircleOff"),
  ].join("\n"),
};

const i18n = {
  "de-DE": {
    dataReview: [
      "**Persönliche Daten**",
      "- Name: {firstName} {lastName}",
      "- Geburtsdatum: {dateOfBirth}",
      "- E-Mail-Adresse: {email}",
      "- Adresse: {street} {houseNumber}, {zipCode} {city}",
      "",
      "**Angebotsdetails**",
      "- Deckung: {coverageScope}",
      "- Tarif: {tariff}",
      "- Betrag: {amount}",
      "- Zahlungsmethode: {paymentMethod}",
      "- Startdatum: {startDate}\\*",
      "",
      "<sup>\\*Bitte beachten Sie: Das Startdatum hängt von der Zahlungsbestätigung ab. Du erhältst das endgültige Startdatum nach Abschluss deiner Anmeldung.</sup>",
      "",
      'Wenn du Änderungen an den Daten vornehmen möchtest, lass mich bitte wissen, welche Änderungen du vornehmen möchtest. Oder bestätige die Daten mit "Das ist richtig".',
    ].join("\n"),
    genericError:
      "Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
    coverageScopes: {
      single: "Nur für mich",
      withPartner: "Für mich und meinen Partner",
      withChildren: "Für mich und meine Kinder",
      withFamily: "Für meine ganze Familie",
    },
    paymentSchedules: {
      monthly: "Monatlich",
      annual: "Jährlich",
    },
  },
  "en-GB": {
    dataReview: [
      "**Personal Data**",
      "- Name: {firstName} {lastName}",
      "- Date of Birth: {dateOfBirth}",
      "- Email Address: {email}",
      "- Address: {street} {houseNumber}, {zipCode} {city}",
      "",
      "**Offer Details**",
      "- Coverage: {coverageScope}",
      "- Tariff: {tariff}",
      "- Amount: {amount}",
      "- Payment Method: {paymentMethod}",
      "- Start Date: {startDate}\\*",
      "",
      "<sup>\\*Please note: The start date depends on confirmation of payment. You will receive the final start date after completing your application.</sup>",
      "",
      "If you need to change any details, please let me know which ones you want to change. Or confirm the data with 'That is correct'.",
    ].join("\n"),
    genericError: "An error occurred. Please try again.",
    coverageScopes: {
      single: "Only for me",
      withPartner: "For me and my partner",
      withChildren: "For me and my children",
      withFamily: "For my entire family",
    },
    paymentSchedules: {
      monthly: "Monthly",
      annual: "Yearly",
    },
  },
} as const satisfies Record<Locale, Labels>;

// Workflow-scoped messages (only message-type content lives here)
const workflowMessages = {
  sales: {
    "de-DE": {
      step_1_1: "Los geht's! Wann wurdest du geboren?",
      step_1_2: [
        "Wen möchtest du versichern?",
        "",
        Markdown.insertCard("Nur mich", "", "User"),
        Markdown.insertCard("Mich + Partner", "", "Handshake"),
        Markdown.insertCard("Mich + Kinder", "", "Users"),
        Markdown.insertCard("Familie", "", "House"),
      ].join("\n"),
      step_2_1: [
        "Perfekt! Basierend auf deinen Angaben:",
        "",
        "### Monatsbeitrag",
        "## {price}",
        "",
        "Das ist enthalten:",
        "- Y 50 Mio. € Deckungssumme",
        "- Y Schlüsselverlust abgedeckt",
        "- Y Forderungsausfall inklusive",
        "- Y Mietsachschäden bis 50 Mio. €",
        "",
        "Möchtest du dich jetzt versichern?",
        "",
        Markdown.insertButton("Ja, weiter", "ThumbsUp", "primary"),
        Markdown.insertButton("Mehr Leistungen anzeigen", "Plus", "secondary"),
      ].join("\n"),
      step_2_2: [
        "### Monatsbeitrag",
        "## {price}",
        "",
        "Das ist enthalten:",
        "- Y Versicherungssumme bis 50 Millionen Euro",
        "- Y Mietschäden bis 50 Millionen Euro",
        "- Y Schlüsselverlust",
        "- Y Geliehene und gemietete Sachen bis 20.000 Euro",
        "- Y Forderungsausfalldeckung bis 5.000 Euro",
        "- Y Schäden durch Internetnutzung bis 50 Millionen Euro",
        "- Y Haftpflichtschäden bis 50 Millionen Euro",
        "- Y Weltweiter Auslandsschutz (unbegrenzt)",
        "- Y Haus- und Grundbesitzschutz für Einfamilienhäuser oder Wohnungen bis 50 Millionen Euro",
        "- Y Vermieterschutz bei Vermietung einer Immobilie",
        "",
        "Dieses Paket beinhaltet NICHT:",
        "- N Beitragsbefreiung bei unverschuldeter Arbeitslosigkeit",
        "- N Auftragsgarantie (Marktgarantie)",
        "",
        "Möchtest du dich jetzt versichern?",
        "",
        Markdown.insertButton("Ja, weiter", "ThumbsUp", "primary"),
        Markdown.insertButton(
          "Versicherungsdokumente herunterladen",
          "Download",
          "secondary",
          "https://s3.eu-central-1.amazonaws.com/static.alteos.com/products/aldi-hausrat/Hausrat_Paket-L_Nord.pdf"
        ),
      ].join("\n"),
      step_3_1: [
        "Als Nächstes habe ich ein paar Fragen zu deiner Versicherungshistorie.",
        "Bitte beantworte diese Fragen wahrheitsgemäß und vollständig. Nur so bleibt dein Versicherungsschutz bestehen.",
        'Weitere Informationen findest du im Merkblatt zur **"Anzeigepflicht nach §19 Versicherungsvertragsgesetz"**',
        "",
        "Hast du derzeit oder hattest du in den letzten 5 Jahren eine private Haftpflichtversicherung?",
        "",
        Markdown.insertButton("Ja", "CircleCheck", "yes") + " " + Markdown.insertButton("Nein", "CircleX", "no"),
      ].join("\n\n"),
      step_3_2: [
        "Gab es in den letzten 5 Jahren Schadensfälle?",
        "",
        Markdown.insertButton("Ja", "CircleCheck", "yes") + " " + Markdown.insertButton("Nein", "CircleX", "no"),
      ].join("\n"),
      step_3_3: [
        "**Wie oft** hattest du in den letzten 5 Jahren Schäden, egal ob gemeldet oder nicht?",
        "",
        Markdown.insertButton("Einmal", "Dice1"),
        Markdown.insertButton("Zweimal", "Dice2"),
        Markdown.insertButton("Mehr als zweimal", "SquareArrowUp"),
      ].join("\n"),
      step_4_1: "Ok, wie lautet dein vollständiger Name?",
      step_4_2: "Wie lautet deine E-Mail-Adresse?",
      step_4_3: "Wie lautet deine vollständige Adresse?",
      step_5_1: [
        "Bitte bestätige die endgültigen Daten für deinen Vertrag:",
      ].join("\n"),
      step_5_1_1: [
        Markdown.insertButton("Das ist richtig", "ThumbsUp", "primary"),
        Markdown.insertButton("Angaben ändern", "Repeat", "secondary"),
      ].join("\n"),
      step_5_2: ["Möchtest du noch etwas ändern?"].join("\n"),
      step_5_2_1: [
        Markdown.insertButton("Nein, weiter", "ThumbsUp", "primary"),
        Markdown.insertButton("Angaben ändern", "Pencil", "secondary"),
      ].join("\n"),
      step_5_3: [
        "Bitte überprüfe die bereitgestellten Dokumente, darunter:",
        "",
        "- Allgemeine Geschäftsbedingungen (AGB)",
        "- Versicherungsprodukt-Informationsdokument (IPID)",
        "- GDPR-Compliance-Dokument",
        "- Beratungsprotokoll",
        "",
        Markdown.insertButton(
          "Dokumente herunterladen",
          "Download",
          "primary",
          "{downloadUrl}"
        ),
        Markdown.insertButton("Abbrechen", "X", "secondary"),
      ].join("\n"),
      step_5_4: [
        "Bitte bestätige, dass du den folgenden Aussagen zustimmst:",
        "",
        "- Ich bestätige, dass ich die bereitgestellten Dokumente gelesen habe und ihnen zustimme.",
        "- Ich stimme zu, dass meine Daten im [Partner]-Universum gespeichert und verarbeitet werden dürfen.",
        "",
        'Mit Klick auf "Zu den Zahlungsdetails" bestätigst du, dass alle Angaben korrekt und vollständig sind. Fehlende oder falsche Angaben können gemäß § 19 Abs. 5 VVG zur Anpassung oder Kündigung des Vertrags führen.',
        "",
        Markdown.insertButton("Zu den Zahlungsdetails", "ThumbsUp", "primary"),
        Markdown.insertButton("Abbrechen", "X", "secondary"),
      ].join("\n"),
      step_6_1: [
        "Bitte gib hier Deine Zahlungsdaten ein. Aktuell ist nur SEPA-Lastschrift möglich",
        "",
        "Zunächst, wie lautet Ihre IBAN?",
      ].join("\n"),
      step_6_2: [
        'Mit Auswahl von "Sicher zahlen" stimmst du Folgendem zu:',
        "",
        "- Ich ermächtige die Alteos GmbH, fällige Zahlungen per Lastschrift von meinem Konto einzuziehen. Gleichzeitig weise ich mein Kreditinstitut an, diese Lastschriften einzulösen.",
        "- Hinweis zum Widerruf: Ich kann die Erstattung des belasteten Betrags innerhalb von acht Wochen nach dem Abbuchungsdatum verlangen. Es gelten die Vereinbarungen mit meinem Kreditinstitut.",
        "",
        Markdown.insertButton("Sicher zahlen", "ThumbsUp", "primary"),
        Markdown.insertButton("Abbrechen", "X", "secondary"),
      ].join("\n"),
      step_success: [
        "Geschafft, {firstName} {lastName}! Dein Versicherungsschutz steht.",
        "Deine Bestätigung und Unterlagen sind unterwegs. Schau in Dein Postfach!",
      ].join("\n"),
      step_rejected: [
        "**Aktuell kein Angebot möglich**",
        "",
        "Leider können wir Dir auf Basis Deiner Angaben aktuell keine Haftpflichtversicherung anbieten.",
        "",
        "Du kannst gerne in einigen Monaten nochmal vorbeischauen oder dich bei unserem Partner-Service melden: service@alteos.de",
        "",
        Markdown.insertButton("Neue Anfrage starten", "ListRestart"),
        Markdown.insertButton("Chat beenden", "CircleOff"),
      ].join("\n"),
      step_cancel: stepCancel["de-DE"],
    },
    "en-GB": {
      step_1_1: "Let's get started! What is your date of birth?",
      step_1_2: [
        "Who do you want to insure?",
        "",
        Markdown.insertCard("Only me", "", "User"),
        Markdown.insertCard("Me + Partner", "", "Handshake"),
        Markdown.insertCard("Me + Children", "", "Users"),
        Markdown.insertCard("Family", "", "House"),
      ].join("\n"),
      step_2_1: [
        "Perfect! Based on your information:",
        "",
        "### Monthly contribution",
        "## {price}",
        "",
        "This includes:",
        "- Y €50 Million coverage limit",
        "- Y Key loss covered",
        "- Y Default on claims included",
        "- Y Rental property damages up to €50 million",
        "",
        "Do you want to get insured now?",
        "",
        Markdown.insertButton("Yes, continue", "ThumbsUp", "primary"),
        Markdown.insertButton("Show more benefits", "Plus"),
      ].join("\n"),
      step_2_2: [
        "### Monthly contribution",
        "## {price}",
        "",
        "This includes:",
        "- Y Insurance sum up to 50 million euros",
        "- Y Rental damage up to 50 million euros",
        "- Y Loss of keys",
        "- Y Borrowed and rented items up to 20,000 euros",
        "- Y Coverage for claims up to 5,000 euros",
        "- Y Damage from internet usage up to 50 million euros",
        "- Y Liability damage up to 50 million euros",
        "- Y Worldwide coverage for foreign countries (unlimited)",
        "- Y Homeowner protection for single-family homes or apartments up to 50 million euros",
        "- Y Landlord protection for renting out a property",
        "",
        "This does NOT include:",
        "- N Exemption from contributions in case of involuntary unemployment",
        "- N Order guarantee (market guarantee)",
        "",
        "Do you want to get insured now?",
        "",
        Markdown.insertButton("Yes, continue", "ThumbsUp", "primary"),
        Markdown.insertButton(
          "Download insurance documents",
          "Download",
          "https://s3.eu-central-1.amazonaws.com/static.alteos.com/products/aldi-hausrat/Hausrat_Paket-L_Nord.pdf"
        ),
      ].join("\n"),
      step_3_1: [
        "Next, I have a few questions about your insurance history.",
        "Please answer these questions truthfully and completely. This is the only way to ensure your insurance coverage remains valid.",
        'You can find more information in the information sheet on the **"Duty of Disclosure according to §19 of the Insurance Contract Act."**',
        "",
        "Do you currently have or have you had private liability insurance in the last 5 years?",
        "",
        Markdown.insertButton("Yes", "CircleCheck", "yes") + " " + Markdown.insertButton("No", "CircleX", "no"),
      ].join("\n\n"),
      step_3_2: [
        "Have you had any damages in the last 5 years, whether reported or not?",
        "",
        Markdown.insertButton("Yes", "CircleCheck", "yes") + " " + Markdown.insertButton("No", "CircleX", "no"),
      ].join("\n"),
      step_3_3: [
        "**How many times** have you had damages in the last 5 years, whether reported or not?",
        "",
        Markdown.insertButton("One", "Dice1"),
        Markdown.insertButton("Two", "Dice2"),
        Markdown.insertButton("More than two", "SquareArrowUp"),
      ].join("\n"),
      step_4_1: "Ok, now what is your full name?",
      step_4_2: "What is your email address?",
      step_4_3: "What is your full address?",
      step_5_1: "Please confirm the final data for your contract:",
      step_5_1_1: [
        Markdown.insertButton("That is correct", "ThumbsUp", "primary"),
        Markdown.insertButton("Change details", "Repeat", "secondary"),
      ].join("\n"),
      step_5_2: ["Anything else you want to change?"].join("\n"),
      step_5_2_1: [
        Markdown.insertButton("No, continue", "ThumbsUp", "primary"),
        Markdown.insertButton("Change details", "Pencil", "secondary"),
      ].join("\n"),
      step_5_3: [
        "Please check the provided documents, which include:",
        "",
        "- General Terms and Conditions (T&Cs)",
        "- Insurance Product Information Document (IPID)",
        "- GDPR-Compliance-Dokument",
        "- Consultation Protocol",
        "",
        Markdown.insertButton(
          "Download documents",
          "Download",
          "primary",
          "{downloadUrl}"
        ),
        Markdown.insertButton("Cancel", "X", "secondary"),
      ].join("\n"),
      step_5_4: [
        "Please confirm that you agree to the following statements:",
        "",
        "- I confirm that I have read the provided documents and agree to them.",
        "- I agree that my data is stored and processed in the [Partner]-universe.",
        "",
        'By clicking "To the payment details" you confirm that all information is correct and complete. Missing or incorrect information may lead to adjustment or termination of the contract according to § 19 para. 5 VVG.',
        "",
        Markdown.insertButton("To the payment details", "ThumbsUp", "primary"),
        Markdown.insertButton("Cancel", "X", "secondary"),
      ].join("\n"),
      step_6_1: [
        "Please enter your payment details here. Currently, only SEPA direct debit is possible.",
        "",
        "First, what is your IBAN?",
      ].join("\n"),
      step_6_2: [
        'By selecting "Pay securely" you agree to the following:',
        "",
        "- I authorize Alteos GmbH to collect any payments due from my account by direct debit. At the same time, I instruct my bank to honor these direct debits.",
        "- Revocation Notice: I can request a refund of the debited amount within eight weeks of the debit date. The terms and conditions of my bank apply.",
        "",
        Markdown.insertButton("Pay securely", "ThumbsUp", "primary"),
        Markdown.insertButton("Cancel", "X", "secondary"),
      ].join("\n"),
      step_success: [
        "Done, {firstName} {lastName}! Your insurance coverage is active.",
        "Your confirmation and documents are on their way. Check your inbox!",
      ].join("\n"),
      step_rejected: [
        "**Currently no offer available**",
        "",
        "Unfortunately, based on your information, we cannot offer you liability insurance at this time.",
        "",
        "You are welcome to check back in a few months or contact our partner service: service@alteos.de",
        "",
        Markdown.insertButton("Start new request", "ListRestart"),
        Markdown.insertButton("End chat", "CircleOff"),
      ].join("\n"),
      step_cancel: stepCancel["en-GB"],
    },
  },
  authentication: {
    "de-DE": {
      step_data_1:
        "Um sich zu authentifizieren, bitte gib die folgenden Informationen an.",
    },
    "en-GB": {
      step_data_1:
        "To authenticate yourself, please provide the following information.",
    },
  },
  policyManagement: {
    "de-DE": {
      step_policy_data_1: `# Ihre Versicherungspolice

**Police-ID:** {{policyId}}

## Persönliche Daten
- **Name:** {{firstName}} {{lastName}}
- **Geburtsdatum:** {{dateOfBirth}}
- **E-Mail:** {{email}}
- **Adresse:** {{address}}

## Versicherungsdetails
- **Deckungsart:** {{coverageType}}
- **Tarif:** {{tariff}}
- **Versicherungsbeginn:** {{startDate}}
- **Zahlungsrhythmus:** {{paymentFrequency}}
- **IBAN:** {{iban}}

## Status
- **Geplante Änderungen:** {{scheduledUpdates}}
- **Kündigungen:** {{cancellations}}
- **Widerrufe:** {{withdrawals}}`,
      follow_up_question_1:
        "Kann ich dir dabei helfen Änderungen an deiner Versicherung vorzunehmen?",
    },
    "en-GB": {
      step_policy_data_1: `# Your Insurance Policy

**Policy ID:** {{policyId}}

## Personal Information
- **Name:** {{firstName}} {{lastName}}
- **Date of Birth:** {{dateOfBirth}}
- **Email:** {{email}}
- **Address:** {{address}}

## Insurance Details
- **Coverage Type:** {{coverageType}}
- **Tariff:** {{tariff}}
- **Insurance Start Date:** {{startDate}}
- **Payment Frequency:** {{paymentFrequency}}
- **IBAN:** {{iban}}

## Status
- **Scheduled Updates:** {{scheduledUpdates}}
- **Cancellations:** {{cancellations}}
- **Withdrawals:** {{withdrawals}}`,
      follow_up_question_1: "Can I help you with any changes to your policy?",
    },
  },
  policyManagementTerminate: {
    "de-DE": {
      step_collect_cancellation: [
        "Bitte gib das Kündigungsdatum und den Grund an.",
        "",
        Markdown.insertButton("Ordentlicher Widerruf"),
        Markdown.insertButton("Falsche Angaben"),
      ].join("\n"),
      step_collect_withdrawal: [
        "Bitte gib den Widerrufsgrund an.",
        "",
        Markdown.insertButton("Ordentlicher Widerruf"),
        Markdown.insertButton("Falsche Angaben"),
      ].join("\n"),
      step_confirm_cancellation: "Bitte bestätige die Kündigung.",
      step_confirm_withdrawal: [
        "Bitte bestätige den Widerruf.",
        "",
        Markdown.insertButton("Bestätigen", "ThumbsUp", "primary"),
        Markdown.insertButton("Abbrechen", "X", "secondary"),
      ].join("\n"),
      step_cancel: stepCancel["de-DE"],
      step_applied: "Dein Auftrag wurde bestätigt. Vielen Dank!",
      step_not_needed:
        "Deine Versicherung ist bereits abgebrochen oder widerrufen worden.",
    },
    "en-GB": {
      step_collect_cancellation: [
        "Please provide the cancellation date and reason.",
        "",
        Markdown.insertButton("Regular termination"),
        Markdown.insertButton("False declarations"),
      ].join("\n"),
      step_collect_withdrawal: [
        "Please state the reason for withdrawal.",
        "",
        Markdown.insertButton("Regular withdrawal"),
        Markdown.insertButton("False declarations"),
      ].join("\n"),
      step_confirm_cancellation: "Please confirm the cancellation.",
      step_confirm_withdrawal: [
        "Please confirm the withdrawal.",
        "",
        Markdown.insertButton("Confirm", "ThumbsUp", "primary"),
        Markdown.insertButton("Cancel", "X", "secondary"),
      ].join("\n"),
      step_cancel: stepCancel["en-GB"],
      step_applied: "Your request has been confirmed. Thank you!",
      step_not_needed: "Your policy has already been canceled or withdrawn.",
    },
  },
} as const;

export type WorkflowNamespace = keyof typeof workflowMessages;
export type WorkflowMessageKey<N extends WorkflowNamespace> =
  keyof (typeof workflowMessages)[N][Locale];

export function getWorkflowMessage<
  N extends WorkflowNamespace,
  K extends WorkflowMessageKey<N>,
>(locale: Locale, namespace: N, key: K): string {
  // @ts-expect-error - index access across constrained generics
  return workflowMessages[namespace][locale][key];
}

export function getTranslation<T extends keyof Labels>(
  locale: Locale,
  key: T
): Labels[T] {
  return i18n[locale][key];
}

export function getEnrichedDataReview(
  locale: Locale,
  dataCollection: DataCollection,
  quote: Quote
): string {
  return i18n[locale].dataReview
    .replace("{firstName}", dataCollection.firstName || "")
    .replace("{lastName}", dataCollection.lastName || "")
    .replace(
      "{dateOfBirth}",
      new Date(dataCollection.dateOfBirth || "").toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) || ""
    )
    .replace("{email}", dataCollection.email || "")
    .replace("{street}", dataCollection.street || "")
    .replace("{houseNumber}", dataCollection.houseNumber || "")
    .replace("{zipCode}", dataCollection.zipCode || "")
    .replace("{city}", dataCollection.city || "")
    .replace(
      "{coverageScope}",
      i18n[locale].coverageScopes[dataCollection.coverageScope || "single"]
    )
    .replace("{tariff}", quote.data?.package.name || "")
    .replace(
      "{amount}",
      Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(
        quote.data?.gross || 0
      )
    )
    .replace(
      "{paymentMethod}",
      i18n[locale].paymentSchedules[
        quote.data?.requestData.values.paymentSchedule || "monthly"
      ]
    )
    .replace(
      "{startDate}",
      new Date(
        dataCollection.startDate || addDays(new Date(), 1)
      ).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
}
