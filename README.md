# 🗺️ نقشه فروشندگان اسنپ فود

اپلیکیشن وب تعاملی برای جستجو و مشاهده فروشندگان اسنپ فود روی نقشه، با قابلیت فیلتر دسته‌بندی، مرتب‌سازی بر اساس فاصله و مشاهده جزئیات هر فروشنده.

## ✨ ویژگی‌ها

- **نقشه تعاملی** — نمایش ۸۴۳ فروشنده از ۱۶ شهر مختلف روی نقشه (Leaflet + OpenStreetMap)
- **فیلتر دسته‌بندی** — رستوران، کافه، شیرینی‌فروشی، سوپرمارکت، هایپرمارکت، فروشگاه زنجیره‌ای
- **فیلتر شهر** — انتخاب شهر مورد نظر برای محدود کردن نتایج
- **مرتب‌سازی بر اساس فاصله** — فروشندگان نزدیک‌تر به موقعیت شما اول نمایش داده می‌شوند
- **انتخاب موقعیت روی نقشه** — با کلیک روی نقشه، مبدأ فاصله‌سنجی را تغییر دهید
- **مکان‌یابی خودکار** — استفاده از GPS مرورگر برای پیدا کردن موقعیت فعلی
- **جستجو** — جستجوی سریع در نام فروشندگان
- **پنل جزئیات** — مشاهده امتیاز، هزینه ارسال، زمان delivery، حداقل سفارش و لینک مستقیم اسنپ فود
- **طراحی واکنش‌گرا** — سازگار با موبایل و دسکتاپ
- **راست‌چین (RTL)** — رابط کاربری کامل فارسی

## 🛠️ تکنولوژی‌ها

| تکنولوژی | نقش |
|-----------|------|
| [Next.js 16](https://nextjs.org/) | فریمورک React |
| [TypeScript](https://www.typescriptlang.org/) | زبان برنامه‌نویسی |
| [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | استایل و کامپوننت‌ها |
| [Leaflet](https://leafletjs.com/) + [React-Leaflet](https://react-leaflet.js.org/) | نقشه |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | دیتابیس SQLite |
| [Lucide Icons](https://lucide.dev/) | آیکون‌ها |

## 🚀 شروع به کار

### پیش‌نیازها

- [Node.js](https://nodejs.org/) نسخه ۱۸ یا بالاتر
- [Bun](https://bun.sh/) (اختیاری - برای اجرای سریع‌تر)

### نصب و اجرا

```bash
# کلون کردن ریپوزیتوری
git clone https://github.com/barakabot/snapp-vendor-map.git
cd snapp-vendor-map

# نصب وابستگی‌ها
npm install
# یا
bun install

# قرار دادن فایل دیتابیس
# فایل snapp_vendors.db را در پوشه db/ قرار دهید
mkdir -p db
# cp path/to/snapp_vendors.db db/

# اجرای برنامه
npm run dev
# یا
bun run dev
```

برنامه در آدرس `http://localhost:3000` در دسترس خواهد بود.

## 📁 ساختار پروژه

```
src/
├── app/
│   ├── api/vendors/route.ts   # API فروشندگان (فیلتر، فاصله‌سنجی)
│   ├── globals.css             # استایل‌های کلی + Leaflet
│   ├── layout.tsx              # لایه‌آوت اصلی (RTL)
│   └── page.tsx                # صفحه اصلی (نقشه + لیست + فیلترها)
├── components/ui/              # کامپوننت‌های shadcn/ui
├── hooks/                      # هوک‌های سفارشی
└── lib/
    ├── vendor-db.ts            # لایه دسترسی به دیتابیس فروشندگان
    └── utils.ts                # توابع کمکی
db/
└── snapp_vendors.db            # دیتابیس SQLite فروشندگان
```

## 📊 ساختار دیتابیس

جدول `vendors` شامل فیلدهای زیر است:

| فیلد | نوع | توضیح |
|------|------|-------|
| id | TEXT | شناسه فروشنده |
| title | TEXT | نام فروشنده |
| vendor_type | TEXT | نوع (RESTAURANT, CAFFE, ...) |
| city | TEXT | شهر |
| lat, long | REAL | مختصات جغرافیایی |
| rate_1_to_5 | REAL | امتیاز (۱ تا ۵) |
| delivery_fee | INTEGER | هزینه ارسال (تومان) |
| delivery_time | INTEGER | زمان ارسال (دقیقه) |
| is_open | INTEGER | وضعیت باز/بسته |
| logo | TEXT | آدرس لوگو |

## 🤝 ساخت با

این پروژه با کمک **[Z.ai](https://z.ai)** — دستیار هوش مصنوعی برنامه‌نویسی — ساخته شده است.

## 📄 مجوز

MIT License