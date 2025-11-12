import { Locale } from "@renisa-ai/config/types";
import { Markdown } from "@renisa-ai/utils";

type Labels = {
  welcomeMessage: string;
  salesContinue: string;
  brand: { subtitle: string };
  input: { placeholder: string };
  menu: { chatMode: string; support: string; debug: string };
  legal: { imprint: string; privacy: string; terms: string };
  legalModal: {
    titles: { imprint: string; privacy: string; terms: string };
    contents: { imprint: string; privacy: string; terms: string };
    close: string;
  };
  webPreview: {
    enterUrlPlaceholder: string;
    previewTitle: string;
    console: string;
    noConsoleOutput: string;
  };
  inlineCitation: { previous: string; next: string };
  chatMessage: { alertTitle: string; avatarName: string };
  carousel: { previousSlide: string; nextSlide: string };
  reasoning: {
    thinking: string;
    thoughtFor: string; // use {duration} and {unit} placeholders
    second: string;
    seconds: string;
  };
  inactivityTimeout: {
    warningTitle: string;
    warningMessage: string; // use {inactiveMinutes} and {remainingMinutes} placeholders
    logoutTitle: string;
    logoutMessage: string;
    continueSession: string;
    refresh: string;
  };
};

export const i18n = {
  "de-DE": {
    welcomeMessage: [
      "# Hallo! Ich bin dein Alteos KI-Agent",
      "",
      "Ich helfe dir bei allen Fragen rund um deine Privathaftpflichtversicherung.",
      "",
      Markdown.insertButton("Jetzt versichern", undefined, "primary"),
      Markdown.insertButton("Meine Police verwalten", undefined, "primary"),
      Markdown.insertButton("Frage stellen", undefined, "secondary"),
    ].join("\n"),
    salesContinue: [
      "Dokumente heruntergeladen.",
      "",
      "Möchtest du dich jetzt versichern?",
    ].join("\n"),
    brand: {
      subtitle: "Multi-Agenten KI-Versicherungsassistent",
    },
    input: {
      placeholder: "Gib deine Frage oder Antwort hier ein...",
    },
    menu: {
      chatMode: "Chat Modus",
      support: "Unterstützung",
      debug: "Debug",
    },
    legal: {
      imprint: "Impressum",
      privacy: "Datenschutz",
      terms: "AGB",
    },
    legalModal: {
      titles: {
        imprint: "Impressum",
        privacy: "Datenschutz",
        terms: "Allgemeine Geschäftsbedingungen",
      },
      contents: {
        imprint: `**Alteos GmbH**

Versicherungsvertreter mit Patronat gem. § 34d Abs. 7 Nr. 1 GewO

Tauentzienstr. 7 b/c
10789 Berlin

**Kontakt:**
Telefon: +49 30 5683 7912
E-Mail: info@alteos.com
Internet: https://alteos.com/

**Geschäftsführer:** Dr. Sebastian Sieglerschmidt
**Vorsitzender des Beirats:** Dr. Marc Daniel Zimmermann

**Handelsregister:** Amtsgericht Charlottenburg, HRB 196162 B
**Umsatzsteuer-ID:** DE298344543
**GISA-Nr:** 35479994

### Versicherungsvermittlungsregister

Gemeldet bei der Industrie- und Handelskammer Berlin, Fasanenstraße 85, 10623 Berlin, als Versicherungsvertreter mit Patronat gem. § 34d Abs. 7 GewO

**Register-Nummer:** D-4UIL-5XJ29-40

**Gemeinsame Registerstelle nach § 11a Abs. 1 GewO:**
Deutscher Industrie- und Handelskammertag (DIHK)
Breite Straße 29, 10178 Berlin
+49 (0) 180 600 58 50
(dt. Festnetz 20 Ct., Mobilfunk max. 60 Ct. pro Anruf)
http://www.vermittlerregister.info

### Berufsrechtliche Regelungen

- § 34d Gewerbeordnung (GewO)
- §§ 59 - 68 Gesetz über den Versicherungsvertrag (VVG)
- Verordnung über die Versicherungsvermittlung und -beratung (VersVermV)

Die berufsrechtlichen Regelungen können über die vom Bundesministerium der Justiz und von der juris GmbH betriebenen Homepage http://www.gesetze-im-internet.de eingesehen und abgerufen werden.

### Übersicht externe Beschwerdestellen

Die Teilnahme an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle erfolgt aufgrund einer freiwilligen Mitgliedschaft beim Versicherungsombudsmann e.V.

**Versicherungsombudsmann e.V.**
Postfach 080 632, 10006 Berlin
Tel.: +49 800 3696000
E-Mail: Beschwerde@versicherungsombudsmann.de
www.versicherungsombudsmann.de

**Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin)**

Dienstsitz Bonn:
Graurheindorfer Str. 108, 53117 Bonn

Dienstsitz Frankfurt:
Marie-Curie-Str. 24-28, 60439 Frankfurt

Tel.: +49 (0) 228 / 4108 - 0
Fax: +49 (0) 228 / 4108 - 1550
E-Mail: poststelle@bafin.de
www.bafin.de

### Haftung für Inhalte

Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir als Diensteanbieter sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.

### Haftung für Links

Unser Angebot kann Links zu externen Webseiten Dritter enthalten, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten allein verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.

### Urheberrecht

Das Nutzungsrecht an dem Inhalt dieser Webseite oder Teilen davon steht der Alteos GmbH zu und wurde dieser von den jeweiligen Urhebern übertragen. Einzelne Seiten dieser Webseite dürfen zum ausschließlichen Gebrauch innerhalb Ihres Unternehmens heruntergeladen, vorübergehend gespeichert und gedruckt werden. Jede andere Vervielfältigung, Übertragung oder Verbreitung jeglichen Inhalts dieser Webseite, insbesondere durch Herunterladen, Speichern oder Drucken, ist ohne die ausdrückliche Einwilligung der Geschäftsführung der Alteos GmbH verboten. Anfragen hierzu richten Sie bitte per E-Mail an info@alteos.com.`,
        privacy: "Dies ist die Datenschutzerklärung für Alteos...",
        terms: "Dies sind die Allgemeinen Geschäftsbedingungen für Alteos...",
      },
      close: "Schließen",
    },
    webPreview: {
      enterUrlPlaceholder: "URL eingeben...",
      previewTitle: "Vorschau",
      console: "Konsole",
      noConsoleOutput: "Keine Konsolenausgabe",
    },
    inlineCitation: {
      previous: "Zurück",
      next: "Weiter",
    },
    chatMessage: {
      alertTitle: "Achtung!",
      avatarName: "Alteos",
    },
    carousel: {
      previousSlide: "Vorherige Folie",
      nextSlide: "Nächste Folie",
    },
    reasoning: {
      thinking: "Denke nach...",
      thoughtFor: "Gedacht für {duration} {unit}",
      second: "Sekunde",
      seconds: "Sekunden",
    },
    inactivityTimeout: {
      warningTitle: "Inaktivitätswarnung",
      warningMessage:
        "Du warst {inactiveMinutes} Minuten lang inaktiv. Deine Sitzung wird in {remainingMinutes} Minuten aus Sicherheitsgründen beendet.",
      logoutTitle: "Sitzung abgelaufen",
      logoutMessage:
        "Deine Sitzung ist aufgrund von Inaktivität abgelaufen. Bitte lade die Seite neu, um fortzufahren.",
      continueSession: "Sitzung fortsetzen",
      refresh: "Seite neu laden",
    },
  },
  "en-GB": {
    welcomeMessage: [
      "# Hello! I'm your Alteos AI agent",
      "",
      "I'm here to help you with all your Private Liability Insurance needs.",
      "",
      Markdown.insertButton("Get insurance now", undefined, "primary"),
      Markdown.insertButton("Manage my policy", undefined, "primary"),
      Markdown.insertButton("Ask a question", undefined, "secondary"),
    ].join("\n"),
    salesContinue: [
      "Documents downloaded.",
      "",
      "Do you want to get insured now?",
    ].join("\n"),
    brand: {
      subtitle: "Multi-Agent AI Insurance Assistant",
    },
    input: {
      placeholder: "Type your question or answer here...",
    },
    menu: {
      chatMode: "Chat Mode",
      support: "Support",
      debug: "Debug",
    },
    legal: {
      imprint: "Imprint",
      privacy: "Privacy",
      terms: "Terms",
    },
    legalModal: {
      titles: {
        imprint: "Imprint",
        privacy: "Privacy Policy",
        terms: "Terms & Conditions",
      },
      contents: {
        imprint: `**Alteos GmbH**

Insurance Representative with Patronage according to § 34d Para. 7 No. 1 GewO

Tauentzienstr. 7 b/c
10789 Berlin, Germany

**Contact:**
Phone: +49 30 5683 7912
Email: info@alteos.com
Internet: https://alteos.com/

**Managing Director:** Dr. Sebastian Sieglerschmidt
**Chairman of the Advisory Board:** Dr. Marc Daniel Zimmermann

**Commercial Register:** Local Court Charlottenburg, HRB 196162 B
**VAT ID:** DE298344543
**GISA No.:** 35479994

### Insurance Intermediary Register

Registered with the Chamber of Industry and Commerce Berlin, Fasanenstraße 85, 10623 Berlin, as an insurance representative with patronage according to § 34d Para. 7 GewO

**Register Number:** D-4UIL-5XJ29-40

**Joint Registry according to § 11a Para. 1 GewO:**
German Chamber of Industry and Commerce (DIHK)
Breite Straße 29, 10178 Berlin
+49 (0) 180 600 58 50
(German landline 20 ct., mobile max. 60 ct. per call)
http://www.vermittlerregister.info

### Professional Legal Regulations

- § 34d Trade Regulation Act (GewO)
- §§ 59 - 68 Insurance Contract Act (VVG)
- Ordinance on Insurance Brokerage and Consultation (VersVermV)

The professional legal regulations can be viewed and accessed via the homepage http://www.gesetze-im-internet.de operated by the Federal Ministry of Justice and juris GmbH.

### External Complaints Overview

Participation in dispute resolution proceedings before a consumer arbitration board is based on voluntary membership with the Insurance Ombudsman e.V.

**Insurance Ombudsman e.V.**
P.O. Box 080 632, 10006 Berlin
Phone: +49 800 3696000
Email: Beschwerde@versicherungsombudsmann.de
www.versicherungsombudsmann.de

**Federal Financial Supervisory Authority (BaFin)**

Bonn Office:
Graurheindorfer Str. 108, 53117 Bonn

Frankfurt Office:
Marie-Curie-Str. 24-28, 60439 Frankfurt

Phone: +49 (0) 228 / 4108 - 0
Fax: +49 (0) 228 / 4108 - 1550
Email: poststelle@bafin.de
www.bafin.de

### Liability for Content

As a service provider, we are responsible for our own content on these pages in accordance with § 7 Para. 1 DDG according to general laws. However, as a service provider, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Obligations to remove or block the use of information according to general laws remain unaffected. Liability in this regard is only possible from the time of knowledge of a specific legal violation. Upon becoming aware of corresponding legal violations, we will remove this content immediately.

### Liability for Links

Our offer may contain links to external third-party websites over whose content we have no influence. The respective provider or operator of the pages is always solely responsible for the content of the linked pages. The linked pages were checked for possible legal violations at the time of linking. Illegal content was not recognizable at the time of linking. However, permanent content control of the linked pages is not reasonable without concrete evidence of a legal violation. Upon becoming aware of legal violations, we will remove such links immediately.

### Copyright

The right to use the content of this website or parts thereof belongs to Alteos GmbH and was transferred to it by the respective authors. Individual pages of this website may be downloaded, temporarily stored and printed exclusively for use within your company. Any other reproduction, transmission or distribution of any content of this website, in particular by downloading, storing or printing, is prohibited without the express consent of the management of Alteos GmbH. Please direct inquiries to info@alteos.com.`,
        privacy: "This is the privacy policy for Alteos...",
        terms: "These are the terms and conditions for Alteos...",
      },
      close: "Close",
    },
    webPreview: {
      enterUrlPlaceholder: "Enter URL...",
      previewTitle: "Preview",
      console: "Console",
      noConsoleOutput: "No console output",
    },
    inlineCitation: {
      previous: "Previous",
      next: "Next",
    },
    chatMessage: {
      alertTitle: "Heads up!",
      avatarName: "Alteos",
    },
    carousel: {
      previousSlide: "Previous slide",
      nextSlide: "Next slide",
    },
    reasoning: {
      thinking: "Thinking...",
      thoughtFor: "Thought for {duration} {unit}",
      second: "second",
      seconds: "seconds",
    },
    inactivityTimeout: {
      warningTitle: "Inactivity Warning",
      warningMessage:
        "You have been inactive for {inactiveMinutes} minutes. Your session will expire in {remainingMinutes} minutes for security reasons.",
      logoutTitle: "Session Expired",
      logoutMessage:
        "Your session has expired due to inactivity. Please refresh the page to continue.",
      continueSession: "Continue Session",
      refresh: "Refresh Page",
    },
  },
} as const satisfies Record<Locale, Labels>;
