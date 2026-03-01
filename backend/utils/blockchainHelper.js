// ============================================================================
// BLOCKCHAIN HELPER - Application-Level Blockchain for Node Kurir
// ============================================================================
// Block identity = Pengiriman (each shipment gets its own chain)
// Multi-chain: Peternakan → Kurir → Processor → Kurir → Retailer
// ============================================================================

const crypto = require('crypto');

// Genesis hash constant
const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Generate SHA-256 hash from block components
 */
function generateHash(blockIndex, previousHash, tipeBlock, dataPayload, timestamp, nonce) {
    const input = `${blockIndex || 0}${previousHash || ''}${tipeBlock || ''}${typeof dataPayload === 'string' ? dataPayload : JSON.stringify(dataPayload)}${timestamp || ''}${nonce || 0}`;
    return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Get the previous hash for a given shipment chain
 */
async function getPreviousHash(sequelize, kodePengiriman, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT CurrentHash FROM ledger_kurir 
         WHERE KodePengiriman = :kodePengiriman 
         ORDER BY BlockIndex DESC LIMIT 1`,
        { ...opts, replacements: { kodePengiriman } }
    );

    return result ? result.CurrentHash : GENESIS_PREV_HASH;
}

/**
 * Get next block index for a shipment chain
 */
async function getNextBlockIndex(sequelize, kodePengiriman, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT COALESCE(MAX(BlockIndex), -1) + 1 AS nextIndex 
         FROM ledger_kurir 
         WHERE KodePengiriman = :kodePengiriman`,
        { ...opts, replacements: { kodePengiriman } }
    );

    return result ? result.nextIndex : 0;
}

/**
 * Create a new block in the ledger
 */
async function createBlock(sequelize, { kodePerusahaan, kodePengiriman, tipeBlock, dataPayload, transaction = null }) {
    const blockIndex = await getNextBlockIndex(sequelize, kodePengiriman, transaction);
    const previousHash = await getPreviousHash(sequelize, kodePengiriman, transaction);

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const nonce = 0;

    const currentHash = generateHash(
        blockIndex,
        previousHash,
        tipeBlock,
        dataPayload,
        timestamp,
        nonce
    );

    const kodeBlock = `BLK-KUR-${kodePengiriman.substring(4)}-${String(blockIndex).padStart(4, '0')}`;

    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    await sequelize.query(
        `INSERT INTO ledger_kurir 
         (KodeBlock, KodePerusahaan, KodePengiriman, TipeBlock, BlockIndex, PreviousHash, CurrentHash, DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt) 
         VALUES (:kodeBlock, :kodePerusahaan, :kodePengiriman, :tipeBlock, :blockIndex, :previousHash, :currentHash, :dataPayload, :nonce, 'VALIDATED', NOW(), NOW())`,
        {
            ...queryOpts,
            replacements: {
                kodeBlock,
                kodePerusahaan,
                kodePengiriman,
                tipeBlock,
                blockIndex,
                previousHash,
                currentHash,
                dataPayload: JSON.stringify(dataPayload),
                nonce
            }
        }
    );

    // Update BlockchainIdentity
    await sequelize.query(
        `UPDATE BlockchainIdentity 
         SET LatestBlockHash = :currentHash, TotalBlocks = TotalBlocks + 1 
         WHERE KodePengiriman = :kodePengiriman`,
        {
            ...queryOpts,
            replacements: { currentHash, kodePengiriman }
        }
    );

    return { kodeBlock, blockIndex, previousHash, currentHash, tipeBlock };
}

// ============================================================================
// HIGH-LEVEL BLOCKCHAIN EVENT FUNCTIONS
// ============================================================================

/**
 * GENESIS BLOCK - When a new shipment is created
 */
async function createGenesisBlock(sequelize, { kodePerusahaan, kodePengiriman, tipePengiriman, asalPengirim, tujuanPenerima, tanggalPickup, kodeKurir, transaction = null }) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    // Generate genesis hash
    const genesisHash = generateHash(
        0,
        GENESIS_PREV_HASH,
        'GENESIS',
        JSON.stringify({ pengiriman_id: kodePengiriman, tipe: tipePengiriman, asal: asalPengirim }),
        new Date().toISOString().replace('T', ' ').substring(0, 19),
        0
    );

    const kodeIdentity = `CHAIN-KUR-${kodePengiriman.substring(4)}`;

    // Create BlockchainIdentity
    await sequelize.query(
        `INSERT INTO BlockchainIdentity 
         (KodeIdentity, KodePerusahaan, KodePengiriman, GenesisHash, LatestBlockHash, TotalBlocks, StatusChain, CreatedAt) 
         VALUES (:kodeIdentity, :kodePerusahaan, :kodePengiriman, :genesisHash, :genesisHash, 0, 'ACTIVE', NOW())`,
        {
            ...queryOpts,
            replacements: { kodeIdentity, kodePerusahaan, kodePengiriman, genesisHash }
        }
    );

    // Create Genesis Block
    return await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'GENESIS',
        dataPayload: {
            event: 'GENESIS',
            node: 'NODE_KURIR',
            pengiriman_id: kodePengiriman,
            tipe_pengiriman: tipePengiriman,
            asal_pengirim: asalPengirim,
            tujuan_penerima: tujuanPenerima,
            tanggal_pickup: tanggalPickup,
            kode_kurir: kodeKurir
        },
        transaction
    });
}

