import React from "react";
import { Metadata } from "next";
import { generatePageTitle } from "@/utils";
import FeeTierView from "./view";
import { PageTitleMap, PathEnum } from "@/constant";

export const metadata: Metadata = {
  title: generatePageTitle(PageTitleMap[PathEnum.FeeTier]),
};

export default function FeeTierPage() {
  return <FeeTierView />;
}
