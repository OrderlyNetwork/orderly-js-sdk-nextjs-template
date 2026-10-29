"use client";

import { AnnouncementCenterPage } from "@orderly.network/ui-notification";

export default function AnnouncementView({ slug }: { slug?: string }) {
  return <AnnouncementCenterPage slug={slug} />;
}
