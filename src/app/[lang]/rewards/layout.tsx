"use client";

import { ReactNode } from "react";
import { TradingRewardsLayoutWidget } from "@orderly.network/trading-rewards";
import { PathEnum } from "@/constant";
import { useNav } from "@/hooks/useNav";
import { usePathWithoutLang } from "@/hooks/usePathWithoutLang";
import { useScaffoldConfig } from "@/hooks/useScaffoldConfig";

export default function TradingRewardsLayout(props: { children: ReactNode }) {
  const config = useScaffoldConfig();
  const path = usePathWithoutLang();

  const { onRouteChange } = useNav();

  return (
    <TradingRewardsLayoutWidget
      footerProps={config.footerProps}
      bottomNavProps={config.bottomNavProps}
      mainNavProps={{
        ...config.mainNavProps,
        initialMenu: PathEnum.Rewards,
      }}
      routerAdapter={{
        onRouteChange,
      }}
      leftSideProps={{
        current: path,
      }}
    >
      {props.children}
    </TradingRewardsLayoutWidget>
  );
}
