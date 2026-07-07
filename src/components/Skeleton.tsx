export function SkeletonTrack() {
    return (
        <div className="flex items-center gap-4 p-3 rounded-2xl animate-pulse">
            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-white/10" />
            <div className="w-12 h-12 rounded-[1rem] bg-slate-200 dark:bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-full w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full w-1/2" />
            </div>
            <div className="w-16 h-6 bg-slate-200 dark:bg-white/10 rounded-full" />
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.05] overflow-hidden animate-pulse">
            <div className="aspect-square bg-slate-200 dark:bg-white/10" />
            <div className="bg-white dark:bg-[#1A1A1A] p-3 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-full w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full w-1/2" />
            </div>
        </div>
    );
}

export function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 p-3 rounded-2xl animate-pulse">
            <div className="w-12 h-12 rounded-[1rem] bg-slate-200 dark:bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-full w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full w-1/2" />
            </div>
        </div>
    );
}

export function SkeletonGrid({ count = 5 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="flex flex-col gap-1.5">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonTrack key={i} />
            ))}
        </div>
    );
}
