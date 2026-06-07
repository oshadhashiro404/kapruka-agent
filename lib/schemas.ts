import { z } from "zod";

export const sessionContextSchema = z.object({
  lastSearchQuery: z.string().optional(),
  lastProducts: z.array(z.string()).optional(),
  deliveryCity: z.string().optional(),
  deliveryCityCode: z.string().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  recipientAddress: z.string().optional(),
  pendingDeliveryDate: z.string().optional(),
});

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  price_lkr: z.number(),
  image_url: z.string(),
  images: z.array(z.string()).default([]),
  category: z.string(),
  in_stock: z.boolean(),
  url: z.string(),
  is_perishable: z.boolean(),
  variants: z
    .object({
      sizes: z.array(z.string()).optional(),
      colors: z.array(z.string()).optional(),
      flavors: z.array(z.string()).optional(),
    })
    .optional(),
});

export const cartItemSchema = z.object({
  product: productSchema,
  quantity: z.number().int().positive(),
  selected_variant: z.string().optional(),
  is_gift: z.boolean(),
  gift_message: z.string().optional(),
  gift_message_sinhala: z.string().optional(),
});

export const apiErrorResponseSchema = z.object({
  error: z.string().optional(),
  details: z.unknown().optional(),
  message: z.string().optional(),
});

export type SessionContextInput = z.infer<typeof sessionContextSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
