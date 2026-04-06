/** @type {import('next').NextConfig} */
const nextConfig = {
  // @xenova/transformers uses onnxruntime-node which ships native binaries.
  // Mark it as external so Next doesn't try to bundle it.
  experimental: {
    serverComponentsExternalPackages: ["@xenova/transformers"],
  },
};

export default nextConfig;
