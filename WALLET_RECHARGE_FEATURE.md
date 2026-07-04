# تحديثات نظام شحن المحفظة

## التعديلات التي تمت:

### 1. صفحة شحن المحفظة (`/wallet/add-funds`)
- ✅ إضافة حقل **رقم الحساب** - للمستخدم إدخال رقم حسابه البنكي
- ✅ إضافة حقل **صورة التحويل** مع:
  - تحذير أحمر "مطلوبة" 
  - تحقق من أن المستخدم يجب أن يرفع صورة
  - عرض اسم الملف المختار
- ✅ رفع الصورة إلى Supabase Storage في bucket `wallet-transfer-slips`
- ✅ حفظ البيانات: المبلغ + رقم الحساب + رابط الصورة

### 2. صفحة الأدمن (`/admin/payments`)
- ✅ عرض صورة التحويل كاملة
- ✅ عرض رقم الحساب المستخدم
- ✅ عند الموافقة: 
  - تحديث حالة الطلب إلى "approved"
  - **إضافة المبلغ تلقائياً للمحفظة**
- ✅ عند الرفض: تحديث الحالة إلى "rejected"

### 3. صفحة عرض المحفظة (`/wallet`)
- ✅ عرض تفاصيل كل طلب:
  - المبلغ
  - الحالة (معلق/موافق عليه/مرفوض)
  - تاريخ الطلب
  - رقم الحساب (إن وجد)
  - صورة التحويل

## خطوات التطبيق في Supabase:

### الخطوة 1: إضافة الأعمدة الجديدة
قم بتشغيل SQL التالي في Supabase SQL Editor:

```sql
ALTER TABLE recharge_requests
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS transfer_image_url TEXT;
```

### الخطوة 2: التأكد من bucket التخزين
تأكد من وجود bucket باسم `wallet-transfer-slips` في Supabase Storage:
1. اذهب إلى Storage في Supabase
2. إنشئ bucket جديد باسم `wallet-transfer-slips`
3. اجعل البيانات **Public** حتى يتمكن الجميع من عرض الصور
4. قم بتعيين RLS Policy إذا لزم الأمر

### الخطوة 3: إعدادات RLS (إذا لزم الأمر)
إذا كنت تريد التحكم بصلاحيات الوصول:

```sql
-- For bucket access (تقريباً، قد يكون مختلفاً حسب إعداداتك)
CREATE POLICY "Allow users to upload their own receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'wallet-transfer-slips' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow anyone to view receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'wallet-transfer-slips');
```

## تدفق العمل:

### من جهة المستخدم:
1. ✅ ذهاب للمحفظة → شحن المحفظة
2. ✅ إدخال المبلغ
3. ✅ إدخال رقم حسابه البنكي
4. ✅ **رفع صورة التحويل (إجباري)**
5. ✅ الضغط على "إرسال طلب الشحن"
6. ✅ ظهور تنبيه النجاح
7. ✅ إعادة توجيه للمحفظة

### من جهة الأدمن:
1. ✅ الذهاب إلى admin/payments
2. ✅ رؤية الطلبات المعلقة مع:
   - اسم الطالب
   - المبلغ
   - رقم الحساب
   - **صورة التحويل مرئية**
3. ✅ التحقق من الصورة والبيانات
4. ✅ الضغط على "موافقة" → المبلغ يضاف تلقائياً ✅
5. ✅ أو الضغط على "رفض" → رفض الطلب

## الحقول في قاعدة البيانات:

```typescript
interface RechargeRequest {
  id: string
  user_id: string
  amount: number
  account_number?: string        // جديد ✨
  transfer_image_url?: string    // جديد ✨
  status: "pending" | "approved" | "rejected"
  created_at: string
  users?: { full_name?: string }
}
```

## ملاحظات تقنية:

- الصور تُخزن في Supabase Storage وليس في قاعدة البيانات
- اسم الملف يكون مشفر عشوائياً لمنع تضارب الأسماء
- الصور مرئية للأدمن وللمستخدم من صفحة محفظتهم
- عند الموافقة، يتم تحديث wallet.balance تلقائياً ✅

## التحقق من التطبيق:

1. ✅ بناء المشروع: `npm exec next build` ✅ نجح
2. ⏭️ اختبار في البيئة:
   - تسجيل دخول طالب
   - محاولة شحن المحفظة
   - التحقق من ظهور جميع الحقول
   - تسجيل دخول أدمن
   - الموافقة على الطلب والتحقق من إضافة الرصيد
