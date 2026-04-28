import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { DataTable, Column } from "@shared/DataTable";
import { SearchBar } from "@shared/SearchBar";
import { callTool } from "../api";

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
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
          row.status === "active"
            ? "bg-green-100 text-green-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {row.status}
      </span>
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
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Items
        </h1>
        <button
          onClick={() => navigate("/items/new")}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-md font-medium transition-colors"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-text)" }}
          data-testid="create-item-button"
        >
          <Plus size={16} />
          New Item
        </button>
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
