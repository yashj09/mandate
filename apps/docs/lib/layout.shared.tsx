import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Wordmark } from "@/components/Wordmark";

export const CONSOLE_URL = "https://creditline-web.vercel.app";
export const GITHUB_URL = "https://github.com/yashj09/mandate";
export const NPM_URL = "https://www.npmjs.com/package/@yashjain99/mandate-sdk";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: <Wordmark />, url: "/docs" },
    githubUrl: GITHUB_URL,
    themeSwitch: { enabled: false },
    links: [
      { text: "Console", url: CONSOLE_URL, external: true },
      { text: "npm", url: NPM_URL, external: true },
    ],
  };
}