/**
 * PICKUP_FARM BLOCK - When courier picks up from farm
 */
async function createPickupFarmBlock(sequelize, { kodePerusahaan, kodePengiriman, kodeBukti, namaPengirim, namaPenerima, jumlahBarang, beratTotal, tanggalTerima, keterangan, transaction = null }) {
    return await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'PICKUP_FARM',
        dataPayload: {
            event: 'PICKUP_FARM',
            node: 'NODE_KURIR',
            kode_bukti: kodeBukti,
            nama_pengirim: namaPengirim,
            nama_penerima_kurir: namaPenerima,
            jumlah_barang: jumlahBarang,
            berat_total_kg: beratTotal,
            tanggal_terima: tanggalTerima,
            keterangan: keterangan,
            source_node: 'NODE_PETERNAKAN',
            target_node: 'NODE_PROCESSOR'
        },
        transaction
    });
}

/**
 * DELIVERY_PROCESSOR BLOCK - When courier delivers to processor
 */
async function createDeliveryProcessorBlock(sequelize, { kodePerusahaan, kodePengiriman, kodeNota, namaPenerima, kondisiBarang, tanggalSampai, keterangan, transaction = null }) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    const block = await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'DELIVERY_PROCESSOR',
        dataPayload: {
            event: 'DELIVERY_PROCESSOR',
            node: 'NODE_KURIR',
            kode_nota: kodeNota,
            nama_penerima_processor: namaPenerima,
            kondisi_barang: kondisiBarang,
            tanggal_sampai: tanggalSampai,
            keterangan: keterangan,
            chain_handoff: 'FARM_CHAIN_COMPLETED',
            next_chain: 'PROCESSOR_CHAIN_START',
            transfer_status: 'HANDOFF_TO_PROCESSOR'
        },
        transaction
    });

    // Complete the chain
    await sequelize.query(
        `UPDATE BlockchainIdentity SET StatusChain = 'COMPLETED', CompletedAt = NOW() WHERE KodePengiriman = :kodePengiriman`,
        { ...queryOpts, replacements: { kodePengiriman } }
    );

    return block;
}

/**
 * PICKUP_PROCESSOR BLOCK - When courier picks up from processor
 */
async function createPickupProcessorBlock(sequelize, { kodePerusahaan, kodePengiriman, kodeBukti, namaPengirim, namaPenerima, jumlahBarang, beratTotal, tanggalTerima, keterangan, transaction = null }) {
    return await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'PICKUP_PROCESSOR',
        dataPayload: {
            event: 'PICKUP_PROCESSOR',
            node: 'NODE_KURIR',
            kode_bukti: kodeBukti,
            nama_pengirim_processor: namaPengirim,
            nama_penerima_kurir: namaPenerima,
            jumlah_barang: jumlahBarang,
            berat_total_kg: beratTotal,
            tanggal_terima: tanggalTerima,
            keterangan: keterangan,
            source_node: 'NODE_PROCESSOR',
            target_node: 'NODE_RETAILER'
        },
        transaction
    });
}

/**
 * DELIVERY_RETAILER BLOCK - When courier delivers to retailer
 */
async function createDeliveryRetailerBlock(sequelize, { kodePerusahaan, kodePengiriman, kodeNota, namaPenerima, kondisiBarang, tanggalSampai, keterangan, transaction = null }) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    const block = await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'DELIVERY_RETAILER',
        dataPayload: {
            event: 'DELIVERY_RETAILER',
            node: 'NODE_KURIR',
            kode_nota: kodeNota,
            nama_penerima_retailer: namaPenerima,
            kondisi_barang: kondisiBarang,
            tanggal_sampai: tanggalSampai,
            keterangan: keterangan,
            chain_handoff: 'PROCESSOR_CHAIN_COMPLETED',
            next_chain: 'RETAILER_CHAIN_START',
            transfer_status: 'HANDOFF_TO_RETAILER'
        },
        transaction
    });

    // Complete the chain
    await sequelize.query(
        `UPDATE BlockchainIdentity SET StatusChain = 'COMPLETED', CompletedAt = NOW() WHERE KodePengiriman = :kodePengiriman`,
        { ...queryOpts, replacements: { kodePengiriman } }
    );

    return block;
}

