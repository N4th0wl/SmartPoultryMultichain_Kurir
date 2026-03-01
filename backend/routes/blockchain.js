const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { LedgerKurir, BlockchainIdentity, Pengiriman, PerusahaanKurir, sequelize } = require('../models');
const { validateChain, getTraceabilityData } = require('../utils/blockchainHelper');

// GET /api/blockchain/chains - Get all blockchain chains for company
router.get('/chains', authMiddleware, async (req, res) => {
    try {
        const chains = await BlockchainIdentity.findAll({
            where: { KodePerusahaan: req.user.kodePerusahaan },
            include: [{ model: Pengiriman }],
            order: [['CreatedAt', 'DESC']]
        });
        res.json(chains);
    } catch (error) {
        console.error('Get chains error:', error);
        res.status(500).json({ error: 'Failed to get blockchain chains' });
    }
});

// GET /api/blockchain/ledger - Get all blocks for company
router.get('/ledger', adminMiddleware, async (req, res) => {
    try {
        const blocks = await LedgerKurir.findAll({
            where: { KodePerusahaan: req.user.kodePerusahaan },
            order: [['CreatedAt', 'DESC']],
            limit: 100
        });
        res.json(blocks);
    } catch (error) {
        console.error('Get ledger error:', error);
        res.status(500).json({ error: 'Failed to get ledger' });
    }
});

// GET /api/blockchain/trace/:kodePengiriman - Get full traceability for a shipment
router.get('/trace/:kodePengiriman', authMiddleware, async (req, res) => {
    try {
        const traceData = await getTraceabilityData(sequelize, req.params.kodePengiriman);

        if (!traceData) {
            return res.status(404).json({ error: 'No blockchain data found for this shipment' });
        }

        res.json(traceData);
    } catch (error) {
        console.error('Get traceability error:', error);
        res.status(500).json({ error: 'Failed to get traceability data' });
    }
});

// GET /api/blockchain/validate/:kodePengiriman - Validate chain for a shipment
router.get('/validate/:kodePengiriman', authMiddleware, async (req, res) => {
    try {
        const result = await validateChain(sequelize, req.params.kodePengiriman);
        res.json(result);
    } catch (error) {
        console.error('Validate chain error:', error);
        res.status(500).json({ error: 'Failed to validate chain' });
    }
});

// GET /api/blockchain/stats - Get blockchain statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const [totalChains] = await sequelize.query(
            `SELECT COUNT(*) as total FROM BlockchainIdentity WHERE KodePerusahaan = :kodePerusahaan`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePerusahaan: req.user.kodePerusahaan } }
        );

        const [activeChains] = await sequelize.query(
            `SELECT COUNT(*) as total FROM BlockchainIdentity WHERE KodePerusahaan = :kodePerusahaan AND StatusChain = 'ACTIVE'`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePerusahaan: req.user.kodePerusahaan } }
        );

        const [completedChains] = await sequelize.query(
            `SELECT COUNT(*) as total FROM BlockchainIdentity WHERE KodePerusahaan = :kodePerusahaan AND StatusChain = 'COMPLETED'`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePerusahaan: req.user.kodePerusahaan } }
        );

        const [totalBlocks] = await sequelize.query(
            `SELECT COUNT(*) as total FROM ledger_kurir WHERE KodePerusahaan = :kodePerusahaan`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePerusahaan: req.user.kodePerusahaan } }
        );

        res.json({
            totalChains: totalChains?.total || 0,
            activeChains: activeChains?.total || 0,
            completedChains: completedChains?.total || 0,
            totalBlocks: totalBlocks?.total || 0
        });
    } catch (error) {
        console.error('Get blockchain stats error:', error);
        res.status(500).json({ error: 'Failed to get blockchain stats' });
    }
});

module.exports = router;
