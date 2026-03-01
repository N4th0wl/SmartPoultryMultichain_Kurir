import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { LoadingState, EmptyState, KPICard } from '../components'
import { blockchainService } from '../services'
import '../styles/Blockchain.css'

function DashboardBlockchain() {
    const [chains, setChains] = useState([])
    const [stats, setStats] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [traceData, setTraceData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [traceLoading, setTraceLoading] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [chainsData, statsData] = await Promise.all([
                blockchainService.getChains(),
                blockchainService.getStats()
            ])
            setChains(chainsData)
            setStats(statsData)
        } catch (error) {
            toast.error('Gagal memuat data blockchain')
        } finally {
            setLoading(false)
        }
    }

    const handleViewChain = async (chain) => {
        setSelectedChain(chain)
        setTraceLoading(true)
        try {
            const data = await blockchainService.getTrace(chain.KodePengiriman)
            setTraceData(data)
        } catch (error) {
            toast.error('Gagal memuat data traceability')
        } finally {
            setTraceLoading(false)
        }
    }

    const handleValidate = async () => {
        if (!selectedChain) return
        try {
            const result = await blockchainService.validate(selectedChain.KodePengiriman)
            if (result.valid) {
                toast.success(`${result.message} (${result.totalBlocks} blocks)`)
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error('Validasi gagal')
        }
    }

    if (loading) return <LoadingState />

    return (
        <div>
            <div className="page-header">
                <h2>Blockchain Traceability</h2>
            </div>

            <div className="kpi-grid">
                <KPICard label="Total Chains" value={stats?.totalChains || 0} accent />
                <KPICard label="Active Chains" value={stats?.activeChains || 0} />
                <KPICard label="Completed" value={stats?.completedChains || 0} />
                <KPICard label="Total Blocks" value={stats?.totalBlocks || 0} accent />
            </div>

            <div className="blockchain-layout">
                {/* Chain List */}
                <div className="section-card chain-list-card">
                    <h3>Supply Chain List</h3>
                    {chains.length === 0 ? (
                        <EmptyState message="Belum ada chain" icon="🔗" />
                    ) : (
                        <div className="chain-list">
                            {chains.map(c => (
                                <button
                                    key={c.IdIdentity}
                                    className={`chain-item ${selectedChain?.IdIdentity === c.IdIdentity ? 'selected' : ''}`}
                                    onClick={() => handleViewChain(c)}
                                >
                                    <div className="chain-item-top">
                                        <span className="chain-code">{c.KodeIdentity}</span>
                                        <span className={`badge ${c.StatusChain === 'ACTIVE' ? 'badge-active' : c.StatusChain === 'COMPLETED' ? 'badge-completed' : 'badge-failed'}`}>
                                            {c.StatusChain}
                                        </span>
                                    </div>
                                    <div className="chain-item-bottom">
                                        <span>Pengiriman: {c.KodePengiriman}</span>
                                        <span>{c.TotalBlocks} blocks</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Trace Detail */}
                <div className="section-card chain-detail-card">
                    {!selectedChain ? (
                        <div className="chain-placeholder">
                            <span>🔍</span>
                            <p>Pilih chain untuk melihat detail</p>
                        </div>
                    ) : traceLoading ? (
                        <LoadingState message="Memuat traceability..." />
                    ) : traceData ? (
                        <div className="trace-detail">
                            <div className="trace-header">
                                <div>
                                    <h3>{traceData.chain.kodeIdentity}</h3>
                                    <p className="trace-sub">{traceData.chain.perusahaanKurir} • {traceData.nodeDescription}</p>
                                </div>
                                <button className="ghost-button" onClick={handleValidate}>🔒 Validasi Chain</button>
                            </div>

                            <div className="trace-validation">
                                {traceData.validation?.valid ? (
                                    <div className="validation-ok">
                                        <span>✓</span> {traceData.validation.message}
                                    </div>
                                ) : (
                                    <div className="validation-err">
                                        <span>✕</span> {traceData.validation?.message || 'Unknown'}
                                    </div>
                                )}
                            </div>

                            <h4 className="trace-section-title">Timeline</h4>
                            <div className="trace-timeline">
                                {traceData.timeline?.map((t, i) => (
                                    <div key={i} className="timeline-item">
                                        <div className="timeline-dot" />
                                        <div className="timeline-content">
                                            <div className="timeline-top">
                                                <span className={`badge badge-block-${t.type.toLowerCase()}`}>{t.type}</span>
                                                <span className="timeline-hash" title={traceData.blocks?.[i]?.CurrentHash}>#{t.hash}...</span>
                                            </div>
                                            <p className="timeline-summary">{t.summary}</p>
                                            <span className="timeline-time">{new Date(t.timestamp).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h4 className="trace-section-title">Block Details</h4>
                            <div className="block-list">
                                {traceData.blocks?.map((b, i) => {
                                    let payload = b.DataPayload
                                    if (typeof payload === 'string') {
                                        try { payload = JSON.parse(payload) } catch (e) { /* noop */ }
                                    }
                                    return (
                                        <div key={i} className="block-card">
                                            <div className="block-card-header">
                                                <span className="block-index">Block #{b.BlockIndex}</span>
                                                <span className="block-type">{b.TipeBlock}</span>
                                            </div>
                                            <div className="block-hash-row">
                                                <span className="hash-label">Prev:</span>
                                                <span className="hash-value">{b.PreviousHash?.substring(0, 24)}...</span>
                                            </div>
                                            <div className="block-hash-row">
                                                <span className="hash-label">Hash:</span>
                                                <span className="hash-value">{b.CurrentHash?.substring(0, 24)}...</span>
                                            </div>
                                            <div className="block-payload">
                                                <pre>{JSON.stringify(payload, null, 2)}</pre>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

export default DashboardBlockchain
