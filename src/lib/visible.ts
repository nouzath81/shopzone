import type { Prisma } from "@prisma/client";

/** A product shows in the shop only if it is switched on AND its seller has been approved by an admin. */
export const visible: Prisma.ProductWhereInput = { active: true, seller: { approved: true } };
