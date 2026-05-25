"use client";

import { StepShell } from "./step-shell";

export function StepWelcome({
  userName,
  onNext,
}: {
  userName: string;
  onNext: () => void;
}) {
  return (
    <StepShell
      mood="happy"
      title={<>Bienvenue {userName} 👋</>}
      subtitle={
        <>
          Bravo, ton compte est créé !{" "}
          <span className="font-semibold text-sousou-secondary">Sou&apos;Sou</span>{" "}
          va t&apos;aider à <span className="font-semibold text-sousou-primary-700">épargner sereinement</span>{" "}
          au quotidien — un peu chaque jour, beaucoup à la fin.
          <br />
          <br />
          Laisse-moi te faire le tour rapide. ✨
        </>
      }
      primaryLabel="Faire le tour"
      onPrimary={onNext}
    />
  );
}
