import { useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const handleLogoClick = (event) => {
        event.preventDefault()
        document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })
        setIsMenuOpen(false)
    }

    return (
        <div className="page">
            <nav className="topbar">
                <a href="#home" className="brand brand-link" onClick={handleLogoClick}>
                    <p className="brand-name">SmartPoultry Kurir</p>
                </a>
                <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                    <a href="#home" onClick={() => setIsMenuOpen(false)}>
                        <span className="nav-link-text">Home</span>
                        <span className="nav-link-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a href="#about" onClick={() => setIsMenuOpen(false)}>
                        <span className="nav-link-text">About</span>
                        <span className="nav-link-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a href="#services" onClick={() => setIsMenuOpen(false)}>
                        <span className="nav-link-text">Services</span>
                        <span className="nav-link-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a href="#blockchain" onClick={() => setIsMenuOpen(false)}>
                        <span className="nav-link-text">Blockchain</span>
                        <span className="nav-link-arrow" aria-hidden="true">↗</span>
                    </a>
                    <Link className="btn btn-primary topbar-btn mobile-only" to="/register" onClick={() => setIsMenuOpen(false)}>
                        Masuk / Daftar
                    </Link>
                </div>
                <Link className="btn btn-primary topbar-btn desktop-only" to="/register">
                    Masuk / Daftar
                </Link>
                <button
                    className={`hamburger ${isMenuOpen ? 'is-active' : ''}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className="hamburger-box">
                        <span className="hamburger-inner"></span>
                    </span>
                </button>
            </nav>

            <header id="home" className="hero">
                <div className="hero-content">
                    <h1>
                        Layanan pengiriman terpercaya untuk supply chain peternakan unggas modern.
                    </h1>
                    <p className="hero-subtitle">
                        Tracking real-time, blockchain traceability, dan manajemen pengiriman end-to-end
                        dari peternakan ke processor dan processor ke retailer.
                    </p>
                    <div className="hero-actions">
                        <Link className="btn btn-primary" to="/register">
                            Mulai Sekarang
                        </Link>
                        <a className="btn btn-ghost" href="#services">
                            Pelajari Lebih Lanjut
                        </a>
                    </div>
                    <div className="hero-stats-row">
                        <div className="stat-item">
                            <span className="stat-value">100%</span>
                            <span className="stat-label">Traceable</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">24/7</span>
                            <span className="stat-label">Tracking</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">🔗</span>
                            <span className="stat-label">Blockchain</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="hero-chain-visual">
                        <div className="chain-node farm">🏠 Farm</div>
                        <div className="chain-arrow">→</div>
                        <div className="chain-node kurir active">🚛 Kurir</div>
                        <div className="chain-arrow">→</div>
                        <div className="chain-node processor">🏭 Processor</div>
                        <div className="chain-arrow">→</div>
                        <div className="chain-node kurir active">🚛 Kurir</div>
                        <div className="chain-arrow">→</div>
                        <div className="chain-node retailer">🏪 Retailer</div>
                    </div>
                </div>
            </header>

            <main>
                <section id="about" className="section about">
                    <div className="section-heading">
                        <span>About Us</span>
                        <h2>Mitra logistik terpercaya untuk industri peternakan.</h2>
                        <p>
                            Kami menyediakan layanan pengiriman yang aman dan terintegrasi blockchain
                            untuk memastikan kualitas produk peternakan tetap terjaga dari hulu ke hilir.
                        </p>
                    </div>
                    <div className="about-grid">
                        <div className="about-card">
                            <h3>🚛 Pengiriman Aman</h3>
                            <p>
                                Armada terpercaya dengan monitoring real-time untuk menjaga
                                kualitas produk selama pengiriman.
                            </p>
                        </div>
                        <div className="about-card">
                            <h3>🔗 Blockchain Tracing</h3>
                            <p>
                                Setiap pengiriman tercatat dalam blockchain untuk transparansi
                                dan traceability penuh.
                            </p>
                        </div>
                        <div className="about-card highlight">
                            <h3>📋 Dokumentasi Digital</h3>
                            <p>
                                Bukti tanda terima dan nota pengiriman digital yang valid
                                dan tidak dapat dimanipulasi.
                            </p>
                        </div>
                    </div>
                </section>

                <section id="services" className="section services">
                    <div className="section-heading">
                        <span>Our Services</span>
                        <h2>Layanan pengiriman end-to-end untuk supply chain unggas.</h2>
                    </div>
                    <div className="service-grid">
                        <article className="service-card">
                            <h3>Farm → Processor</h3>
                            <p>Pengiriman ayam hidup dari peternakan ke fasilitas processing.</p>
                            <ul>
                                <li>Bukti tanda terima peternakan</li>
                                <li>Monitoring kondisi selama perjalanan</li>
                                <li>Nota pengiriman ke processor</li>
                            </ul>
                        </article>
                        <article className="service-card">
                            <h3>Processor → Retailer</h3>
                            <p>Pengiriman produk olahan dari processor ke retailer.</p>
                            <ul>
                                <li>Pickup dari facility processor</li>
                                <li>Cold chain monitoring</li>
                                <li>Konfirmasi penerimaan retailer</li>
                            </ul>
                        </article>
                        <article className="service-card">
                            <h3>Blockchain Traceability</h3>
                            <p>Setiap langkah pengiriman tercatat dalam blockchain.</p>
                            <ul>
                                <li>Genesis block saat pengiriman dibuat</li>
                                <li>Pickup & delivery block otomatis</li>
                                <li>Chain validation & integrity check</li>
                            </ul>
                        </article>
                    </div>
                </section>

                <section id="blockchain" className="section blockchain-section">
                    <div className="section-heading">
                        <span>Blockchain</span>
                        <h2>Transparansi penuh dengan teknologi blockchain.</h2>
                        <p>
                            Setiap pengiriman memiliki chain sendiri yang mencatat seluruh
                            perjalanan dari asal hingga tujuan dengan hash yang tidak dapat diubah.
                        </p>
                    </div>
                    <div className="blockchain-demo">
                        <div className="demo-block">
                            <div className="demo-block-header">Block #0 - GENESIS</div>
                            <div className="demo-block-hash">Hash: a3f8c2...</div>
                            <div className="demo-block-data">Pengiriman dimulai</div>
                        </div>
                        <div className="demo-connector">→</div>
                        <div className="demo-block">
                            <div className="demo-block-header">Block #1 - PICKUP</div>
                            <div className="demo-block-hash">Prev: a3f8c2...</div>
                            <div className="demo-block-data">Barang diterima kurir</div>
                        </div>
                        <div className="demo-connector">→</div>
                        <div className="demo-block">
                            <div className="demo-block-header">Block #2 - DELIVERY</div>
                            <div className="demo-block-hash">Prev: b7d4e1...</div>
                            <div className="demo-block-data">✓ Diterima tujuan</div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="footer">
                <div className="footer-main">
                    <div className="footer-brand">
                        <h3>SmartPoultry Kurir</h3>
                        <p>Platform pengiriman terintegrasi untuk supply chain peternakan unggas modern.</p>
                    </div>
                    <div className="footer-contact">
                        <h4>Kontak Kami</h4>
                        <p>Jl. Logistik No. 5, Bandung</p>
                        <p>kurir@smartpoultry.id</p>
                        <p>+62 812 3456 7890</p>
                    </div>
                    <div className="footer-nav">
                        <h4>Navigasi</h4>
                        <a href="#home">Home</a>
                        <a href="#about">About</a>
                        <a href="#services">Services</a>
                        <a href="#blockchain">Blockchain</a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 SmartPoultry Kurir. Semua hak dilindungi.</p>
                </div>
            </footer>
        </div>
    )
}

export default App
