import { SkeletonBlock } from "@/components/ui/primitives";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-4">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>
      <SkeletonBlock className="h-80" />
    </div>
  );
}
