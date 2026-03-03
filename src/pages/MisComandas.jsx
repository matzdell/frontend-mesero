// src/pages/MisComandas.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function MisComandas() {
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Parsear user una sola vez por render (y manejar caso vacío)
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const cargarComandas = useCallback(async () => {
    try {
      setError("");
      const data = await apiFetch("/api/comandas");

      // Filtrar solo mis comandas (del mesero actual) que no estén pagadas
      const misComandas = Array.isArray(data)
        ? data.filter((c) => c.id_mesero === user.id && c.estado !== "PAGADA")
        : [];

      setComandas(misComandas);
      setLoading(false);
    } catch (err) {
      setError(err.message || "Error al cargar comandas");
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!alive) return;
      await cargarComandas();
    };

    run();

    const interval = setInterval(() => {
      if (!alive) return;
      cargarComandas();
    }, 10000); // Actualizar cada 10s

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [cargarComandas]);

  function getBadgeClass(estado) {
    switch (estado) {
      case "PENDIENTE":
        return "badge-warning";
      case "EN_PREPARACION":
        return "badge-info";
      case "LISTO":
        return "badge-success";
      default:
        return "badge-warning";
    }
  }

  function getEstadoTexto(estado) {
    switch (estado) {
      case "PENDIENTE":
        return "Pendiente";
      case "EN_PREPARACION":
        return "En cocina";
      case "LISTO":
        return "Listo";
      default:
        return estado;
    }
  }

  if (loading) {
    return (
      <div className="app-container">
        <header className="header">
          <div className="header-content">
            <div className="header-title">
              <span className="header-icon">📋</span>
              <h1>Mis Comandas</h1>
            </div>
          </div>
        </header>
        <div className="loading">Cargando comandas...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <span className="header-icon">📋</span>
            <h1>Mis Comandas</h1>
          </div>
          <button className="logout-btn" onClick={() => navigate("/mesas")}>
            ← Volver
          </button>
        </div>
      </header>

      <div className="page">
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {comandas.length === 0 ? (
          <div className="card text-center" style={{ padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
            <h2 style={{ marginBottom: 8 }}>No tienes comandas activas</h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: 24 }}>
              Las comandas que tomes aparecerán aquí
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/mesas")}>
              Ir a tomar pedidos
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {comandas.map((comanda) => (
              <div key={comanda.id} className="card">
                <div className="flex-between" style={{ marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 800 }}>
                      Mesa {comanda.mesa}
                    </h2>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                        marginTop: 4,
                      }}
                    >
                      {new Date(comanda.creado_en).toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className={`badge ${getBadgeClass(comanda.estado)}`}>
                    {getEstadoTexto(comanda.estado)}
                  </span>
                </div>

                <ul className="item-list">
                  {comanda.detalles?.map((detalle, idx) => (
                    <li key={idx}>
                      <div className="item-info">
                        <div className="item-nombre">
                          {detalle.cantidad}x {detalle.nombre_producto}
                        </div>
                        {detalle.notas && (
                          <div className="item-detalles">💬 {detalle.notas}</div>
                        )}
                        {detalle.cliente_nro && (
                          <div className="item-detalles">
                            Cliente #{detalle.cliente_nro}
                          </div>
                        )}
                      </div>
                      <span className={`badge ${getBadgeClass(detalle.estado)}`}>
                        {getEstadoTexto(detalle.estado)}
                      </span>
                    </li>
                  ))}
                </ul>

                {comanda.estado === "LISTO" && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 16,
                      background: "rgba(16, 185, 129, 0.1)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      textAlign: "center",
                      color: "var(--color-success)",
                      fontWeight: 700,
                    }}
                  >
                    ✅ Pedido listo para servir
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
