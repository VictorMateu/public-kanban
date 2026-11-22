import type { Metadata } from "next";
import { headers } from "next/headers";
import { Dancing_Script, Handlee } from "next/font/google";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "../components/layout/app-shell";
import { PROJECT_NOT_FOUND_HEADER } from "../lib/projects/urls";
import "./globals.css";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-dancing-script",
});

const handlee = Handlee({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-handlee",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  const common = await getTranslations("Common");
  const icons = { icon: { url: "/brand/logo.svg", type: "image/svg+xml", sizes: "any" } };
  if ((await headers()).get(PROJECT_NOT_FOUND_HEADER) === "1") {
    const project = await getTranslations("Project");
    return { title: `${project("notFoundTitle")} | ${common("appName")}`, robots: { index: false, follow: false }, icons };
  }
  return { title: common("appName"), description: t("description"), icons };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${dancingScript.variable} ${handlee.variable}`}>
      <body>
        <NextIntlClientProvider>
          <AppShell>{children}</AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
