import type { AccountExport } from "@/types/account";

/**
 * Construit le classeur Excel d'un export de compte.
 *
 * Généré DANS LE NAVIGATEUR, avec la bibliothèque déjà embarquée pour l'import
 * de tableurs — donc sans une seule dépendance ni une seule route de plus. Elle
 * est chargée à la demande : quelqu'un qui n'exporte jamais ne la télécharge
 * jamais.
 *
 * Le `.xlsx` a été préféré au CSV pour une raison qui n'est pas cosmétique : un
 * CSV ne transporte que du texte, et c'est Excel qui devine ensuite s'il s'agit
 * d'une date, d'un nombre ou d'un mot — parfois mal, et différemment selon la
 * langue du logiciel. Ici une date EST une date et un montant EST un nombre.
 * Tout l'échafaudage point-virgule et BOM que réclamait le CSV disparaît avec.
 *
 * Et la feuille « Transactions » porte exactement les en-têtes que sait relire
 * notre propre import : ce qui sort peut être réimporté tel quel.
 */
export async function buildAccountWorkbook(
  data: AccountExport,
): Promise<Blob> {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  const add = (name: string, rows: Array<Record<string, unknown>>) => {
    // Une feuille vide est du bruit : quelqu'un sans cotisation n'a pas besoin
    // d'un onglet « Cotisations » désespérément vide.
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows, { cellDates: true });
    ws["!cols"] = widthsOf(rows);
    // 31 caractères est la limite d'Excel ; au-delà le fichier est refusé.
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };

  add(
    "Profil",
    Object.entries({
      "Nom": data.profil.name,
      "Adresse e-mail": data.profil.email,
      "Devise": data.profil.currency,
      "Compte créé le": date(data.profil.createdAt),
      "Dernière connexion": date(data.profil.lastLoginAt),
      "Points": data.profil.totalPoints,
      "Série en cours": data.profil.currentStreak,
      "Meilleure série": data.profil.bestStreak,
      "Export généré le": date(data.aPropos.genere),
    }).map(([Information, Valeur]) => ({ Information, Valeur })),
  );

  // Les en-têtes de cette feuille sont ceux que reconnaît notre parseur
  // d'import. Changer un intitulé ici casse le retour en arrière.
  add(
    "Transactions",
    data.transactions.map((t) => ({
      Date: date(t.date),
      Sens: t.sens === "entrée" ? "Entrée" : "Sortie",
      Montant: t.montant,
      "Catégorie": t.categorie ?? "",
      Note: t.note ?? "",
    })),
  );

  add(
    "Budgets",
    data.budgets.map((b) => ({
      "Catégorie": b.category.name,
      "Plafond mensuel": b.monthlyLimit,
      "Alerte à": `${Math.round(b.alertThreshold * 100)} %`,
    })),
  );

  add(
    "Récurrences",
    data.transactionsRecurrentes.map((r) => ({
      Sens: r.type === "INCOME" ? "Entrée" : "Sortie",
      Montant: r.amount,
      "Jour du mois": r.dayOfMonth,
      Note: r.note ?? "",
      Active: r.isActive ? "oui" : "non",
    })),
  );

  add(
    "Épargne",
    data.objectifEpargne
      ? [
          {
            Objectif: data.objectifEpargne.name,
            "Montant visé": data.objectifEpargne.targetAmount,
            "Par jour": data.objectifEpargne.dailyAmount,
            "Échéance": date(data.objectifEpargne.deadline),
            "Atteint": data.objectifEpargne.isCompleted ? "oui" : "non",
          },
        ]
      : [],
  );

  add(
    "Cotisations créées",
    data.cotisationsCreees.map((p) => ({
      Nom: p.name,
      Description: p.description ?? "",
      "Montant visé": p.targetAmount,
      "Échéance": date(p.deadline),
      Type: p.isGroup ? "groupe" : "solo",
      Membres: p._count.members,
      "Terminée": p.isCompleted ? "oui" : "non",
    })),
  );

  add(
    "Cotisations rejointes",
    data.cotisationsRejointes.map((m) => ({
      Nom: m.moneyPot.name,
      Type: m.moneyPot.isGroup ? "groupe" : "solo",
      "Rejointe le": date(m.joinedAt),
    })),
  );

  add(
    "Imports",
    data.imports.map((b) => ({
      "Période": b.periodLabel ?? "",
      Origine: b.source === "FILE" ? "fichier" : "texte collé",
      Lignes: b.lineCount,
      "Entrées": b.importedIncomeTotal,
      Sorties: b.importedExpenseTotal,
      "Importé le": date(b.createdAt),
    })),
  );

  add(
    "Catégories",
    data.categoriesDeDepense.map((c) => ({
      "Catégorie": c.name,
      Type: c.kind,
      "Créée le": date(c.createdAt),
    })),
  );

  add(
    "Sources de revenu",
    data.sourcesDeRevenu.map((s) => ({
      Source: s.name,
      "Créée le": date(s.createdAt),
    })),
  );

  add(
    "Badges",
    data.badges.map((b) => ({
      Badge: b.badge.name,
      "Obtenu le": date(b.unlockedAt),
    })),
  );

  add(
    "Articles",
    data.articles.map((a) => ({
      Titre: a.title,
      "Résumé": a.excerpt,
      Contenu: a.content,
      "Publié le": date(a.createdAt),
    })),
  );

  add(
    "Commentaires",
    data.commentaires.map((c) => ({
      Article: c.article.title,
      Commentaire: c.body,
      "Écrit le": date(c.createdAt),
    })),
  );

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Les dates deviennent de vrais objets `Date`, jamais des chaînes.
 *
 * C'est ce qui permet à Excel de les trier, de les filtrer et de calculer
 * dessus. Une date restée sous forme de texte se trie par ordre alphabétique —
 * et un carnet trié alphabétiquement place le 10 janvier avant le 2 février.
 */
function date(iso: string | null): Date | string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d;
}

/**
 * Largeur des colonnes, calculée sur le contenu réel.
 *
 * Sans ça, tout arrive à la largeur par défaut : les montants tiennent, mais
 * les notes s'affichent en `####` ou débordent, et la première impression du
 * fichier est celle d'un export bâclé.
 */
function widthsOf(rows: Array<Record<string, unknown>>): Array<{ wch: number }> {
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    const longest = rows.reduce((max, row) => {
      const v = row[key];
      const len = v instanceof Date ? 10 : String(v ?? "").length;
      return Math.max(max, len);
    }, key.length);
    // Plafonné : une colonne « Contenu » d'article ferait sinon plusieurs
    // milliers de caractères de large.
    return { wch: Math.min(Math.max(longest + 2, 10), 50) };
  });
}
