import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-side app (Supabase talks straight to the browser, no
  // server secrets/API routes), so ship it as static HTML/JS/CSS that
  // any static host -- Cloudflare Pages, Vercel, Netlify -- can serve.
  output: "export",
  // Static hosts (Cloudflare Pages included) serve `/route/index.html` for
  // `/route/`, but have nothing to return for the bare `/route` prefetch
  // requests Next's router otherwise makes -- trailing slashes keep every
  // request resolvable to a real file.
  trailingSlash: true,
};

export default nextConfig;
