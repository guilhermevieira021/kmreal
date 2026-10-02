import type { Metadata } from "next";
import { UpgradeView } from "@/features/subscription/upgrade-view";

export const metadata: Metadata = { title: "KmReal PRO" };

export default function UpgradePage() {
  return <UpgradeView />;
}
