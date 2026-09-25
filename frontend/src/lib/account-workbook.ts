import type { Row, Workbook, Worksheet } from "exceljs";

import type { AccountExport } from "@/types/account";

/**
 * Construit le classeur Excel d'un export de compte.
 *
 * Généré DANS LE NAVIGATEUR, chargé à la demande : quelqu'un qui n'exporte
 * jamais ne télécharge jamais la bibliothèque. Le serveur n'envoie que du JSON,
 * donc les deux formats proposés décrivent forcément les mêmes données.
 *
 * ExcelJS plutôt que la bibliothèque déjà utilisée pour l'import : celle-ci sait
 * lire des fichiers stylés mais ne sait pas en écrire — gras, couleurs, bordures
 * et volets figés appartiennent à sa version payante. Mesuré : 252 Ko gzippés,
 * soit moins que ce que pèse déjà l'autre côté import.
 */

/** Couleurs de marque, au format ARGB attendu par le format Excel. */
const VERT = "FF047857";
const VERT_PALE = "FFECFDF5";
const ARDOISE = "FF1E293B";
const ROUGE = "FFBE123C";
const ZEBRE = "FFF8FAFC";
const TRAIT = "FFCBD5E1";

const MONNAIE = '# ##0\\ "FCFA"';
const JOUR = "dd/mm/yyyy";

interface Col {
  header: string;
  width: number;
  numFmt?: string;
  align?: "left" | "right" | "center";
}

