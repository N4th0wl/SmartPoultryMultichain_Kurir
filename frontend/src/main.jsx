import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import './styles/toast.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import DashboardLayout from './pages/DashboardLayout.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import DashboardKurir from './pages/DashboardKurir.jsx'
import DashboardPengiriman from './pages/DashboardPengiriman.jsx'
import DashboardBlockchain from './pages/DashboardBlockchain.jsx'
import DashboardSettings from './pages/DashboardSettings.jsx'
import AdminLayout from './pages/AdminLayout.jsx'
import AdminPanelUser from './pages/AdminPanelUser.jsx'
import AdminPanelBlockchain from './pages/AdminPanelBlockchain.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Toaster
            position="top-right"
            gutter={12}
            containerStyle={{
                top: 24,
                right: 24,
            }}
            toastOptions={{
                duration: 4000,
                style: {
                    background: 'linear-gradient(135deg, rgba(18, 30, 55, 0.98), rgba(12, 22, 42, 0.95))',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    fontSize: '0.95rem',
                    color: '#e8edf3',
                    maxWidth: '420px',
                },
                success: {
                    duration: 3000,
                    iconTheme: {
                        primary: '#22c55e',
                        secondary: '#ffffff',
                    },
                    style: {
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(22, 163, 74, 0.08))',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                    },
                },
                error: {
                    duration: 5000,
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#ffffff',
                    },
                    style: {
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                    },
                },
                loading: {
                    iconTheme: {
                        primary: '#3b82f6',
                        secondary: 'rgba(59, 130, 246, 0.2)',
                    },
                },
            }}
        />
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* User Dashboard Routes */}
                    <Route path="/dashboard" element={<DashboardLayout />}>
                        <Route index element={<DashboardHome />} />
                        <Route path="kurir" element={<DashboardKurir />} />
                        <Route path="pengiriman" element={<DashboardPengiriman />} />
                        <Route path="blockchain" element={<DashboardBlockchain />} />
                        <Route path="settings" element={<DashboardSettings />} />
                    </Route>

                    {/* Admin Dashboard Routes */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminPanelUser />} />
                        <Route path="blockchain" element={<AdminPanelBlockchain />} />
                        <Route path="settings" element={<DashboardSettings />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
)
