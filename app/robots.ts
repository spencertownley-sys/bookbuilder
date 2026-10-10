import type { MetadataRoute } from "next";

// Family links (/read, /record) and app pages stay out of search engines; the pages also send noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/read/", "/record/", "/api/", "/dashboard", "/editor/", "/new", "/orders", "/account", "/admin", "/welcome"] },
  };
}
