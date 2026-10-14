import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const categories = [
  { name: "Electronics", slug: "electronics", icon: "📱" },
  { name: "Fashion", slug: "fashion", icon: "👕" },
  { name: "Home & Living", slug: "home-living", icon: "🛋️" },
  { name: "Beauty", slug: "beauty", icon: "💄" },
  { name: "Groceries", slug: "groceries", icon: "🛒" },
  { name: "Sports", slug: "sports", icon: "⚽" },
  { name: "Toys & Kids", slug: "toys-kids", icon: "🧸" },
  { name: "Automotive", slug: "automotive", icon: "🚗" },
];

const names: Record<string, string[]> = {
  electronics: ["Wireless Earbuds", "Smart Watch", "Power Bank 20000mAh", "Bluetooth Speaker", "USB-C Fast Charger", "Phone Case", "Gaming Mouse", "LED Desk Lamp"],
  fashion: ["Cotton T-Shirt", "Slim Fit Jeans", "Running Shoes", "Leather Wallet", "Sports Cap", "Casual Backpack", "Sunglasses", "Hoodie"],
  "home-living": ["Non-stick Pan Set", "Bedsheet Set", "Storage Box", "Electric Kettle", "Wall Clock", "Cushion Cover", "Air Fryer", "Water Bottle"],
  beauty: ["Face Wash", "Sunscreen SPF50", "Lipstick", "Hair Oil", "Moisturizer", "Perfume 100ml", "Makeup Brush Set", "Body Lotion"],
  groceries: ["Basmati Rice 5kg", "Tea Leaves 500g", "Coconut Oil 1L", "Instant Noodles Pack", "Biscuits Family Pack", "Spice Mix Set", "Dates 1kg", "Cashew Nuts 500g"],
  sports: ["Yoga Mat", "Dumbbell Set", "Football", "Badminton Racket", "Skipping Rope", "Gym Gloves", "Cricket Bat", "Resistance Bands"],
  "toys-kids": ["Building Blocks", "Remote Control Car", "Puzzle 500pcs", "Soft Teddy Bear", "Kids Story Books", "Art Colour Set", "Baby Stroller", "School Bag"],
  automotive: ["Car Phone Holder", "Dash Camera", "Tyre Inflator", "Seat Cover Set", "Car Vacuum Cleaner", "Microfiber Cloth Pack", "Helmet", "Engine Oil 4L"],
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  // Safety: this seed WIPES the tables it uses. Refuse to run on a database that already holds a real catalogue
  // (for example your Daynight store). Use a separate database or a separate schema for ShopZone.
  const existing = await prisma.product.count();
  if (existing > 200 && process.env.FORCE_SEED !== "1") {
    throw new Error(
      `Found ${existing} products. This looks like real data, so the seed will not delete it. ` +
        `Point DATABASE_URL at a separate database/schema, or set FORCE_SEED=1 if you really want to wipe it.`,
    );
  }

  await prisma.productVariant.deleteMany();
  await prisma.question.deleteMany();
  await prisma.address.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.user.deleteMany();

  // Demo accounts (change or delete these before going live!)
  await prisma.user.create({
    data: { email: "admin@shopzone.test", name: "Admin", role: "ADMIN", emailVerified: new Date(), passwordHash: hashPassword("admin1234") },
  });
  await prisma.user.create({
    data: { email: "customer@shopzone.test", name: "Demo Customer", role: "CUSTOMER", emailVerified: new Date(), passwordHash: hashPassword("customer1234") },
  });

  const sellers = [] as { id: string }[];
  for (const [i, shop] of ["TechHub Official", "Urban Trends", "HomeNest Store", "Daily Mart"].entries()) {
    const user = await prisma.user.create({
      data: {
        email: `seller${i + 1}@shopzone.test`,
        name: shop,
        role: "SELLER",
        emailVerified: new Date(),
        passwordHash: hashPassword("seller1234"),
      },
    });
    const seller = await prisma.seller.create({
      data: {
        userId: user.id,
        shopName: shop,
        slug: shop.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        approved: true,
        shippingFee: [35000, 30000, 0, 25000][i],
        shippingPerKg: [5000, 0, 0, 10000][i], // Rs 50 / Rs 100 for every kg after the first
        freeShippingOver: [500000, 400000, null, 300000][i],
        // Demo delivery zones: TechHub is cheaper inside Colombo and Kalmunai.
        shippingZones: i === 0 ? [{ city: "Colombo", fee: 20000 }, { city: "Kalmunai", fee: 25000 }] : [],
        rating: 4 + Math.random(),
      },
    });
    sellers.push(seller);
  }

  for (const c of categories) {
    const cat = await prisma.category.create({ data: c });
    for (const [idx, title] of (names[c.slug] ?? []).entries()) {
      const price = rand(5, 120) * 10000; // cents: Rs 500 – Rs 12,000
      const hasDiscount = Math.random() > 0.4;
      // Fashion items get sizes as demo variants; their stock is the sum of the sizes.
      const sizes = c.slug === "fashion" ? ["S", "M", "L", "XL"].map((name, n) => ({ name, stock: rand(0, 40), sortOrder: n })) : [];
      await prisma.product.create({
        data: {
          title,
          weightGrams: rand(1, 30) * 100, // 100 g – 3 kg
          variants: { create: sizes },
          description: `${title} - quality product with fast delivery. Genuine item sold by a verified seller. 7-day easy returns.`,
          price,
          originalPrice: hasDiscount ? Math.round(price * (1 + rand(15, 60) / 100)) : null,
          stock: sizes.length ? sizes.reduce((n, s) => n + s.stock, 0) : rand(0, 200),
          rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
          ratingCount: rand(3, 1800),
          sold: rand(0, 5000),
          flashSale: idx < 2,
          images: [1, 2, 3].map((n) => `https://picsum.photos/seed/${c.slug}-${idx}-${n}/600/600`),
          categoryId: cat.id,
          sellerId: sellers[rand(0, sellers.length - 1)].id,
        },
      });
    }
  }
  await prisma.voucher.createMany({
    data: [
      { code: "WELCOME10", percentOff: 10 },
      { code: "SAVE500", amountOff: 50000, minSpend: 300000 },
    ],
  });

  console.log("Seeded. Demo logins:");
  console.log("  admin@shopzone.test     / admin1234");
  console.log("  seller1@shopzone.test   / seller1234   (seller1..seller4)");
  console.log("  customer@shopzone.test  / customer1234");
  console.log("Vouchers: WELCOME10 (10% off), SAVE500 (Rs 500 off over Rs 3,000)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
