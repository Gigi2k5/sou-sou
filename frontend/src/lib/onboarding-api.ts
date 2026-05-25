import { api } from "./api";

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  onboardingCompletedAt: string | null;
}

export interface OnboardingUpdateResult extends OnboardingState {
  pointsEarned: number;
  newBadges: { id: string; code: string; name: string; icon: string }[];
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const { data } = await api.get<OnboardingState>("/users/me/onboarding");
  return data;
}

export async function updateOnboarding(input: {
  step?: number;
  completed?: boolean;
}): Promise<OnboardingUpdateResult> {
  const { data } = await api.patch<OnboardingUpdateResult>(
    "/users/me/onboarding",
    input,
  );
  return data;
}
