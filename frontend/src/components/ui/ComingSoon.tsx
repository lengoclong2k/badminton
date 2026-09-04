export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="text-sm text-sec">
        {note ?? "Màn hình này đang chờ dựng — khung route + sidebar đã sẵn sàng."}
      </p>
    </div>
  );
}
