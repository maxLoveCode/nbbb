import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**"
      },
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

export default nextConfig;
