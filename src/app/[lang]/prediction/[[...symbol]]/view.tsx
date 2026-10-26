"use client";

import { useEffect } from "react";
import { PredictionPage } from "@orderly.network/prediction";
import { useFeatureEnabled } from "@orderly.network/react-app";
import { perpRoute } from "@orderly.network/types";
import { BaseLayout } from "@/components/baseLayout";
import { useNav } from "@/hooks/useNav";
import { getPerpSymbol } from "@/perpSymbolStorage";

export type PredictionViewProps = {
  symbol?: string;
};

export default function PredictionView(props: PredictionViewProps) {
  const enabled = useFeatureEnabled("prediction");
  const { onRouteChange } = useNav();

  useEffect(() => {
    if (!enabled) onRouteChange(perpRoute(getPerpSymbol(), { replace: true }));
  }, [enabled, onRouteChange]);

  return enabled ? (
    <BaseLayout>
      <PredictionPage symbol={props.symbol} />
    </BaseLayout>
  ) : null;
}
