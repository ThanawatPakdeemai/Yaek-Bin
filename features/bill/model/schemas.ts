import { z } from "zod";

const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const billSchema = z.object({
  id,
  title: z.string().trim().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500),
  ownerId: id,
  promptpay: z.string().max(30),
  discount: z.string().max(12),
  serviceRate: z.string().max(6),
  vatRate: z.string().max(6),
  friends: z
    .array(
      z.object({
        id,
        name: z.string().trim().min(1).max(60),
        email: z.string().trim().max(254),
      }),
    )
    .min(1)
    .max(30),
  items: z
    .array(
      z.object({
        id,
        name: z.string().trim().min(1).max(100),
        price: z.string().max(12),
        quantity: z.number().int().min(1).max(99),
        people: z.array(id).min(1).max(30),
      }),
    )
    .min(1)
    .max(100),
});

export const draftSchema = billSchema.extend({
  title: z.string().max(100),
  ownerId: z.string().max(80),
  friends: z
    .array(
      z.object({ id, name: z.string().max(60), email: z.string().max(254) }),
    )
    .max(30),
  items: z
    .array(
      z.object({
        id,
        name: z.string().max(100),
        price: z.string().max(12),
        quantity: z.number(),
        people: z.array(id).max(30),
      }),
    )
    .max(100),
});
