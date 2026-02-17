import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { products, settings } from "../shared/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const seedProducts = [
  {
    name: "Noir Sequin Abaya",
    nameAr: "عباءة سوداء بترتر",
    price: 185,
    category: "Outerwear",
    categoryAr: "ملابس خارجية",
    images: ["/images/prod-1.jpg"],
    isNew: true,
    description: "A sophisticated noir abaya featuring hand-stitched silver sequins on the sleeves. Designed for a commanding presence at evening events.",
    descriptionAr: "عباءة سوداء راقية تتميز بترتر فضي مخيط يدوياً على الأكمام. مصممة لتمنحكِ حضوراً طاغياً في المناسبات المسائية.",
    hasShirt: true,
    hasTrouser: false,
  },
  {
    name: "Taupe Couture Suit",
    nameAr: "بدلة كوتور رمادية",
    price: 240,
    category: "Sets",
    categoryAr: "أطقم",
    images: ["/images/prod-2.jpg"],
    isNew: true,
    description: "Refined taupe tailoring with exquisite floral embroidery on the sleeves. A masterclass in modern minimalism and couture detail.",
    descriptionAr: "تصميم رمادي راقي مع تطريز زهور رائع على الأكمام. درس في البساطة الحديثة وتفاصيل الكوتور.",
    hasShirt: true,
    hasTrouser: true,
  },
  {
    name: "Gilded Lattice Coat",
    nameAr: "معطف شبكي مذهب",
    price: 210,
    category: "Outerwear",
    categoryAr: "ملابس خارجية",
    images: ["/images/prod-3.jpg"],
    isNew: false,
    description: "Intricately beaded lattice pattern on a rich textured fabric. This statement piece features a unique fringed collar for added depth.",
    descriptionAr: "نمط شبكي مطرز بتعقيد على قماش غني الملمس. تتميز هذه القطعة بياقة فريدة من نوعها لمزيد من العمق.",
    hasShirt: true,
    hasTrouser: false,
  },
  {
    name: "Pearl Embellished Tunic",
    nameAr: "تونيك مزين باللؤلؤ",
    price: 165,
    category: "Tops",
    categoryAr: "قمصان",
    images: ["/images/prod-4.jpg"],
    isNew: false,
    description: "Lustrous cream silk tunic adorned with hand-applied pearl and bead motifs. Voluminous sleeves add a touch of royal drama.",
    descriptionAr: "تونيك من الحرير الكريمي اللامع مزين بزخارف من اللؤلؤ والخرز المضافة يدوياً. تضيف الأكمام الواسعة لمسة من الدراما الملكية.",
    hasShirt: true,
    hasTrouser: false,
  },
  {
    name: "Geometric Velvet Kaftan",
    nameAr: "قفطان مخملي هندسي",
    price: 195,
    category: "Dresses",
    categoryAr: "فساتين",
    images: ["/images/prod-5.jpg"],
    isNew: false,
    description: "Striking geometric patterns meet soft velvet textures. Features a cinched waist with a golden silk belt for a flattering silhouette.",
    descriptionAr: "أنماط هندسية ملفتة تلتقي مع أنسجة المخمل الناعمة. يتميز بخصر محدد مع حزام حريري ذهبي لإطلالة جذابة.",
    hasShirt: true,
    hasTrouser: false,
  },
  {
    name: "Golden Hour Maxi",
    nameAr: "فستان ماكسي الساعة الذهبية",
    price: 225,
    category: "Dresses",
    categoryAr: "فساتين",
    images: ["/images/prod-6.jpg"],
    isNew: false,
    description: "A flowing golden maxi dress designed for ultimate elegance. The metallic sheen reflects light beautifully, perfect for high-profile gatherings.",
    descriptionAr: "فستان ماكسي ذهبي منساب مصمم للأناقة القصوى. البريق المعدني يعكس الضوء بجمال، مثالي للتجمعات الراقية.",
    hasShirt: true,
    hasTrouser: false,
  },
  {
    name: "Floral Brocade Gown",
    nameAr: "ثوب بروكار زهري",
    price: 280,
    category: "Dresses",
    categoryAr: "فساتين",
    images: ["/images/prod-7.jpg"],
    isNew: false,
    description: "Exquisite floral brocade work on a structured gown. Features a bold orange belt that provides a sophisticated pop of color.",
    descriptionAr: "عمل بروكار زهري رائع على فستان محدد. يتميز بحزام برتقالي جريء يضفي لمسة من اللون الراقي.",
    hasShirt: true,
    hasTrouser: false,
  },
  {
    name: "Claret Appliqué Set",
    nameAr: "طقم زين العناب",
    price: 155,
    category: "Sets",
    categoryAr: "أطقم",
    images: ["/images/prod-8.jpg"],
    isNew: false,
    description: "Deep claret set with unique butterfly-inspired appliqués. A modern take on traditional silhouettes for the confident BILYAR woman.",
    descriptionAr: "طقم بلون العناب العميق مع زينة فريدة مستوحاة من الفراشة. رؤية حديثة للقصات التقليدية لامرأة بيليار الواثقة.",
    hasShirt: true,
    hasTrouser: true,
  },
];

async function seed() {
  const [existingProducts] = await db.select().from(products).limit(1);
  if (!existingProducts) {
    console.log("Seeding products...");
    for (const p of seedProducts) {
      await db.insert(products).values(p);
    }
    console.log(`Seeded ${seedProducts.length} products.`);
  } else {
    console.log("Products already exist, skipping product seed.");
  }

  const [existingSettings] = await db.select().from(settings).limit(1);
  if (!existingSettings) {
    console.log("Seeding default settings...");
    await db.insert(settings).values({
      storeName: "BILYAR",
      storeEmail: "info@bilyar.com",
      storePhone: "+965 1234 5678",
      currency: "KWD",
      freeShippingThreshold: 90,
      defaultShippingCost: 5,
    });
    console.log("Default settings created.");
  }

  await pool.end();
}

seed().catch(console.error);
