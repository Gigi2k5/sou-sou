import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Toutes les pages applicatives sont derrière auth — on ne laisse indexer
  // que les pages publiques (landing + pages d'auth).
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/forgot-password"],
        disallow: [
          "/dashboard",
          "/transactions",
          "/epargne",
          "/cotisations",
          "/badges",
          "/parametres",
          "/blog",
          "/ressources",
          "/reset-password",
        ],
      },
    ],
  };
}
