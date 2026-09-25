/**
 * Forme exacte de ce que renvoie `GET /account/export`.
 *
 * Décrite ici plutôt que devinée au fil du code : c'est ce contrat qui permet
 * au générateur de classeur de savoir quelles colonnes existent, et au
 * compilateur de prévenir si le serveur change de forme.
 */
export interface AccountExport {
  aPropos: { genere: string; application: string; contenu: string };
  profil: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    currency: string;
    role: string;
    totalPoints: number;
    currentStreak: number;
    bestStreak: number;
    createdAt: string;
    lastLoginAt: string | null;
    emailVerified: boolean;
  };
  transactions: Array<{
    date: string;
    sens: "entrée" | "sortie";
    montant: number;
    categorie: string | null;
    note: string | null;
    saisieLe: string;
  }>;
  categoriesDeDepense: Array<{
    name: string;
    kind: string;
    createdAt: string;
  }>;
  sourcesDeRevenu: Array<{ name: string; createdAt: string }>;
  budgets: Array<{
    monthlyLimit: number;
    alertThreshold: number;
    category: { name: string };
  }>;
  objectifEpargne: {
    name: string;
    targetAmount: number;
    dailyAmount: number;
    deadline: string;
    isCompleted: boolean;
    createdAt: string;
    completedAt: string | null;
  } | null;
  cotisationsCreees: Array<{
    name: string;
    description: string | null;
    targetAmount: number;
    deadline: string | null;
    isGroup: boolean;
    isCompleted: boolean;
    createdAt: string;
    _count: { members: number };
  }>;
  cotisationsRejointes: Array<{
    joinedAt: string;
    moneyPot: { name: string; isGroup: boolean };
  }>;
  transactionsRecurrentes: Array<{
    type: "INCOME" | "EXPENSE";
    amount: number;
    dayOfMonth: number;
    note: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  imports: Array<{
    source: string;
    periodLabel: string | null;
    lineCount: number;
    importedIncomeTotal: number;
    importedExpenseTotal: number;
    createdAt: string;
  }>;
  badges: Array<{ unlockedAt: string; badge: { name: string } }>;
  articles: Array<{
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    isHidden: boolean;
    createdAt: string;
  }>;
  commentaires: Array<{
    body: string;
    createdAt: string;
    article: { title: string };
  }>;
}
