import { SkeletonBlock } from "@/components/ui/primitives";

export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 space-y-6">
      <SkeletonBlock className="h-8 w-64" />
      <SkeletonBlock className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-44" />
      </div>
      <SkeletonBlock className="h-72" />
    </div>
  );
}
