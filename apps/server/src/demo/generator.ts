/**
 * Deterministic generator of realistic Bangladeshi-style sales data
 * (products, customers, ~6 months of daily transactions). Used by the seed
 * script, DEMO_MODE and the sample-data files.
 */

export interface DemoProduct {
  name: string;
  nameBn: string;
  sku: string;
  unit: string;
  price: number;
  weight: number;
  maxQty: number;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    name: 'Miniket Rice 25kg',
    nameBn: 'মিনিকেট চাল ২৫ কেজি',
    sku: 'RICE-25',
    unit: 'bag',
    price: 1950,
    weight: 9,
    maxQty: 4,
  },
  {
    name: 'Soybean Oil 5L',
    nameBn: 'সয়াবিন তেল ৫ লিটার',
    sku: 'OIL-5L',
    unit: 'bottle',
    price: 895,
    weight: 8,
    maxQty: 5,
  },
  {
    name: 'Red Lentils (Masoor Dal) 1kg',
    nameBn: 'মসুর ডাল ১ কেজি',
    sku: 'DAL-1',
    unit: 'kg',
    price: 135,
    weight: 7,
    maxQty: 10,
  },
  {
    name: 'Premium Tea 400g',
    nameBn: 'প্রিমিয়াম চা ৪০০ গ্রাম',
    sku: 'TEA-400',
    unit: 'pack',
    price: 260,
    weight: 6,
    maxQty: 8,
  },
  {
    name: 'Mango Juice 1L',
    nameBn: 'আমের জুস ১ লিটার',
    sku: 'JUICE-1L',
    unit: 'bottle',
    price: 120,
    weight: 6,
    maxQty: 12,
  },
  { name: 'Atta Flour 2kg', nameBn: 'আটা ২ কেজি', sku: 'ATTA-2', unit: 'pack', price: 130, weight: 6, maxQty: 10 },
  { name: 'Sugar 1kg', nameBn: 'চিনি ১ কেজি', sku: 'SUGAR-1', unit: 'kg', price: 140, weight: 5, maxQty: 10 },
  {
    name: 'Turmeric Powder 200g',
    nameBn: 'হলুদ গুঁড়া ২০০ গ্রাম',
    sku: 'SPICE-TUR',
    unit: 'pack',
    price: 95,
    weight: 4,
    maxQty: 10,
  },
  { name: 'Hilsa Fish 1kg', nameBn: 'ইলিশ মাছ ১ কেজি', sku: 'FISH-HIL', unit: 'kg', price: 1600, weight: 3, maxQty: 3 },
  {
    name: 'Pasteurized Milk 1L',
    nameBn: 'পাস্তুরিত দুধ ১ লিটার',
    sku: 'MILK-1L',
    unit: 'packet',
    price: 95,
    weight: 6,
    maxQty: 12,
  },
  { name: 'Jamdani Saree', nameBn: 'জামদানি শাড়ি', sku: 'SAREE-JAM', unit: 'pcs', price: 6500, weight: 1, maxQty: 2 },
  { name: 'Nakshi Kantha', nameBn: 'নকশি কাঁথা', sku: 'KANTHA-01', unit: 'pcs', price: 3200, weight: 1, maxQty: 2 },
];

export const DEMO_CUSTOMERS = [
  {
    name: 'Rahim Traders',
    phone: '+8801711000101',
    email: 'rahim.traders@example.com',
    address: '12 Kawran Bazar, Dhaka 1215',
  },
  {
    name: 'Karim Enterprise',
    phone: '+8801811000102',
    email: 'karim.ent@example.com',
    address: 'Agrabad C/A, Chattogram 4100',
  },
  {
    name: 'Nusrat Super Shop',
    phone: '+8801911000103',
    email: 'nusrat.shop@example.com',
    address: 'Zindabazar, Sylhet 3100',
  },
  {
    name: 'Bismillah General Store',
    phone: '+8801611000104',
    email: 'bismillah.store@example.com',
    address: 'Shaheb Bazar, Rajshahi 6100',
  },
  {
    name: 'Ayesha Fashion House',
    phone: '+8801511000105',
    email: 'ayesha.fashion@example.com',
    address: 'Dhanmondi 27, Dhaka 1209',
  },
  {
    name: 'Padma Wholesale',
    phone: '+8801311000106',
    email: 'padma.wholesale@example.com',
    address: 'Khan Jahan Ali Road, Khulna 9100',
  },
  {
    name: 'Meghna Mart',
    phone: '+8801411000107',
    email: 'meghna.mart@example.com',
    address: 'Sadar Road, Barishal 8200',
  },
  {
    name: 'Sonar Bangla Store',
    phone: '+8801711000108',
    email: 'sonarbangla@example.com',
    address: 'Station Road, Rangpur 5400',
  },
  {
    name: 'Tanvir Ahmed',
    phone: '+8801811000109',
    email: 'tanvir.ahmed@example.com',
    address: 'Mirpur 10, Dhaka 1216',
  },
  {
    name: 'Farhana Islam',
    phone: '+8801911000110',
    email: 'farhana.islam@example.com',
    address: 'Uttara Sector 7, Dhaka 1230',
  },
  {
    name: 'Shapla Departmental Store',
    phone: '+8801711000111',
    email: 'shapla.dept@example.com',
    address: 'Kandirpar, Cumilla 3500',
  },
  {
    name: 'Jamuna Distributors',
    phone: '+8801811000112',
    email: 'jamuna.dist@example.com',
    address: 'BSCIC, Bogura 5800',
  },
];

/** Mulberry32 — tiny deterministic PRNG. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GeneratedSale {
  date: Date;
  product: DemoProduct;
  customer: (typeof DEMO_CUSTOMERS)[number];
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Generates `days` days of sales ending on `end` (UTC). Patterns: gentle upward
 * trend, Thursday/Friday peaks, a festival spike (Eid-style) and random noise.
 */
export function generateSales(end: Date, days = 182, seed = 42): GeneratedSale[] {
  const rand = prng(seed);
  const totalWeight = DEMO_PRODUCTS.reduce((s, p) => s + p.weight, 0);
  const pick = () => {
    let r = rand() * totalWeight;
    for (const p of DEMO_PRODUCTS) {
      r -= p.weight;
      if (r <= 0) return p;
    }
    return DEMO_PRODUCTS[0]!;
  };
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const sales: GeneratedSale[] = [];
  const festivalCenter = Math.floor(days * 0.62);

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(endUtc - d * 86_400_000);
    const idx = days - 1 - d;
    const dow = date.getUTCDay();
    const trend = 1 + (idx / days) * 0.35;
    const weekday = dow === 4 ? 1.35 : dow === 5 ? 1.5 : dow === 6 ? 1.15 : dow === 0 ? 0.85 : 1;
    const festival = Math.abs(idx - festivalCenter) <= 4 ? 1.9 : 1;
    const orders = Math.max(2, Math.round((6 + rand() * 5) * trend * weekday * festival));
    for (let o = 0; o < orders; o++) {
      const product = pick();
      const customer = DEMO_CUSTOMERS[Math.floor(rand() * DEMO_CUSTOMERS.length)]!;
      const quantity = 1 + Math.floor(rand() * product.maxQty);
      // ±5% price variation (promotions / wholesale rates)
      const unitPrice = Math.round(product.price * (0.95 + rand() * 0.1));
      sales.push({ date, product, customer, quantity, unitPrice, total: quantity * unitPrice });
    }
  }
  return sales;
}