export async function buildAccountWorkbook(data: AccountExport): Promise<Blob> {
  const mod = await import("exceljs");
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;

  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = "Sou'Sou";
  wb.created = new Date();

  buildTransactions(wb, data);
  buildBudgets(wb, data);
  buildRecurrences(wb, data);
  buildEpargne(wb, data);
  buildCotisations(wb, data);
  buildImports(wb, data);
  buildListes(wb, data);
  buildEcrits(wb, data);
  // Le profil en dernier : c'est la feuille la moins consultée, et Excel ouvre
  // toujours sur la première — autant que ce soient les transactions.
  buildProfil(wb, data);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/* ------------------------------------------------------------------ feuilles */

function buildTransactions(wb: Workbook, data: AccountExport): void {
  const rows = data.transactions;
  if (rows.length === 0) return;

  // Ces intitulés sont exactement ceux que sait relire notre propre import.
  // Les changer casse la possibilité de réimporter son export.
  const ws = sheet(wb, "Transactions", [
    { header: "Date", width: 13, numFmt: JOUR },
    { header: "Sens", width: 11 },
    { header: "Montant", width: 16, numFmt: MONNAIE, align: "right" },
    { header: "Catégorie", width: 22 },
    { header: "Note", width: 40 },
  ]);

  for (const t of rows) {
    const entree = t.sens === "entrée";
    const row = ws.addRow([
      jour(t.date),
      entree ? "Entrée" : "Sortie",
      t.montant,
      t.categorie ?? "",
      t.note ?? "",
    ]);
    row.getCell(3).font = { bold: true, color: { argb: entree ? VERT : ROUGE } };
  }

  finish(ws, rows.length);

  /**
   * Trois totaux, pas un seul.
   *
   * Additionner entrées et sorties dans une même somme ne produit aucun nombre
   * ayant un sens : ce n'est ni ce qui est rentré, ni ce qui est sorti, ni la
   * différence. C'est la même règle que celle qui gouverne l'audit d'import —
   * un document qui n'écrit qu'un total sans distinguer les sens ne permet de
   * vérifier ni l'un ni l'autre.
   */
  const last = rows.length + 1;
  const entrees = sum(rows.filter((t) => t.sens === "entrée"));
  const sorties = sum(rows.filter((t) => t.sens !== "entrée"));

  ws.addRow([]);
  totalRow(ws, "Total entrées", {
    formula: `SUMIF(B2:B${last},"Entrée",C2:C${last})`,
    result: entrees,
  }, VERT);
  totalRow(ws, "Total sorties", {
    formula: `SUMIF(B2:B${last},"Sortie",C2:C${last})`,
    result: sorties,
  }, ROUGE);
  const solde = ws.rowCount;
  totalRow(
    ws,
    "Solde",
    { formula: `C${solde - 1}-C${solde}`, result: entrees - sorties },
    entrees - sorties >= 0 ? VERT : ROUGE,
    true,
  );
}

function buildBudgets(wb: Workbook, data: AccountExport): void {
  if (data.budgets.length === 0) return;
  const ws = sheet(wb, "Budgets", [
    { header: "Catégorie", width: 24 },
    { header: "Plafond mensuel", width: 18, numFmt: MONNAIE, align: "right" },
    { header: "Alerte à", width: 12, align: "center" },
  ]);
  for (const b of data.budgets) {
    ws.addRow([
      b.category.name,
      b.monthlyLimit,
      `${Math.round(b.alertThreshold * 100)} %`,
    ]);
  }
  finish(ws, data.budgets.length);
}

function buildRecurrences(wb: Workbook, data: AccountExport): void {
  const rows = data.transactionsRecurrentes;
  if (rows.length === 0) return;
  // « Montant » en troisième colonne, comme sur la feuille des transactions :
  // la ligne de total a ainsi deux colonnes à sa gauche pour y écrire son
  // libellé sans être tronquée.
  const ws = sheet(wb, "Récurrences", [
    { header: "Sens", width: 11 },
    { header: "Jour du mois", width: 14, align: "center" },
    { header: "Montant", width: 16, numFmt: MONNAIE, align: "right" },
    { header: "Note", width: 34 },
    { header: "Active", width: 10, align: "center" },
  ]);
  for (const r of rows) {
    const entree = r.type === "INCOME";
    const row = ws.addRow([
      entree ? "Entrée" : "Sortie",
      r.dayOfMonth,
      r.amount,
      r.note ?? "",
      r.isActive ? "oui" : "non",
    ]);
    row.getCell(3).font = { bold: true, color: { argb: entree ? VERT : ROUGE } };
  }
  finish(ws, rows.length);

  // Ce que ces règles engagent chaque mois — le chiffre que personne ne calcule
  // spontanément mais que tout le monde veut connaître.
  const actives = rows.filter((r) => r.isActive);
  ws.addRow([]);
  totalRow(ws, "Entrées fixes par mois", sum2(actives, "INCOME"), VERT);
  totalRow(ws, "Sorties fixes par mois", sum2(actives, "EXPENSE"), ROUGE);
}

function buildEpargne(wb: Workbook, data: AccountExport): void {
  const g = data.objectifEpargne;
  if (!g) return;
  const ws = sheet(wb, "Épargne", [
    { header: "Objectif", width: 24 },
    { header: "Montant visé", width: 16, numFmt: MONNAIE, align: "right" },
    { header: "Par jour", width: 14, numFmt: MONNAIE, align: "right" },
    { header: "Échéance", width: 13, numFmt: JOUR },
    { header: "Atteint", width: 10, align: "center" },
  ]);
  ws.addRow([
    g.name,
    g.targetAmount,
    g.dailyAmount,
    jour(g.deadline),
    g.isCompleted ? "oui" : "non",
  ]);
  finish(ws, 1);
}

function buildCotisations(wb: Workbook, data: AccountExport): void {
  if (data.cotisationsCreees.length > 0) {
    const ws = sheet(wb, "Cotisations créées", [
      { header: "Nom", width: 24 },
      { header: "Description", width: 34 },
      { header: "Montant visé", width: 16, numFmt: MONNAIE, align: "right" },
      { header: "Échéance", width: 13, numFmt: JOUR },
      { header: "Type", width: 10, align: "center" },
      { header: "Membres", width: 10, align: "center" },
      { header: "Terminée", width: 11, align: "center" },
    ]);
    for (const p of data.cotisationsCreees) {
      ws.addRow([
        p.name,
        p.description ?? "",
        p.targetAmount,
        jour(p.deadline),
        p.isGroup ? "groupe" : "solo",
        p._count.members,
        p.isCompleted ? "oui" : "non",
      ]);
    }
    finish(ws, data.cotisationsCreees.length);
  }

  if (data.cotisationsRejointes.length > 0) {
    const ws = sheet(wb, "Cotisations rejointes", [
      { header: "Nom", width: 26 },
      { header: "Type", width: 12, align: "center" },
      { header: "Rejointe le", width: 14, numFmt: JOUR },
    ]);
    for (const m of data.cotisationsRejointes) {
      ws.addRow([
        m.moneyPot.name,
        m.moneyPot.isGroup ? "groupe" : "solo",
        jour(m.joinedAt),
      ]);
    }
    finish(ws, data.cotisationsRejointes.length);
  }
}

function buildImports(wb: Workbook, data: AccountExport): void {
  const rows = data.imports;
  if (rows.length === 0) return;
  const ws = sheet(wb, "Imports", [
    { header: "Période", width: 18 },
    { header: "Origine", width: 14 },
    { header: "Lignes", width: 10, align: "center" },
    { header: "Entrées", width: 15, numFmt: MONNAIE, align: "right" },
    { header: "Sorties", width: 15, numFmt: MONNAIE, align: "right" },
    { header: "Importé le", width: 14, numFmt: JOUR },
  ]);
  for (const b of rows) {
    const row = ws.addRow([
      b.periodLabel ?? "",
      b.source === "FILE" ? "fichier" : "texte collé",
      b.lineCount,
      b.importedIncomeTotal,
      b.importedExpenseTotal,
      jour(b.createdAt),
    ]);
    row.getCell(4).font = { bold: true, color: { argb: VERT } };
    row.getCell(5).font = { bold: true, color: { argb: ROUGE } };
  }
  finish(ws, rows.length);
}

function buildListes(wb: Workbook, data: AccountExport): void {
  if (data.categoriesDeDepense.length > 0) {
    const ws = sheet(wb, "Catégories", [
      { header: "Catégorie", width: 24 },
      { header: "Type", width: 14 },
      { header: "Créée le", width: 13, numFmt: JOUR },
    ]);
    for (const c of data.categoriesDeDepense) {
      ws.addRow([c.name, c.kind, jour(c.createdAt)]);
    }
    finish(ws, data.categoriesDeDepense.length);
  }

  if (data.sourcesDeRevenu.length > 0) {
    const ws = sheet(wb, "Sources de revenu", [
      { header: "Source", width: 24 },
      { header: "Créée le", width: 13, numFmt: JOUR },
    ]);
    for (const s of data.sourcesDeRevenu) ws.addRow([s.name, jour(s.createdAt)]);
    finish(ws, data.sourcesDeRevenu.length);
  }

  if (data.badges.length > 0) {
    const ws = sheet(wb, "Badges", [
      { header: "Badge", width: 30 },
      { header: "Obtenu le", width: 14, numFmt: JOUR },
    ]);
    for (const b of data.badges) ws.addRow([b.badge.name, jour(b.unlockedAt)]);
    finish(ws, data.badges.length);
  }
}

function buildEcrits(wb: Workbook, data: AccountExport): void {
  if (data.articles.length > 0) {
    const ws = sheet(wb, "Articles", [
      { header: "Titre", width: 34 },
      { header: "Résumé", width: 46 },
      { header: "Contenu", width: 60 },
      { header: "Publié le", width: 13, numFmt: JOUR },
    ]);
    for (const a of data.articles) {
      ws.addRow([a.title, a.excerpt, a.content, jour(a.createdAt)]);
    }
    finish(ws, data.articles.length);
  }

  if (data.commentaires.length > 0) {
    const ws = sheet(wb, "Commentaires", [
      { header: "Article", width: 34 },
      { header: "Commentaire", width: 60 },
      { header: "Écrit le", width: 13, numFmt: JOUR },
    ]);
    for (const c of data.commentaires) {
      ws.addRow([c.article.title, c.body, jour(c.createdAt)]);
    }
    finish(ws, data.commentaires.length);
  }
}

function buildProfil(wb: Workbook, data: AccountExport): void {
  const ws = sheet(wb, "Profil", [
    { header: "Information", width: 24 },
    { header: "Valeur", width: 34 },
  ]);
  const p = data.profil;
  const lignes: Array<[string, string | number | Date]> = [
    ["Nom", p.name],
    ["Adresse e-mail", p.email],
    ["Devise", p.currency],
    ["Compte créé le", jour(p.createdAt)],
    ["Dernière connexion", jour(p.lastLoginAt)],
    ["Points", p.totalPoints],
    ["Série en cours", p.currentStreak],
    ["Meilleure série", p.bestStreak],
    ["Export généré le", jour(data.aPropos.genere)],
  ];
  for (const l of lignes) ws.addRow(l);
  finish(ws, lignes.length, false);
}

/* -------------------------------------------------------------------- outils */

/** Crée une feuille, son en-tête figé et ses colonnes. */
function sheet(wb: Workbook, name: string, cols: Col[]): Worksheet {
  // 31 caractères est la limite d'Excel : au-delà, le fichier est refusé.
  const ws = wb.addWorksheet(name.slice(0, 31), {
    // L'en-tête reste visible pendant le défilement. Ce n'est pas décoratif :
    // au-delà de vingt lignes, une colonne sans titre devient indéchiffrable.
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = cols.map((c) => ({ width: c.width }));

  const head = ws.addRow(cols.map((c) => c.header));
  head.height = 22;
  head.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  head.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERT } };
  });

  cols.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (c.numFmt) col.numFmt = c.numFmt;
    if (c.align) {
      col.alignment = { horizontal: c.align, vertical: "middle", indent: 1 };
    }
  });

  // APRÈS l'alignement de colonne, qui s'applique aussi à l'en-tête et
  // l'écraserait. Chaque titre reprend l'alignement de sa colonne — un
  // « Montant » calé à gauche au-dessus de nombres calés à droite se remarque
  // immédiatement, et c'est ce genre de détail qui fait « généré » plutôt que
  // « fait ». Le retrait d'une unité évite au premier titre de coller au bord.
  cols.forEach((c, i) => {
    head.getCell(i + 1).alignment = {
      vertical: "middle",
      horizontal: c.align ?? "left",
      indent: c.align === "center" ? 0 : 1,
    };
  });

  return ws;
}

