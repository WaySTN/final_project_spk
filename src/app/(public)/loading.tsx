import { SkeletonBlock } from "@/components/ui/primitives";

export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 space-y-8">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <SkeletonBlock className="h-4 w-56" />
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="h-5 w-4/5" />
        </div>
        <SkeletonBlock className="h-64 lg:col-span-5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-48" />
      </div>
    </div>
  );
}
