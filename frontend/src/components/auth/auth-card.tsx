import { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-6">
        <BrandMark size="md" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="pt-2 pb-6">{children}</CardContent>
      </Card>
      {footer && (
        <p className="text-center text-sm text-sousou-neutral mt-6">{footer}</p>
      )}
    </div>
  );
}
