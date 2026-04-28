import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RecordDetail, FieldRow } from "@shared/RecordDetail";
import { callTool } from "../api";

interface Item {
  id: string;
  name: string;
  description: string | null;
  status: string;
  owner: string | null;
}

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const obs = await callTool("search_items", { query: id });
      const found = obs.structured_content?.items?.find((i: Item) => i.id === id);
      setItem(found ?? null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading...</div>;
  }

  if (!item) {
    return <div className="text-sm" style={{ color: "var(--text-secondary)" }}>Item not found.</div>;
  }

  return (
    <RecordDetail title={item.name} subtitle={item.id} backPath="/items">
      <dl>
        <FieldRow label="Name" value={item.name} />
        <FieldRow label="Description" value={item.description} />
        <FieldRow label="Status" value={
          <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
            item.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
          }`}>
            {item.status}
          </span>
        } />
        <FieldRow label="Owner" value={item.owner} />
      </dl>
    </RecordDetail>
  );
}
