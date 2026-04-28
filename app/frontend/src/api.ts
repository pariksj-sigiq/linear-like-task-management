const BASE = "";

export interface ToolObservation<T = any> {
  is_error?: boolean;
  text?: string;
  content?: Array<{ type: string; text: string }>;
  structured_content?: T;
}

export interface ToolRead<T = any> {
  data: T | null;
  error: string | null;
  observation: ToolObservation<T> | null;
}

export async function callTool<T = any>(
  toolName: string,
  parameters: Record<string, unknown> = {},
): Promise<ToolObservation<T>> {
  const res = await fetch(`${BASE}/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: { tool_name: toolName, parameters } }),
  });
  if (!res.ok) throw new Error(`Tool server error: ${res.status}`);
  const json = await res.json();
  return json.observation;
}

export async function readTool<T = any>(
  toolName: string,
  parameters: Record<string, unknown> = {},
): Promise<ToolRead<T>> {
  try {
    const observation = await callTool<T>(toolName, compactParams(parameters));
    if (observation.is_error) {
      return {
        data: null,
        error: observation.text || `Tool ${toolName} returned an error.`,
        observation,
      };
    }
    return {
      data: (observation.structured_content ?? null) as T | null,
      error: null,
      observation,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : `Unable to call ${toolName}.`,
      observation: null,
    };
  }
}

export async function readSnapshot(): Promise<ToolRead<Record<string, unknown>>> {
  const toolResult = await readTool<Record<string, unknown>>("snapshot");
  if (toolResult.data || !toolResult.error?.includes("Unknown tool")) {
    return toolResult;
  }

  try {
    const res = await fetch(`${BASE}/snapshot`);
    if (!res.ok) throw new Error(`Snapshot server error: ${res.status}`);
    return { data: await res.json(), error: null, observation: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unable to load snapshot.",
      observation: null,
    };
  }
}

export function compactParams(parameters: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}

export function collectionFrom<T = Record<string, unknown>>(
  data: unknown,
  keys: string[],
): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
  }

  const nested = record.data;
  if (nested && typeof nested === "object") {
    for (const key of keys) {
      const value = (nested as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }

  return [];
}
