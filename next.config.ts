import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { PROJECT_NOT_FOUND_HEADER } from "./lib/projects/urls";

const withNextIntl = createNextIntlPlugin();
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [{
        source: "/projects/:slug",
        has: [{ type: "header", key: PROJECT_NOT_FOUND_HEADER, value: "1" }],
        destination: "/-project-not-found",
      }],
    };
  },
};
export default withNextIntl(nextConfig);
