import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { DataTable, Column } from "@shared/DataTable";
import { SearchBar } from "@shared/SearchBar";
import { callTool } from "../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Item {
  id: string;
  name: string;
  description: string | null;
  status: string;
  owner: string | null;
}

const columns: Column<Item>[] = [
  { key: "name", header: "Name", render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "description", header: "Description" },
  {
    key: "status",
    header: "Status",
    width: "120px",
    render: (row) => (
      <Badge variant={row.status === "active" ? "default" : "secondary"}>
        {row.status}
      </Badge>
    ),
  },
  { key: "owner", header: "Owner", width: "150px" },
];

export function ItemList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchItems = async (query?: string) => {
    setLoading(true);
    const obs = await callTool("search_items", { query: query || undefined });
    setItems(obs.structured_content?.items ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div data-testid="item-list-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          Items
        </h1>
        <Button
          type="button"
          onClick={() => navigate("/items/new")}
          data-testid="create-item-button"
        >
          <Plus size={16} />
          New Item
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search items..." />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onRowClick={(item) => navigate(`/items/${item.id}`)}
        emptyMessage="No items found. Create one to get started."
      />
    </div>
  );
}
