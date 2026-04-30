import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RecordDetail, FieldRow } from "@shared/RecordDetail";
import { callTool } from "../api";
import { Badge } from "@/components/ui/badge";

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
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!item) {
    return <div className="text-sm text-muted-foreground">Item not found.</div>;
  }

  return (
    <RecordDetail title={item.name} subtitle={item.id} backPath="/items">
      <dl>
        <FieldRow label="Name" value={item.name} />
        <FieldRow label="Description" value={item.description} />
        <FieldRow label="Status" value={
          <Badge variant={item.status === "active" ? "default" : "secondary"}>
            {item.status}
          </Badge>
        } />
        <FieldRow label="Owner" value={item.owner} />
      </dl>
    </RecordDetail>
  );
}
