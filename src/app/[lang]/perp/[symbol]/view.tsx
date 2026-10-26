"use client";

import { useEffect } from "react";
import { TradingPage, TradingPageProps } from "@orderly.network/trading";
import { useOrderlyConfig } from "@/hooks/useOrderlyConfig";
import { setPerpSymbol } from "@/perpSymbolStorage";

export type PerpViewProps = Pick<TradingPageProps, "symbol">;

export default function PerpView(props: PerpViewProps) {
  const { symbol } = props;
  const config = useOrderlyConfig();

  useEffect(() => {
    if (symbol) setPerpSymbol(symbol);
  }, [symbol]);

  if (!symbol) return null;

  return (
    <TradingPage
      symbol={symbol}
      tradingViewConfig={config.tradingPage.tradingViewConfig}
      sharePnLConfig={config.tradingPage.sharePnLConfig}
    />
  );
}
