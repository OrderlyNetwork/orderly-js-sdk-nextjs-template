import type { Metadata } from "next";
import { PageTitleMap, PathEnum } from "@/constant";
import { generatePageTitle } from "@/utils";
import PredictionView from "./view";

type PredictionPageProps = {
  params: Promise<{ symbol?: string[] }>;
};

export const metadata: Metadata = {
  title: generatePageTitle(PageTitleMap[PathEnum.Prediction]),
};

export default async function PredictionPage(props: PredictionPageProps) {
  const { symbol } = await props.params;
  return <PredictionView symbol={symbol?.[0]} />;
}
