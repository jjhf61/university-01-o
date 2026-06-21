/** @type {import('next').NextConfig} */
const repo = "university-01-o"
const isGithubPages = process.env.GITHUB_PAGES === "true"
const basePath = isGithubPages ? `/${repo}` : ""

const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
