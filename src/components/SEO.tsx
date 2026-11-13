
import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  path: string;
}

const SITE_URL = "https://ieprn.co.in";

export default function SEO({ title, description, path }: SEOProps) {
  useEffect(() => {
    const fullTitle = `${title} | IEprn – College of Engineering Perumon`;
    const canonicalUrl = `${SITE_URL}${path}`;

    document.title = fullTitle;

    const setMeta = (name: string, content: string, attribute = "name") => {
      let element = document.querySelector(
        `meta[${attribute}="${name}"]`
      ) as HTMLMetaElement | null;

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.content = content;
    };

    setMeta("description", description);
    setMeta("robots", "index, follow");
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", canonicalUrl, "property");
    setMeta("og:type", "website", "property");

    let canonical = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.href = canonicalUrl;
  }, [title, description, path]);

  return null;
}
