import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  isAllowedEmail,
  nameFromEmail,
  subForEmail,
  verifySessionToken,
} from "./universityAuth";

describe("isAllowedEmail", () => {
  it("accepte les domaines de l'université", () => {
    expect(isAllowedEmail("jean.dupont@univ-tlse3.fr")).toBe(true);
    expect(isAllowedEmail("Jean.Dupont@UTOULOUSE.FR")).toBe(true);
  });

  it("refuse les autres domaines et les contournements", () => {
    expect(isAllowedEmail("x@gmail.com")).toBe(false);
    expect(isAllowedEmail("x@univ-tlse3.fr.evil.com")).toBe(false);
    expect(isAllowedEmail("x@etu.univ-tlse3.fr")).toBe(false);
    expect(isAllowedEmail("univ-tlse3.fr")).toBe(false);
    expect(isAllowedEmail("evil@x.com@univ-tlse3.fr")).toBe(true); // domaine = après le dernier @
  });
});

describe("session", () => {
  it("valide un jeton signé et rejette un jeton altéré", () => {
    const token = createSessionToken(subForEmail("a@univ-tlse3.fr"), "a@univ-tlse3.fr");
    expect(verifySessionToken(token)?.email).toBe("a@univ-tlse3.fr");
    expect(verifySessionToken(token + "x")).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });

  it("rejette une session dont le domaine n'est pas autorisé", () => {
    expect(verifySessionToken(createSessionToken("s", "a@gmail.com"))).toBeNull();
  });
});

describe("nameFromEmail", () => {
  it("dérive un nom lisible", () => {
    expect(nameFromEmail("jean.dupont@univ-tlse3.fr")).toBe("Jean Dupont");
    expect(nameFromEmail("a1@utoulouse.fr")).toBe("Etudiant");
  });
});
