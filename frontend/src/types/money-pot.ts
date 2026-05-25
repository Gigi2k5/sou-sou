export interface MoneyPotMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string;
  totalContributed: number;
  isMe: boolean;
}

export interface MoneyPotSummary {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  isGroup: boolean;
  /** null si pas le owner, sinon le code (groupe seulement). */
  inviteCode: string | null;
  ownerId: string;
  membersCount: number;
  myTotalContributed: number;
  createdAt: string;
}

export interface MoneyPotDetail extends MoneyPotSummary {
  owner: { id: string; name: string; avatarUrl: string | null };
  members: MoneyPotMember[];
  /** Catégorie système POT propre à cet user — utilisée par le modal "Cotiser"
   *  pour pré-remplir la création de Transaction expense. */
  myCategoryId: string;
}

/** Une contribution = une Transaction expense liée à une catégorie POT du pot.
 *  Sert de "historique des paiements" côté UI (vue partagée entre membres). */
export interface MoneyPotContribution {
  id: string;
  amount: number;
  note: string | null;
  date: string;
  user: { id: string; name: string; avatarUrl: string | null };
}
