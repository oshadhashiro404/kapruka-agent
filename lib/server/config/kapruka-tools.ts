/**
 * Kapruka MCP tools — names and params match https://mcp.kapruka.com/
 */
export const KAPRUKA_GROQ_TOOLS = [
  {
    type: "function",
    function: {
      name: "kapruka_search_products",
      description:
        "Search Kapruka catalog by keyword with category, price, stock, sort. Max 3 pages.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search keywords" },
          category: { type: "string" },
          min_price: { type: "number" },
          max_price: { type: "number" },
          in_stock_only: { type: "boolean" },
          sort: {
            type: "string",
            description: "popular | price_asc | price_desc | newest",
          },
          limit: { type: "number" },
          cursor: { type: "string" },
          currency: { type: "string", description: "LKR default" },
        },
        required: ["q"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kapruka_get_product",
      description: "Full product details by product_id — images, variants, stock.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          currency: { type: "string" },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kapruka_list_categories",
      description: "List top-level Kapruka categories.",
      parameters: {
        type: "object",
        properties: {
          depth: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kapruka_list_delivery_cities",
      description:
        "Search delivery cities by name or alias. Returns up to 50 matches.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kapruka_check_delivery",
      description:
        "Check delivery to a city on a date for a product_id. Required before create_order.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
          delivery_date: { type: "string", description: "YYYY-MM-DD" },
          product_id: { type: "string" },
        },
        required: ["city", "delivery_date", "product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kapruka_create_order",
      description:
        "Guest checkout — returns pay URL (60 min). Max 30 orders/hour per IP.",
      parameters: {
        type: "object",
        properties: {
          cart: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string" },
                quantity: { type: "number" },
                variant: { type: "string" },
              },
              required: ["product_id", "quantity"],
            },
          },
          recipient: {
            type: "object",
            properties: {
              name: { type: "string" },
              phone: { type: "string" },
            },
            required: ["name", "phone"],
          },
          delivery: {
            type: "object",
            properties: {
              address: { type: "string" },
              city: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" },
            },
            required: ["address", "city", "date"],
          },
          sender: {
            type: "object",
            properties: { name: { type: "string" } },
          },
          gift_message: { type: "string" },
          currency: { type: "string" },
        },
        required: ["cart", "recipient", "delivery"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kapruka_track_order",
      description: "Track order by order number.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string" },
        },
        required: ["order_number"],
      },
    },
  },
] as const;
