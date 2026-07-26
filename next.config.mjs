/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  turbopack: {
    rules: {
      // Turbopack's built-in `type: "raw"` does not expose a default export,
      // so shader imports resolve to undefined. raw-loader reproduces the
      // `asset/source` behaviour the old webpack config provided.
      "*.vert": { loaders: ["raw-loader"], as: "*.js" },
      "*.frag": { loaders: ["raw-loader"], as: "*.js" },
    },
  },
};

export default nextConfig;
