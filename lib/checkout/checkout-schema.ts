import { z } from "zod";
import { cartItemSchema } from "@/lib/schemas";

const SRI_LANKA_PHONE = /^(\+94|0)?[0-9]{9,10}$/;

export const recipientFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Recipient name is required (at least 2 characters)"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(
      (val) => SRI_LANKA_PHONE.test(val.replace(/[\s-]/g, "")),
      "Enter a valid Sri Lankan phone number"
    ),
  address: z
    .string()
    .trim()
    .min(5, "Delivery address is required (at least 5 characters)"),
});

export const deliveryFormSchema = z.object({
  city: z.string().trim().min(1, "City is required"),
  cityCode: z.string().optional(),
  date: z
    .string()
    .min(1, "Delivery date is required")
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), "Invalid date format")
    .refine((val) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(val + "T00:00:00");
      return selected >= today;
    }, "Delivery date cannot be in the past"),
});

export const createOrderPayloadSchema = z.object({
  cart: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().min(1),
        variant: z.string().optional(),
      })
    )
    .min(1, "Cart must have at least one item"),
  recipient: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
  }),
  delivery: z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  sender: z.object({ name: z.string() }).optional(),
  gift_message: z.string().optional(),
  currency: z.string().optional(),
});

export type RecipientForm = z.infer<typeof recipientFormSchema>;
export type DeliveryForm = z.infer<typeof deliveryFormSchema>;
export type CreateOrderPayload = z.infer<typeof createOrderPayloadSchema>;

export type CheckoutStep = "cart" | "recipient" | "delivery" | "confirm";

const STEP_ORDER: CheckoutStep[] = [
  "cart",
  "recipient",
  "delivery",
  "confirm",
];

export function validateRecipientForm(data: {
  name: string;
  phone: string;
  address: string;
}): { success: true } | { success: false; errors: Record<string, string> } {
  const result = recipientFormSchema.safeParse(data);
  if (result.success) return { success: true };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}

export function validateDeliveryForm(data: {
  city: string;
  date: string;
}): { success: true } | { success: false; errors: Record<string, string> } {
  const result = deliveryFormSchema.safeParse(data);
  if (result.success) return { success: true };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}

export function validateCartItems(
  items: unknown[]
): { success: true } | { success: false; errors: Record<string, string> } {
  if (!items.length) {
    return { success: false, errors: { cart: "Add at least one item to continue" } };
  }
  const result = z.array(cartItemSchema).safeParse(items);
  if (result.success) return { success: true };
  return { success: false, errors: { cart: "Cart contains invalid items" } };
}

export function canAdvanceFromStep(
  step: CheckoutStep,
  ctx: {
    itemCount: number;
    recipient: { name: string; phone: string; address: string };
    delivery: { city: string; date: string };
    hasQuote: boolean;
  }
): { ok: true } | { ok: false; error: string; field?: string } {
  switch (step) {
    case "cart":
      if (ctx.itemCount === 0) {
        return { ok: false, error: "Add at least one item to continue", field: "cart" };
      }
      return { ok: true };
    case "recipient": {
      const v = validateRecipientForm(ctx.recipient);
      if (!v.success) {
        const first = Object.entries(v.errors)[0];
        return { ok: false, error: first?.[1] ?? "Please fill recipient details", field: first?.[0] };
      }
      return { ok: true };
    }
    case "delivery": {
      const dv = validateDeliveryForm(ctx.delivery);
      if (!dv.success) {
        const first = Object.entries(dv.errors)[0];
        return { ok: false, error: first?.[1] ?? "Please complete delivery details", field: first?.[0] };
      }
      if (!ctx.hasQuote) {
        return { ok: false, error: "Please check delivery first", field: "quote" };
      }
      return { ok: true };
    }
    case "confirm":
      return { ok: true };
    default:
      return { ok: false, error: "Unknown step" };
  }
}

export function nextStep(step: CheckoutStep): CheckoutStep | null {
  const idx = STEP_ORDER.indexOf(step);
  return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

export function prevStep(step: CheckoutStep): CheckoutStep | null {
  const idx = STEP_ORDER.indexOf(step);
  return idx > 0 ? STEP_ORDER[idx - 1] : null;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
