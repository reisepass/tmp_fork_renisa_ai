import { evaluateClaim } from "../src/claim-eval.js";
import * as fs from "node:fs";
import * as path from "node:path";

async function testEvaluateClaim() {
  const insurancePolicy = fs.readFileSync(path.join(import.meta.dirname, "../../Privathaftpflichtversicherung_police_m.txt"), "utf-8");
  const insuranceBenefits = fs.readFileSync(path.join(import.meta.dirname, "../../LeistungsUbersicht_m.txt"), "utf-8");
  const customerMessage = "Meine Schwester bat mich, ihre Wohnung in Berlin zu hüten, während sie weg ist. Ich habe versehentlich einen Wasserhahn laufen lassen, ihr Bad überflutet und 12.000€ Schaden verursacht. Sie will über meine Versicherung abrechnen. Geht das?"; //I will add this later

  const decision = await evaluateClaim(
    customerMessage,
    insurancePolicy,
    insuranceBenefits
  );

  console.log(`The final decision is: ${decision}`);
}

testEvaluateClaim();
