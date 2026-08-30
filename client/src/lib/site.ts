const rawSiteUrl = import.meta.env.VITE_SITE_URL ?? "https://okonnaya.com";

export const PORTFOLIO_VARIANT = import.meta.env.VITE_PORTFOLIO_VARIANT ?? "main";
export const SITE_URL = rawSiteUrl.replace(/\/$/, "");
export const SITE_ORIGIN = SITE_URL;
