# uiuxmart

Dashboard project berbasis Next.js dan Supabase untuk mengelola:

- project, assignee, tipe layanan, dan deadline sampai jam;
- milestone, checklist task, progress, revisi, dan timeline update;
- multi tipe project, pembagian role/freelancer per scope, tambahan scope berbayar, invoice uiuxmart, dan notifikasi deadline;
- payment client/freelancer, cashflow, profit, dan pendapatan per tipe project.
- template milestone rekomendasi, checklist handover, dan link invoice publik untuk client.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Upgrade database yang sudah berisi data

Jalankan isi file berikut melalui Supabase SQL Editor:

```text
supabase/20260605_project_workflow_upgrade.sql
supabase/20260605_change_requests_priority.sql
```

Jalankan sesuai urutan di atas. Migrasi tersebut tidak menghapus project, payment, atau update lama. Project lama yang belum
memiliki pembagian role akan dibuatkan satu role awal dari assignee lama agar tetap kompatibel.

Tambahan scope berstatus `Disetujui`, `Dikerjakan`, atau `Selesai` otomatis menambah nilai deal,
fee freelancer, dan estimasi profit project. Status `Menunggu` belum masuk perhitungan.

File `20260605_change_requests_priority.sql` namanya masih historis, tetapi isinya sudah termasuk
multi-role assignment, template-ready milestone, checklist handover, dan public invoice link.

Untuk database baru yang boleh di-reset sepenuhnya, gunakan:

```text
supabase/roleless_access.sql
```

File setup penuh tersebut menghapus lalu membuat ulang schema `public`.

## Verifikasi

```bash
npm run lint
npm run build
```
