// src/pages/TomarPedido.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function TomarPedido() {
  const { mesa } = useParams();
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarResumen, setMostrarResumen] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    try {
      setLoading(true);
      const [prodsRes, catsRes] = await Promise.all([
        apiFetch("/api/productos"),
        apiFetch("/api/productos/categorias"),
      ]);

      setProductos(prodsRes.filter(p => p.disponible));
      setCategorias([{ id: null, nombre: "Todos" }, ...catsRes]);
      setCategoriaActiva(null);
    } catch (err) {
      setError(err.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }

  function agregarAlCarrito(producto) {
    const existe = carrito.find(item => item.id === producto.id);
    
    if (existe) {
      setCarrito(carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1, notas: "" }]);
    }
  }

  function cambiarCantidad(productoId, delta) {
    setCarrito(carrito.map(item => {
      if (item.id === productoId) {
        const nuevaCantidad = item.cantidad + delta;
        return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
      }
      return item;
    }).filter(Boolean));
  }

  function cambiarNotas(productoId, notas) {
    setCarrito(carrito.map(item =>
      item.id === productoId ? { ...item, notas } : item
    ));
  }

  function eliminarDelCarrito(productoId) {
    setCarrito(carrito.filter(item => item.id !== productoId));
  }

  async function enviarPedido() {
    if (carrito.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }

    try {
      setEnviando(true);
      setError("");

      const detalles = carrito.map(item => ({
        id_producto: item.id,
        cantidad: item.cantidad,
        notas: item.notas || "",
        cliente_nro: 1, // Por defecto cliente 1
      }));

      await apiFetch("/api/comandas", {
        method: "POST",
        body: {
          mesa,
          detalles,
        },
      });

      // Éxito
      navigate("/mesas");
    } catch (err) {
      setError(err.message || "Error al enviar pedido");
    } finally {
      setEnviando(false);
    }
  }

  const productosFiltrados = categoriaActiva === null
    ? productos
    : productos.filter(p => p.id_categoria === categoriaActiva);

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

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
        <div className="loading">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <span className="header-icon">🍽️</span>
            <h1>Mesa {mesa}</h1>
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

        {/* Categorías */}
        <div className="categorias-tabs">
          {categorias.map(cat => (
            <button
              key={cat.id || 'todos'}
              className={`categoria-tab ${categoriaActiva === cat.id ? 'active' : ''}`}
              onClick={() => setCategoriaActiva(cat.id)}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Productos */}
        <div className="productos-grid">
          {productosFiltrados.map(producto => {
            const enCarrito = carrito.find(item => item.id === producto.id);
            
            return (
              <div
                key={producto.id}
                className="producto-card"
                onClick={() => agregarAlCarrito(producto)}
              >
                <div className="producto-nombre">{producto.nombre}</div>
                <div className="producto-precio">
                  ${Number(producto.precio).toLocaleString("es-CL")}
                </div>
                
                {enCarrito && (
                  <div className="producto-cantidad">
                    <button
                      className="cantidad-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        cambiarCantidad(producto.id, -1);
                      }}
                    >
                      −
                    </button>
                    <span className="cantidad-numero">{enCarrito.cantidad}</span>
                    <button
                      className="cantidad-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        cambiarCantidad(producto.id, 1);
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Carrito flotante */}
        {carrito.length > 0 && (
          <div className="carrito-flotante" onClick={() => setMostrarResumen(true)}>
            <div className="carrito-badge">{totalItems}</div>
            <span>Ver pedido</span>
            <span style={{ fontWeight: 800 }}>
              ${totalPrecio.toLocaleString("es-CL")}
            </span>
          </div>
        )}

        {/* Modal resumen */}
        {mostrarResumen && (
          <div className="modal-overlay" onClick={() => setMostrarResumen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Resumen del pedido</h2>
                <button className="modal-close" onClick={() => setMostrarResumen(false)}>
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <strong>Mesa: {mesa}</strong>
              </div>

              <ul className="item-list">
                {carrito.map(item => (
                  <li key={item.id}>
                    <div className="item-info">
                      <div className="item-nombre">
                        {item.cantidad}x {item.nombre}
                      </div>
                      <div className="item-detalles">
                        ${Number(item.precio * item.cantidad).toLocaleString("es-CL")}
                      </div>
                      <textarea
                        className="form-control"
                        placeholder="Notas (opcional)"
                        value={item.notas}
                        onChange={(e) => cambiarNotas(item.id, e.target.value)}
                        style={{ marginTop: 8, fontSize: 13 }}
                        rows={2}
                      />
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => eliminarDelCarrito(item.id)}
                      style={{ padding: "8px 12px" }}
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>

              <div style={{ 
                marginTop: 20, 
                paddingTop: 20, 
                borderTop: "2px solid rgba(255,255,255,0.1)",
                fontSize: 20,
                fontWeight: 800,
                textAlign: "right"
              }}>
                Total: ${totalPrecio.toLocaleString("es-CL")}
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setCarrito([]);
                    setMostrarResumen(false);
                  }}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-success"
                  onClick={enviarPedido}
                  disabled={enviando}
                  style={{ flex: 2 }}
                >
                  {enviando ? "Enviando..." : "Enviar a cocina"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