/** Zébrage et filtre automatique, une fois les lignes posées. */
function finish(ws: Worksheet, count: number, filter = true): void {
  for (let i = 2; i <= count + 1; i++) {
    if (i % 2 !== 0) continue;
    ws.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRE } };
    });
  }
  if (filter && count > 1) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: count + 1, column: ws.columnCount },
    };
  }
}

/**
 * Une ligne de total : libellé dans l'avant-dernière colonne utile, valeur
 * juste après.
 *
 * La formule EST accompagnée de son résultat. ExcelJS n'écrit pas de valeur en
 * cache pour ses formules : Excel recalculerait bien à l'ouverture, mais tout
 * outil qui lit le fichier sans l'évaluer — y compris notre propre import —
 * verrait une cellule vide. Les deux ensemble, et tout le monde s'y retrouve.
 */
function totalRow(
  ws: Worksheet,
  label: string,
  value: number | { formula: string; result: number },
  couleur: string,
  fort = false,
  valueCol = 3,
): Row {
  const cells = new Array<unknown>(ws.columnCount).fill("");
  cells[valueCol - 2] = label;
  cells[valueCol - 1] = value;
  const row = ws.addRow(cells);

  row.getCell(valueCol - 1).font = { bold: true, color: { argb: ARDOISE } };
  row.getCell(valueCol - 1).alignment = { horizontal: "right" };
  row.getCell(valueCol).font = { bold: true, size: fort ? 12 : 11, color: { argb: couleur } };
  row.getCell(valueCol).numFmt = MONNAIE;

  for (const c of [valueCol - 1, valueCol]) {
    row.getCell(c).border = fort
      ? { top: { style: "double", color: { argb: VERT } } }
      : { top: { style: "thin", color: { argb: TRAIT } } };
    if (fort) {
      row.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: VERT_PALE },
      };
    }
  }
  return row;
}

function sum(rows: Array<{ montant: number }>): number {
  return rows.reduce((t, r) => t + r.montant, 0);
}

/**
 * Un total sans formule, volontairement.
 *
 * Il ne porte que sur les règles ACTIVES : l'exprimer en SOMME.SI demanderait de
 * croiser deux colonnes, ce qu'une simple SOMME.SI ne sait pas faire. Mieux vaut
 * un nombre juste qu'une formule approximative — une formule fausse se recopie
 * et se propage, un nombre reste là où on l'a mis.
 */
function sum2(
  rows: Array<{ type: string; amount: number }>,
  type: string,
): number {
  return rows.filter((r) => r.type === type).reduce((t, r) => t + r.amount, 0);
}

/**
 * Une date, ancrée à MIDI UTC.
 *
 * ExcelJS convertit une `Date` en numéro de série Excel en la lisant comme de
 * l'UTC : une date construite à minuit local bascule donc la veille dès qu'on
 * est à l'est de Greenwich. Mesuré — le 1er septembre s'affichait 31/08. À midi,
 * aucun fuseau habité ne peut faire basculer le jour.
 */
function jour(iso: string | null): Date | string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0),
  );
}
