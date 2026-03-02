# 🔗 SmartPoultry Kurir — Blockchain System Documentation

## Daftar Isi

- [Pendahuluan](#pendahuluan)
- [Arsitektur Multi-Chain](#arsitektur-multi-chain)
- [Skema Database Blockchain](#skema-database-blockchain)
- [Cara Kerja Blockchain](#cara-kerja-blockchain)
- [Tipe-Tipe Block](#tipe-tipe-block)
- [Alur Lifecycle Pengiriman](#alur-lifecycle-pengiriman)
- [Chain Validation & Integrity](#chain-validation--integrity)
- [Traceability (Penelusuran Rantai Pasok)](#traceability-penelusuran-rantai-pasok)
- [API Endpoints Blockchain](#api-endpoints-blockchain)
- [Data Payload Structure](#data-payload-structure)
- [Keamanan & Integritas](#keamanan--integritas)

---

## Pendahuluan

SmartPoultry Kurir mengimplementasikan **Application-Level Blockchain** untuk mencatat seluruh aktivitas pengiriman dalam supply chain unggas secara **immutable** (tidak dapat diubah). Setiap pengiriman mendapatkan **chain unik** yang terdiri dari blok-blok yang saling terhubung melalui hash kriptografi SHA-256.

Sistem ini bukan blockchain publik seperti Bitcoin/Ethereum, melainkan **private ledger** yang dikelola di level aplikasi untuk menjaga **transparansi, traceability, dan integritas data** di sepanjang rantai pasok.

### Mengapa Blockchain?

| Masalah Tradisional | Solusi Blockchain |
|---|---|
| Data bisa dimanipulasi retroaktif | Setiap block terhubung dengan hash — perubahan terdeteksi |
| Sulit melacak asal-usul produk | Setiap tahap tercatat dengan timestamp & bukti digital |
| Tidak ada bukti handoff antar node | Chain handoff tercatat resmi di ledger |
| Kepercayaan rendah antar stakeholder | Validasi independen melalui chain verification |

---

## Arsitektur Multi-Chain

SmartPoultry menggunakan arsitektur **multi-chain** di mana setiap node (pelaku) dalam supply chain memiliki ledger sendiri. Kurir bertindak sebagai **transportation node** yang menjembatani antar node.

```
┌─────────────────── SUPPLY CHAIN FLOW ───────────────────┐
│                                                          │
│   🐔 PETERNAKAN        🚛 KURIR         🏭 PROCESSOR    │
│   (Farm Node)      (Transport Node)    (Processing Node) │
│                                                          │
│   ledger_farm    →   ledger_kurir   →  ledger_processor  │
│                                                          │
│                    🚛 KURIR         🏪 RETAILER          │
│                 (Transport Node)    (Retail Node)         │
│                                                          │
│                   ledger_kurir   →  ledger_retailer      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Dua Jalur Pengiriman Kurir

1. **`FARM_TO_PROCESSOR`** — Mengangkut dari Peternakan ke Processor
2. **`PROCESSOR_TO_RETAILER`** — Mengangkut dari Processor ke Retailer

Setiap jalur menghasilkan chain terpisah dengan block type yang sesuai.

---

## Skema Database Blockchain

### Tabel `BlockchainIdentity`

Menyimpan identitas chain untuk setiap pengiriman. Satu pengiriman = satu chain.

```sql
CREATE TABLE BlockchainIdentity (
  IdIdentity       INT(11) AUTO_INCREMENT PRIMARY KEY,
  KodeIdentity     VARCHAR(25) NOT NULL UNIQUE,  -- Format: CHAIN-KUR-XXXXXXXXX
  KodePerusahaan   INT(11) NOT NULL,             -- FK → PerusahaanKurir
  KodePengiriman   CHAR(13) NOT NULL,            -- FK → Pengiriman
  GenesisHash      VARCHAR(64) NOT NULL,         -- Hash blok genesis
  LatestBlockHash  VARCHAR(64),                  -- Hash blok terakhir
  TotalBlocks      INT(11) DEFAULT 1,            -- Jumlah total blok
  StatusChain      ENUM('ACTIVE','COMPLETED','FAILED','TRANSFERRED'),
  CreatedAt        DATETIME DEFAULT NOW(),
  CompletedAt      DATETIME
);
```

| Field | Keterangan |
|---|---|
| `KodeIdentity` | ID unik chain, format `CHAIN-KUR-XXXXXXXXX` |
| `GenesisHash` | Hash pertama, menjadi anchor untuk seluruh chain |
| `LatestBlockHash` | Hash terakhir, diupdate setiap ada block baru |
| `StatusChain` | `ACTIVE` = masih berlangsung, `COMPLETED` = pengiriman selesai |

### Tabel `ledger_kurir`

Menyimpan setiap block dalam chain. Ini adalah **immutable ledger** utama.

```sql
CREATE TABLE ledger_kurir (
  IdBlock          INT(11) AUTO_INCREMENT PRIMARY KEY,
  KodeBlock        VARCHAR(25) NOT NULL UNIQUE,  -- Format: BLK-KUR-XXXXXXXXX-NNNN
  KodePerusahaan   INT(11) NOT NULL,             -- FK → PerusahaanKurir
  KodePengiriman   CHAR(13),                     -- FK → Pengiriman
  TipeBlock        ENUM('GENESIS','PICKUP_FARM','DELIVERY_PROCESSOR',
                        'PICKUP_PROCESSOR','DELIVERY_RETAILER'),
  BlockIndex       INT(11) NOT NULL DEFAULT 0,   -- Urutan block dalam chain
  PreviousHash     VARCHAR(64) NOT NULL,         -- Hash block sebelumnya
  CurrentHash      VARCHAR(64) NOT NULL,         -- Hash block ini
  DataPayload      LONGTEXT (JSON),              -- Data detail event
  Nonce            INT(11) DEFAULT 0,            -- Nonce untuk hashing
  StatusBlock      ENUM('VALIDATED','REJECTED'),
  CreatedAt        DATETIME DEFAULT NOW(),
  ValidatedAt      DATETIME DEFAULT NOW()
);
```

| Field | Keterangan |
|---|---|
| `KodeBlock` | ID unik block, format `BLK-KUR-XXXXXXXXX-NNNN` |
| `BlockIndex` | Posisi block dalam chain (0 = genesis) |
| `PreviousHash` | Hash block sebelumnya (chain link) |
| `CurrentHash` | Hash block ini (SHA-256 dari seluruh komponen) |
| `DataPayload` | JSON berisi detail lengkap event |

---

## Cara Kerja Blockchain

### 1. Hashing (SHA-256)

Setiap block di-hash menggunakan algoritma **SHA-256** dengan input gabungan dari:

```
Hash = SHA-256(BlockIndex + PreviousHash + TipeBlock + DataPayload + Timestamp + Nonce)
```

```javascript
function generateHash(blockIndex, previousHash, tipeBlock, dataPayload, timestamp, nonce) {
    const input = `${blockIndex}${previousHash}${tipeBlock}${JSON.stringify(dataPayload)}${timestamp}${nonce}`;
    return crypto.createHash('sha256').update(input).digest('hex');
}
```

### 2. Chain Linking

Setiap block terhubung ke block sebelumnya melalui `PreviousHash`:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  GENESIS     │     │  PICKUP      │     │  DELIVERY    │
│  Block #0    │────>│  Block #1    │────>│  Block #2    │
│              │     │              │     │              │
│ PrevHash:    │     │ PrevHash:    │     │ PrevHash:    │
│ 000000...    │     │ [Hash #0]    │     │ [Hash #1]    │
│              │     │              │     │              │
│ CurrHash:    │     │ CurrHash:    │     │ CurrHash:    │
│ a3f8b2...    │     │ 7c1de4...    │     │ 9f2ab7...    │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 3. Genesis Block

Genesis block (block pertama) selalu menggunakan **genesis previous hash** yang merupakan string 64 karakter nol:

```
GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000"
```

---

## Tipe-Tipe Block

Kurir node memiliki **5 tipe block** yang merepresentasikan setiap tahap pengiriman:

### Jalur Farm → Processor

| # | Tipe Block | Trigger | Keterangan |
|---|---|---|---|
| 0 | `GENESIS` | Pengiriman baru dibuat | Block pertama, berisi info dasar pengiriman |
| 1 | `PICKUP_FARM` | Bukti Tanda Terima dibuat | Kurir menerima barang dari peternakan |
| 2 | `DELIVERY_PROCESSOR` | Nota Pengiriman dibuat | Kurir menyerahkan barang ke processor |

### Jalur Processor → Retailer

| # | Tipe Block | Trigger | Keterangan |
|---|---|---|---|
| 0 | `GENESIS` | Pengiriman baru dibuat | Block pertama, berisi info dasar pengiriman |
| 1 | `PICKUP_PROCESSOR` | Bukti Tanda Terima dibuat | Kurir menerima barang dari processor |
| 2 | `DELIVERY_RETAILER` | Nota Pengiriman dibuat | Kurir menyerahkan barang ke retailer |

---

## Alur Lifecycle Pengiriman

Setiap pengiriman melalui lifecycle berikut, dengan blockchain event otomatis:

```
                    ┌─────────────────────────────────────┐
                    │     PENGIRIMAN DIBUAT                │
                    │     POST /api/pengiriman             │
                    │                                     │
                    │  ⛓️ Genesis Block (Block #0)         │
                    │  📋 Status: PICKUP                  │
                    │  🔗 Chain Status: ACTIVE             │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────┐
                    │     BUKTI TANDA TERIMA              │
                    │     POST /api/pengiriman/:id/bukti  │
                    │                                     │
                    │  ⛓️ Pickup Block (Block #1)          │
                    │     PICKUP_FARM atau                 │
                    │     PICKUP_PROCESSOR                 │
                    │  📋 Status: DALAM_PERJALANAN        │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────┐
                    │     NOTA PENGIRIMAN                 │
                    │     POST /api/pengiriman/:id/nota   │
                    │                                     │
                    │  ⛓️ Delivery Block (Block #2)        │
                    │     DELIVERY_PROCESSOR atau          │
                    │     DELIVERY_RETAILER                │
                    │  📋 Status: TERKIRIM / GAGAL        │
                    │  🔗 Chain Status: COMPLETED          │
                    └─────────────────────────────────────┘
```

### Chain Handoff

Saat pengiriman selesai (delivery block dibuat), terjadi **chain handoff**:

```javascript
// Dalam delivery block payload:
{
    "chain_handoff": "FARM_CHAIN_COMPLETED",     // atau "PROCESSOR_CHAIN_COMPLETED"
    "next_chain": "PROCESSOR_CHAIN_START",        // atau "RETAILER_CHAIN_START"
    "transfer_status": "HANDOFF_TO_PROCESSOR"     // atau "HANDOFF_TO_RETAILER"
}
```

Ini menandakan bahwa tanggung jawab rantai pasok telah **berpindah** ke node berikutnya. Node penerima (processor/retailer) kemudian memulai chain mereka sendiri.

---

## Chain Validation & Integrity

Sistem menyediakan fungsi validasi untuk memastikan integritas chain:

```javascript
async function validateChain(sequelize, kodePengiriman) {
    // 1. Ambil semua blocks, urutkan berdasarkan BlockIndex
    // 2. Verifikasi block #0 dimulai dengan GENESIS_PREV_HASH
    // 3. Untuk setiap block berikutnya:
    //    - PreviousHash harus sama dengan CurrentHash block sebelumnya
    // 4. Jika ada mismatch, chain dianggap BROKEN
}
```

### Skenario Validasi

| Hasil | Keterangan |
|---|---|
| ✅ `valid: true` | Semua hash terhubung dengan benar |
| ❌ `valid: false` | Hash mismatch terdeteksi — data mungkin telah dimanipulasi |
| ⚠️ `totalBlocks: 0` | Chain belum memiliki block |

### Contoh Response Validasi

```json
{
    "valid": true,
    "message": "Chain integrity verified ✓",
    "totalBlocks": 3
}
```

```json
{
    "valid": false,
    "message": "Chain broken at block 2: Previous hash mismatch. Expected: a3f8b2c1d4e5f6a7..., Got: 9f2ab7e8c3d1f0b2...",
    "blockIndex": 2,
    "totalBlocks": 3
}
```

---

## Traceability (Penelusuran Rantai Pasok)

API traceability memberikan **gambaran lengkap** dari suatu pengiriman:

```json
{
    "chain": {
        "kodeIdentity": "CHAIN-KUR-000000001",
        "perusahaanKurir": "PT. Express Logistics",
        "alamat": "Jl. Logistik No. 1",
        "statusChain": "COMPLETED",
        "totalBlocks": 3
    },
    "blocks": [ /* array of all blocks */ ],
    "timeline": [
        {
            "index": 0,
            "type": "GENESIS",
            "hash": "a3f8b2c1d4e5f6a7",
            "timestamp": "2026-03-01T10:00:00",
            "summary": "Pengiriman dimulai: Farm ABC → Processor XYZ"
        },
        {
            "index": 1,
            "type": "PICKUP_FARM",
            "hash": "7c1de4f5a6b8c9d0",
            "timestamp": "2026-03-01T10:30:00",
            "summary": "Pickup dari peternakan: 500 kg (10 item)"
        },
        {
            "index": 2,
            "type": "DELIVERY_PROCESSOR",
            "hash": "9f2ab7e8c3d1f0b2",
            "timestamp": "2026-03-01T14:00:00",
            "summary": "Diterima processor: Budi (kondisi: BAIK)"
        }
    ],
    "validation": {
        "valid": true,
        "message": "Chain integrity verified ✓",
        "totalBlocks": 3
    },
    "nodeType": "NODE_KURIR",
    "nodeDescription": "Courier / Kurir (Transportation Node in Supply Chain)"
}
```

---

## API Endpoints Blockchain

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/blockchain/chains` | User | Daftar semua chain milik perusahaan |
| `GET` | `/api/blockchain/ledger` | **Admin** | Semua block di ledger (max 100) |
| `GET` | `/api/blockchain/trace/:kodePengiriman` | User | Full traceability data untuk pengiriman |
| `GET` | `/api/blockchain/validate/:kodePengiriman` | User | Validasi integritas chain |
| `GET` | `/api/blockchain/stats` | User | Statistik blockchain (total chains, blocks, dll.) |

### Blockchain Stats Response

```json
{
    "totalChains": 25,
    "activeChains": 5,
    "completedChains": 18,
    "totalBlocks": 75
}
```

---

## Data Payload Structure

Setiap tipe block memiliki payload JSON yang berbeda:

### GENESIS Payload

```json
{
    "event": "GENESIS",
    "node": "NODE_KURIR",
    "pengiriman_id": "PNGR-000000001",
    "tipe_pengiriman": "FARM_TO_PROCESSOR",
    "asal_pengirim": "Farm ABC",
    "tujuan_penerima": "Processor XYZ",
    "tanggal_pickup": "2026-03-01",
    "kode_kurir": "KURR-000000001"
}
```

### PICKUP_FARM / PICKUP_PROCESSOR Payload

```json
{
    "event": "PICKUP_FARM",
    "node": "NODE_KURIR",
    "kode_bukti": "BKTT-000000001",
    "nama_pengirim": "Farm ABC",
    "nama_penerima_kurir": "Driver Andi",
    "jumlah_barang": 10,
    "berat_total_kg": 500,
    "tanggal_terima": "2026-03-01",
    "keterangan": "Ayam broiler segar",
    "source_node": "NODE_PETERNAKAN",
    "target_node": "NODE_PROCESSOR"
}
```

### DELIVERY_PROCESSOR / DELIVERY_RETAILER Payload

```json
{
    "event": "DELIVERY_PROCESSOR",
    "node": "NODE_KURIR",
    "kode_nota": "NOTA-000000001",
    "nama_penerima_processor": "Budi",
    "kondisi_barang": "BAIK",
    "tanggal_sampai": "2026-03-01",
    "keterangan": "Diterima dalam kondisi baik",
    "chain_handoff": "FARM_CHAIN_COMPLETED",
    "next_chain": "PROCESSOR_CHAIN_START",
    "transfer_status": "HANDOFF_TO_PROCESSOR"
}
```

---

## Keamanan & Integritas

### Mekanisme Keamanan

1. **SHA-256 Hashing** — Setiap block di-hash dengan algoritma kriptografi yang kuat
2. **Chain Linking** — Setiap block menyimpan hash block sebelumnya, menciptakan rantai yang tak terputus
3. **Immutable Ledger** — Data yang sudah masuk ke ledger tidak pernah di-UPDATE atau DELETE
4. **Transactional Writes** — Semua operasi blockchain menggunakan database transaction untuk konsistensi
5. **Multi-tenant Isolation** — Setiap perusahaan kurir hanya bisa mengakses chain milik mereka sendiri (`KodePerusahaan` filter)
6. **Role-based Access** — Ledger penuh hanya bisa dilihat oleh admin; user biasa hanya akses chain dan trace

### Kenapa Application-Level, Bukan Public Blockchain?

| Aspek | Application-Level | Public Blockchain |
|---|---|---|
| **Kecepatan** | Near-instant (database write) | Lambat (consensus mechanism) |
| **Biaya** | Gratis (tanpa gas fee) | Mahal per transaksi |
| **Privasi** | Data hanya bisa dilihat pihak berwenang | Publik (semua orang bisa baca) |
| **Kontrol** | Penuh oleh perusahaan | Desentralisasi penuh |
| **Integritas** | Chain validation + hash verification | Consensus mechanism |
| **Cocok untuk** | Supply chain privat, audit internal | Cryptocurrency, DeFi |

### Format Kode

| Entity | Format | Contoh |
|---|---|---|
| Chain Identity | `CHAIN-KUR-XXXXXXXXX` | `CHAIN-KUR-000000001` |
| Block Code | `BLK-KUR-XXXXXXXXX-NNNN` | `BLK-KUR-000000001-0000` |
| Pengiriman | `PNGR-000000001` | — |
| Bukti Tanda Terima | `BKTT-000000001` | — |
| Nota Pengiriman | `NOTA-000000001` | — |

---

## Diagram Arsitektur Lengkap

```
┌─────────────────────────────────────────────────────────────────┐
│                     SMARTPOULTRY KURIR                          │
│                   Blockchain Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌──────────────────┐   ┌────────────────┐   │
│  │  Frontend    │   │    Backend API    │   │   Database     │   │
│  │             │   │                  │   │                │   │
│  │ Blockchain  │──→│ /api/blockchain/ │──→│ ledger_kurir   │   │
│  │ Viewer Page │   │   chains         │   │                │   │
│  │             │   │   ledger         │   │ Blockchain     │   │
│  │ Traceability│──→│   trace/:id      │──→│ Identity       │   │
│  │ Timeline    │   │   validate/:id   │   │                │   │
│  │             │   │   stats          │   │                │   │
│  └─────────────┘   └────────┬─────────┘   └────────────────┘   │
│                             │                                   │
│                    ┌────────▼─────────┐                         │
│                    │ blockchainHelper │                         │
│                    │                  │                         │
│                    │ • generateHash() │                         │
│                    │ • createBlock()  │                         │
│                    │ • validateChain()│                         │
│                    │ • getTraceData() │                         │
│                    └──────────────────┘                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AUTO-TRIGGERED EVENTS                       │   │
│  │                                                          │   │
│  │  POST /pengiriman      → createGenesisBlock()            │   │
│  │  POST /pengiriman/bukti → createPickupFarm/Processor()   │   │
│  │  POST /pengiriman/nota  → createDeliveryProcessor/       │   │
│  │                           createDeliveryRetailer()       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

> **📝 Catatan**: Blockchain ini terintegrasi otomatis dengan proses bisnis. Tidak perlu ada aksi manual untuk membuat block — setiap operasi pengiriman (buat, pickup, delivery) secara otomatis menghasilkan block baru di ledger.
