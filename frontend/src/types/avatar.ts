export interface AvatarStatus {
  key: string;
  label: string;
  description: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: { current: number; target: number } | null;
}
