import { Fragment } from "react";

// Match URL http(s) classiques. On exclut les caractères de ponctuation finale
// (point, virgule, parenthèse fermante) pour ne pas les coller à l'URL.
// `String.matchAll` n'a pas d'état partagé contrairement à `regex.exec`.
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,!?;:)\]}]/gi;

/**
 * Rendu d'un texte simple avec auto-link des URLs http(s).
 * Pas de markdown — on respecte les sauts de ligne via white-space:pre-wrap.
 *
 * Volontairement tout côté front : le backend stocke du plain text sans
 * échappement HTML supplémentaire (React le fait), pas de XSS possible.
 */
export function AutoLinkText({ text, className }: { text: string; className?: string }) {
  const parts: Array<{ type: "text" | "link"; value: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({ type: "link", value: match[0] });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return (
    <p
      className={className}
      style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
    >
      {parts.map((p, i) =>
        p.type === "link" ? (
          <a
            key={i}
            href={p.value}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sousou-primary-700 hover:underline break-all"
          >
            {p.value}
          </a>
        ) : (
          <Fragment key={i}>{p.value}</Fragment>
        ),
      )}
    </p>
  );
}
