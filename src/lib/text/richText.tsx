import type { ReactNode } from "react";

/**
 * Rendu markdown-lite pour les enonces : **gras** et *italique* uniquement,
 * saisis directement depuis l'admin. Pas d'imbrication ni d'autres syntaxes.
 */
export function renderRichText(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}
