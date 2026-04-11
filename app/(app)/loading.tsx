export default function Loading() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-28 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
      </div>
      <div className="h-24 rounded-xl bg-muted" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
      </div>
    </div>
  );
}
