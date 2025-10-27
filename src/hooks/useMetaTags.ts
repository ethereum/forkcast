import { useEffect } from "react";

interface MetaTagsProps {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: string;
}

export const useMetaTags = ({
  title,
  description,
  url = window.location.href,
  image = "/ethereum-icon.svg",
  type = "website",
}: MetaTagsProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(
        `meta[property="${property}"]`
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const updateNameTag = (name: string, content: string) => {
      let meta = document.querySelector(
        `meta[name="${name}"]`
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Update description
    updateNameTag("description", description);

    // Open Graph tags
    updateMetaTag("og:title", title);
    updateMetaTag("og:description", description);
    updateMetaTag("og:url", url);
    updateMetaTag("og:type", type);
    updateMetaTag("og:image", image);
    updateMetaTag("og:site_name", "Forkcast");

    // Twitter tags
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:url", url);
    updateMetaTag("twitter:creator", "@wolovim");

    // Cleanup function to restore original meta tags when component unmounts
    return () => {
      // Restore default title
      document.title = "Forkcast - Ethereum Upgrade Tracker";

      // Restore default meta tags
      updateNameTag(
        "description",
        "See what's on the horizon and how it impacts you. Track Ethereum network upgrades and explore how changes affect users, developers, and the ecosystem."
      );
      updateMetaTag("og:title", "Forkcast - Ethereum Upgrade Tracker");
      updateMetaTag(
        "og:description",
        "See what's on the horizon and how it impacts you. Track Ethereum network upgrades and explore how changes affect users, developers, and the ecosystem."
      );
      updateMetaTag("og:url", "https://forkcast.org/");
      updateMetaTag("twitter:title", "Forkcast - Ethereum Upgrade Tracker");
      updateMetaTag(
        "twitter:description",
        "See what's on the horizon and how it impacts you. Track Ethereum network upgrades and explore how changes affect users, developers, and the ecosystem."
      );
      updateMetaTag("twitter:url", "https://forkcast.org/");
    };
  }, [title, description, url, image, type]);
};
