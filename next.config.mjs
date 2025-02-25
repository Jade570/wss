// /** @type {import('next').NextConfig} */
// const nextConfig = {reactStrictMode: false,};

// export default nextConfig;

// next.config.js


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader'],
    });
    return config;
  },
};

export default nextConfig;
