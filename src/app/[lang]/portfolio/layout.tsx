"use client";

import React, { ReactNode, useMemo } from "react";
import {
  PortfolioLayoutWidget,
  PortfolioLeftSidebarPath,
} from "@orderly.network/portfolio";
import { PathEnum } from "@/constant";
import { useNav } from "@/hooks/useNav";
import { usePathWithoutLang } from "@/hooks/usePathWithoutLang";
import { useScaffoldConfig } from "@/hooks/useScaffoldConfig";

export default function PortfolioLayout(props: { children: ReactNode }) {
  const config = useScaffoldConfig();
  const path = usePathWithoutLang();

  const { onRouteChange } = useNav();

  const currentPath = useMemo(() => {
    if (path.endsWith(PathEnum.FeeTier))
      return PortfolioLeftSidebarPath.FeeTier;

    if (path.endsWith(PathEnum.ApiKey)) return PortfolioLeftSidebarPath.ApiKey;

    return path;
  }, [path]);

  return (
    <PortfolioLayoutWidget
      footerProps={config.footerProps}
      bottomNavProps={config.bottomNavProps}
      mainNavProps={{
        ...config.mainNavProps,
        initialMenu: PathEnum.Portfolio,
      }}
      routerAdapter={{
        onRouteChange,
      }}
      leftSideProps={{
        current: currentPath,
      }}
    >
      {props.children}
    </PortfolioLayoutWidget>
  );
}
