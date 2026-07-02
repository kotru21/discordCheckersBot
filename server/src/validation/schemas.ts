import { z } from "zod";

const boardCoord = z.number().int().min(0).max(9);

export const moveSchema = z.object({
  fromRow: boardCoord,
  fromCol: boardCoord,
  toRow: boardCoord,
  toCol: boardCoord,
});

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("auth"),
    accessToken: z.string().min(1).max(4096),
  }),
  z.object({
    type: z.literal("move"),
    move: moveSchema,
  }),
  z.object({
    type: z.literal("rematch"),
  }),
]);

export const tokenBodySchema = z.object({
  code: z.string().min(1).max(2048),
});

export type ParsedClientMessage = z.infer<typeof clientMessageSchema>;
