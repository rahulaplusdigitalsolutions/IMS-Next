/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse (via pdfjs-dist) breaks when webpack bundles it server-side
  // ("Object.defineProperty called on non-object") — load it natively instead.
  serverExternalPackages: ["pdf-parse", "puppeteer"],
};

export default nextConfig;
