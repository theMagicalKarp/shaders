/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.vert/,
      type: "asset/source",
    });
    config.module.rules.push({
      test: /\.frag/,
      type: "asset/source",
    });
    return config
  },
};

export default nextConfig;