/**
 * Validate chain integrity for a shipment
 */
async function validateChain(sequelize, kodePengiriman) {
    const blocks = await sequelize.query(
        `SELECT IdBlock, BlockIndex, CurrentHash, PreviousHash, TipeBlock, DataPayload, CreatedAt 
         FROM ledger_kurir 
         WHERE KodePengiriman = :kodePengiriman 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
    );

    if (blocks.length === 0) {
        return { valid: false, message: 'No blocks found', totalBlocks: 0 };
    }

    let expectedPrevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.PreviousHash !== expectedPrevHash) {
            return {
                valid: false,
                message: `Chain broken at block ${i}: Previous hash mismatch. Expected: ${expectedPrevHash.substring(0, 16)}..., Got: ${block.PreviousHash.substring(0, 16)}...`,
                blockIndex: i,
                totalBlocks: blocks.length
            };
        }
        expectedPrevHash = block.CurrentHash;
    }

    return { valid: true, message: 'Chain integrity verified ✓', totalBlocks: blocks.length };
}

/**
 * Get full traceability data for a shipment
 */
async function getTraceabilityData(sequelize, kodePengiriman) {
    // Get chain identity
    const [identity] = await sequelize.query(
        `SELECT bi.*, pk.NamaPerusahaan, pk.AlamatPerusahaan 
         FROM BlockchainIdentity bi 
         JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan 
         WHERE bi.KodePengiriman = :kodePengiriman`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
    );

    if (!identity) return null;

    // Get all blocks
    const blocks = await sequelize.query(
        `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash, DataPayload, StatusBlock, CreatedAt 
         FROM ledger_kurir 
         WHERE KodePengiriman = :kodePengiriman 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
    );

    // Validate chain
    const validation = await validateChain(sequelize, kodePengiriman);

    // Build timeline summary
    const timeline = blocks.map(b => {
        let payload = b.DataPayload;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
        }
        return {
            index: b.BlockIndex,
            type: b.TipeBlock,
            hash: b.CurrentHash.substring(0, 16),
            timestamp: b.CreatedAt,
            summary: getBlockSummary(b.TipeBlock, payload)
        };
    });

    return {
        chain: {
            kodeIdentity: identity.KodeIdentity,
            perusahaanKurir: identity.NamaPerusahaan,
            alamat: identity.AlamatPerusahaan,
            statusChain: identity.StatusChain,
            totalBlocks: identity.TotalBlocks,
            createdAt: identity.CreatedAt,
            completedAt: identity.CompletedAt
        },
        blocks,
        timeline,
        validation,
        nodeType: 'NODE_KURIR',
        nodeDescription: 'Courier / Kurir (Transportation Node in Supply Chain)'
    };
}

/**
 * Get human-readable summary for a block type
 */
function getBlockSummary(tipeBlock, payload) {
    switch (tipeBlock) {
        case 'GENESIS':
            return `Pengiriman dimulai: ${payload.asal_pengirim || '?'} → ${payload.tujuan_penerima || '?'}`;
        case 'PICKUP_FARM':
            return `Pickup dari peternakan: ${payload.berat_total_kg || '?'} kg (${payload.jumlah_barang || '?'} item)`;
        case 'DELIVERY_PROCESSOR':
            return `Diterima processor: ${payload.nama_penerima_processor || '?'} (kondisi: ${payload.kondisi_barang || '?'})`;
        case 'PICKUP_PROCESSOR':
            return `Pickup dari processor: ${payload.berat_total_kg || '?'} kg (${payload.jumlah_barang || '?'} item)`;
        case 'DELIVERY_RETAILER':
            return `Diterima retailer: ${payload.nama_penerima_retailer || '?'} (kondisi: ${payload.kondisi_barang || '?'})`;
        default:
            return tipeBlock;
    }
}

module.exports = {
    generateHash,
    createBlock,
    createGenesisBlock,
    createPickupFarmBlock,
    createDeliveryProcessorBlock,
    createPickupProcessorBlock,
    createDeliveryRetailerBlock,
    validateChain,
    getTraceabilityData,
    GENESIS_PREV_HASH
};
