"use client";

import { ReactNode, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AsyncResources,
  getLocalePathFromPathname,
  i18n,
  importLocaleJsonModule,
  LocaleCode,
  LocaleEnum,
  LocaleProvider,
  parseI18nLang,
  registerDefaultResource,
  type LocaleJsonModule,
} from "@orderly.network/i18n";
import { usePathWithoutLang } from "@/hooks/usePathWithoutLang";
import extendEnLocale from "@/locales/en.json";
import { getDocumentDirection, getDocumentLanguage } from "@/utils/locale";

// Register fallback messages before the first render, including SSR.
registerDefaultResource(extendEnLocale);

type LocaleJsonLoader = () => Promise<LocaleJsonModule>;

/**
 * One explicit import per locale so webpack can resolve @orderly.network/i18n/locales/*.json
 * through package exports. Include every `LocaleEnum` value your app can switch to.
 */
const baseLocaleLoaders: Record<LocaleEnum, LocaleJsonLoader> = {
  [LocaleEnum.ar]: () => import("@orderly.network/i18n/locales/ar.json"),
  [LocaleEnum.fa]: () => import("@orderly.network/i18n/locales/fa.json"),
  [LocaleEnum.he]: () => import("@orderly.network/i18n/locales/he.json"),
  [LocaleEnum.de]: () => import("@orderly.network/i18n/locales/de.json"),
  [LocaleEnum.en]: () => import("@orderly.network/i18n/locales/en.json"),
  [LocaleEnum.es]: () => import("@orderly.network/i18n/locales/es.json"),
  [LocaleEnum.fr]: () => import("@orderly.network/i18n/locales/fr.json"),
  [LocaleEnum.id]: () => import("@orderly.network/i18n/locales/id.json"),
  [LocaleEnum.it]: () => import("@orderly.network/i18n/locales/it.json"),
  [LocaleEnum.ja]: () => import("@orderly.network/i18n/locales/ja.json"),
  [LocaleEnum.ko]: () => import("@orderly.network/i18n/locales/ko.json"),
  [LocaleEnum.nl]: () => import("@orderly.network/i18n/locales/nl.json"),
  [LocaleEnum.pl]: () => import("@orderly.network/i18n/locales/pl.json"),
  [LocaleEnum.pt]: () => import("@orderly.network/i18n/locales/pt.json"),
  [LocaleEnum.ru]: () => import("@orderly.network/i18n/locales/ru.json"),
  [LocaleEnum.tc]: () => import("@orderly.network/i18n/locales/tc.json"),
  [LocaleEnum.tr]: () => import("@orderly.network/i18n/locales/tr.json"),
  [LocaleEnum.uk]: () => import("@orderly.network/i18n/locales/uk.json"),
  [LocaleEnum.vi]: () => import("@orderly.network/i18n/locales/vi.json"),
  [LocaleEnum.zh]: () => import("@orderly.network/i18n/locales/zh.json"),
};

async function loadBase(lang: LocaleCode): Promise<Record<string, string>> {
  const loader = baseLocaleLoaders[lang as LocaleEnum];
  return importLocaleJsonModule(loader);
}

async function loadExtend(lang: LocaleCode): Promise<Record<string, string>> {
  return importLocaleJsonModule(() => import(`@/locales/${lang}.json`));
}

const resources: AsyncResources = async (lang) => {
  if (lang === LocaleEnum.en) {
    return extendEnLocale;
  }

  const [base, extend] = await Promise.all([loadBase(lang), loadExtend(lang)]);
  return { ...base, ...extend };
};

export const OrderlyLocaleProvider = (props: { children: ReactNode }) => {
  const path = usePathWithoutLang();
  const pathname = usePathname();
  const router = useRouter();

  const onLanguageChanged = useCallback(
    async (lang: LocaleCode) => {
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      router.replace(`/${lang}${path}${search}${hash}`, { scroll: false });
    },
    [path, router],
  );

  useEffect(() => {
    const lang =
      getLocalePathFromPathname(pathname) ?? parseI18nLang(i18n.language);
    document.documentElement.lang = getDocumentLanguage(lang);
    document.documentElement.dir = getDocumentDirection(lang);
    if (lang && lang !== i18n.language) {
      i18n.changeLanguage(lang);
    }
  }, [pathname]);

  return (
    <LocaleProvider resources={resources} onLanguageChanged={onLanguageChanged}>
      {props.children}
    </LocaleProvider>
  );
};
