import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite and unpdf ship WASM/worker assets that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "unpdf", "pg"],
};

export default nextConfig;
