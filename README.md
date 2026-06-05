# Task Manager

Dashboard project berbasis Next.js dan Supabase untuk mengelola:

- project, assignee, tipe layanan, dan deadline sampai jam;
- milestone, checklist task, progress, revisi, dan timeline update;
- prioritas, change request berbayar, dan notifikasi deadline di dalam aplikasi;
- payment client/freelancer, cashflow, profit, dan pendapatan per tipe project.

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
memiliki tipe akan tampil sebagai `Belum dikategorikan` sampai diedit.

Change request berstatus `Disetujui`, `Dikerjakan`, atau `Selesai` otomatis menambah nilai deal,
fee freelancer, dan estimasi profit project. Status `Menunggu Persetujuan` belum masuk perhitungan.

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
