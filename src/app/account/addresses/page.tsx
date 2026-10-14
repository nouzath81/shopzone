import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import AddressBook from "@/components/AddressBook";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return <AddressBook defaultName={user.name} addresses={addresses.map(({ id, name, phone, address, city, isDefault }) => ({ id, name, phone, address, city, isDefault }))} />;
}
