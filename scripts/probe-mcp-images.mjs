import axios from "axios";

function parseSse(raw) {
  if (raw == null) return null;
  if (typeof raw === "object" && "jsonrpc" in raw) return raw;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  for (const line of trimmed.split(/\r?\n/)) {
    if (line.startsWith("data:")) {
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        return JSON.parse(payload);
      } catch {
        continue;
      }
    }
  }
  return null;
}

function parseToolResult(result) {
  if (result == null) return result;
  const r = result;
  if (r.structuredContent !== undefined) {
    const sc = r.structuredContent;
    if (typeof sc?.result === "string") return sc.result;
    return sc;
  }
  if (Array.isArray(r.content)) {
    const texts = r.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text);
    const combined = texts.join("\n");
    try {
      return JSON.parse(combined);
    } catch {
      return combined;
    }
  }
  return result;
}

async function mcpCall(sid, method, params, id = 1) {
  const body = { jsonrpc: "2.0", method, params };
  if (method !== "notifications/initialized") body.id = id;
  const res = await axios.post("https://mcp.kapruka.com/mcp", body, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": sid,
    },
    validateStatus: () => true,
  });
  const envelope = parseSse(res.data);
  return envelope?.result;
}

(async () => {
  const initRes = await axios.post(
    "https://mcp.kapruka.com/mcp",
    {
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "kapruwa-probe", version: "1.0" },
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
    }
  );
  const sid = initRes.headers["mcp-session-id"];
  if (!sid) {
    console.error("No session id");
    process.exit(1);
  }

  await mcpCall(sid, "notifications/initialized", {});

  const searchRaw = await mcpCall(sid, "tools/call", {
    name: "kapruka_search_products",
    arguments: { params: { q: "red roses bouquet", limit: 2 } },
  });
  const searchParsed = parseToolResult(searchRaw);
  console.log("=== SEARCH (first 2500 chars) ===");
  const searchStr =
    typeof searchParsed === "string"
      ? searchParsed
      : JSON.stringify(searchParsed, null, 2);
  console.log(searchStr.slice(0, 2500));

  // Extract first product id from markdown or JSON
  let productId = null;
  if (typeof searchParsed === "string") {
    const idMatch = searchParsed.match(/ID:\s*`([^`]+)`/);
    productId = idMatch?.[1];
  } else if (searchParsed?.products?.[0]) {
    productId =
      searchParsed.products[0].id ??
      searchParsed.products[0].product_id;
  }

  if (!productId) {
    console.log("\nNo product id found for get_product probe");
    process.exit(0);
  }

  console.log("\n=== GET_PRODUCT id:", productId, "===");
  const getRaw = await mcpCall(sid, "tools/call", {
    name: "kapruka_get_product",
    arguments: { params: { product_id: productId } },
  }, 2);
  const getParsed = parseToolResult(getRaw);
  const getText =
    typeof getParsed === "string"
      ? getParsed
      : JSON.stringify(getParsed, null, 2);
  console.log(getText.slice(0, 4000));

  const imageMatch = getText.match(/\*\*Image\*\*:\s*(https?:\/\/\S+)/i);
  const imgUrl = imageMatch?.[1]?.trim();
  if (imgUrl) {
    const head = await axios.head(imgUrl, {
      validateStatus: () => true,
      timeout: 10000,
    });
    console.log("\nImage HEAD status:", head.status, "content-type:", head.headers["content-type"]);
  }
})();
