import type { Metadata } from "next";
import { PageTitleMap, PathEnum } from "@/constant";
import { generatePageTitle } from "@/utils";
import AnnouncementView from "../view";

export const metadata: Metadata = {
  title: generatePageTitle(PageTitleMap[PathEnum.Announcement]),
};

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AnnouncementView slug={slug} />;
}
