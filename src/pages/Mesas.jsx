// src/pages/Mesas.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function Mesas() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    cargarMesas();
  }, []);

  async function cargarMesas() {
    try {
      setLoading(true);
      // Obtener comandas activas para saber qué mesas están ocupadas
      const comandas = await apiFetch("/api/comandas");
      
      // Crear array de 20 mesas
      const todasMesas = Array.from({ length: 20 }, (_, i) => i + 1);
      
      // Marcar mesas ocupadas
      const mesasConEstado = todasMesas.map(num => {
        const comanda = comandas.find(c => c.mesa === num.toString() && c.estado !== "PAGADA");
        return {
          numero: num,
          ocupada: !!comanda,
          idComanda: comanda?.id || null,
        };
      });

      setMesas(mesasConEstado);
    } catch (err) {
      setError(err.message || "Error al cargar mesas");
    } finally {
      setLoading(false);
    }
  }

  function seleccionarMesa(mesa) {
    navigate(`/tomar-pedido/${mesa.numero}`);
  }

  function logout() {
    localStorage.clear();
    navigate("/");
  }

  if (loading) {
    return (
      <div className="app-container">
        <header className="header">
          <div className="header-content">
            <div className="header-title">
              <span className="header-icon">🍽️</span>
              <h1>RestoApp</h1>
            </div>
          </div>
        </header>
        <div className="loading">Cargando mesas...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <span className="header-icon">🍽️</span>
            <h1>RestoApp</h1>
          </div>
          <div className="header-user">
            <span style={{ fontSize: 14, fontWeight: 600 }}>{user.email}</span>
            <button className="logout-btn" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="page">
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2>Selecciona una mesa</h2>
            <p>Toca una mesa para tomar un pedido</p>
          </div>

          <div className="mesas-grid">
            {mesas.map((mesa) => (
              <div
                key={mesa.numero}
                className={`mesa-card ${mesa.ocupada ? "ocupada" : ""}`}
                onClick={() => seleccionarMesa(mesa)}
              >
                <div className="mesa-numero">{mesa.numero}</div>
                <div className={`mesa-estado ${mesa.ocupada ? "ocupada" : "disponible"}`}>
                  {mesa.ocupada ? "Ocupada" : "Disponible"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate("/mis-comandas")}
          >
            📋 Ver mis comandas activas
          </button>
        </div>
      </div>
    </div>
  );
}
