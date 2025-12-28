// src/pages/LoginMesero.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function LoginMesero() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError("Completa todos los campos");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      if (data.role !== "Mesero" && data.role !== "Jefe") {
        setError("Solo meseros pueden acceder a esta aplicación");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      
      console.log("Login exitoso:", data);
      navigate("/mesas");
      
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setError(err.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* LOGO Y TÍTULO */}
        <div className="login-header">
          <div className="login-logo">🍽️</div>
          <h1 className="login-title">RestoApp</h1>
          <p className="login-subtitle">Panel de Meseros</p>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📧</span>
              Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="mesero@restaurante.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🔒</span>
              Contraseña
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              <>
                <span>✓</span>
                Iniciar sesión
              </>
            )}
          </button>
        </form>

        {/* FOOTER */}
        <div className="login-footer">
          <p className="login-info">
            💡 Usa tu email y contraseña para acceder
          </p>
          
          {/* DEBUG INFO - QUITAR EN PRODUCCIÓN */}
          <details style={{ marginTop: '20px', fontSize: '12px', color: '#64748b' }}>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
              🔧 Credenciales de prueba
            </summary>
            <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'left' }}>
              <p style={{ margin: '4px 0', fontWeight: '600' }}>Mesero 1:</p>
              <p style={{ margin: '2px 0 8px 0', fontSize: '11px' }}>mesero1@local / mesero123</p>
              
              <p style={{ margin: '8px 0 4px 0', fontWeight: '600' }}>Mesero 2:</p>
              <p style={{ margin: '2px 0 8px 0', fontSize: '11px' }}>mesero2@local / mesero123</p>
              
              <p style={{ margin: '8px 0 4px 0', fontWeight: '600' }}>Mesero 3:</p>
              <p style={{ margin: '2px 0', fontSize: '11px' }}>mesero3@local / mesero123</p>
            </div>
          </details>
        </div>
      </div>

      {/* ESTILOS */}
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
        }

        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 20px;
          margin: 0;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          background: rgba(30, 41, 59, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .login-logo {
          font-size: 72px;
          margin-bottom: 16px;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .login-title {
          font-size: 32px;
          font-weight: 800;
          color: white;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subtitle {
          font-size: 15px;
          color: #94a3b8;
          margin: 0;
          font-weight: 500;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          color: #fca5a5;
          font-size: 14px;
          font-weight: 600;
          animation: shake 0.3s;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .label-icon {
          font-size: 16px;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(15, 23, 42, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(15, 23, 42, 0.7);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .form-input::placeholder {
          color: #64748b;
        }

        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 12px;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          margin-top: 32px;
          text-align: center;
        }

        .login-info {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        details summary {
          margin-bottom: 0;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 24px;
          }

          .login-logo {
            font-size: 60px;
          }

          .login-title {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}
