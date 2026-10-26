import type { Metadata } from "next";
import { headers } from "next/headers";
import { parseI18nLang } from "@orderly.network/i18n/utils";
import OrderlyProvider from "@/components/orderlyProvider";
import { getDocumentDirection, getDocumentLanguage } from "@/utils/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orderly SDK template",
  description: "Orderly SDK template",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout(props: RootLayoutProps) {
  const requestHeaders = await headers();
  const locale = parseI18nLang(requestHeaders.get("x-orderly-locale") ?? "en");

  return (
    <html lang={getDocumentLanguage(locale)} dir={getDocumentDirection(locale)}>
      <head>
        <link rel="icon" type="image/png" href="/images/favicon.png" />
      </head>
      <body>
        <OrderlyProvider>{props.children}</OrderlyProvider>
      </body>
    </html>
  );
}
