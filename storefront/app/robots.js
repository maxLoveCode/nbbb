import { getSiteUrl } from "@/lib/api";

export default function robots() {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/checkout"]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
