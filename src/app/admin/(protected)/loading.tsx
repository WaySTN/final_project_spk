import { SkeletonBlock } from "@/components/ui/primitives";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-3.5 w-36" />
        <SkeletonBlock className="h-8 w-72" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-[#e5e5e0] bg-[#e5e5e0] sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white p-5">
          <SkeletonBlock className="h-16" />
        </div>
        <div className="bg-white p-5">
          <SkeletonBlock className="h-16" />
        </div>
        <div className="bg-white p-5">
          <SkeletonBlock className="h-16" />
        </div>
        <div className="bg-white p-5">
          <SkeletonBlock className="h-16" />
        </div>
      </div>
      <SkeletonBlock className="h-80" />
    </div>
  );
}
