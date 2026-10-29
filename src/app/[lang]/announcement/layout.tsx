"use client";

import { ReactNode } from "react";
import { BaseLayout } from "@/components/baseLayout";
import { PathEnum } from "@/constant";
import { useAnnouncementLayout } from "@/hooks/useAnnouncementLayout";

export default function AnnouncementLayout({
  children,
}: {
  children: ReactNode;
}) {
  const layoutProps = useAnnouncementLayout();
  return (
    <BaseLayout initialMenu={PathEnum.Announcement} {...layoutProps}>
      {children}
    </BaseLayout>
  );
}
