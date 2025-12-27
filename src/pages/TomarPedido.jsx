// src/pages/TomarPedido.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api";

function fmtCLP(n) {
  return Number(n || 0).toLocaleString("es-CL");
}

export default function TomarPedido() {
  const { mesa } = useParams();
  const navigate = useNavigate();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([{ id: null, nombre: "Todos" }]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  // carrito como diccionario para operaciones O(1)
  const [carrito, setCarrito] = useState({}); // { [id]: {id, nombre, precio, cantidad, notas} }

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarResumen, setMostrarResumen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [prodsRes, catsRes] = await Promise.all([
          apiFetch("/api/productos"),
          apiFetch("/api/productos/categorias"),
        ]);

        // mesero: solo disponibles
        const disponibles = (prodsRes || []).filter((p) => p.disponible);

        setProductos(disponibles);
        setCategorias([{ id: null, nombre: "Todos" }, ...(catsRes || [])]);
        setCategoriaActiva(null);
      } catch (err) {
        setError(err?.message || "Error al cargar productos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // helpers carrito
  const addOne = (p) => {
    setCarrito((prev) => {
      const cur = prev[p.id];
      const cantidad = (cur?.cantidad || 0) + 1;
      return {
        ...prev,
        [p.id]: {
          id: p.id,
          nombre: p.nombre,
          precio: Number(p.precio),
          cantidad,
          notas: cur?.notas || "",
        },
      };
    });
  };

  const subOne = (id) => {
    setCarrito((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const nextQty = cur.cantidad - 1;
      if (nextQty <= 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...cur, cantidad: nextQty } };
    });
  };

  const setNotas = (id, notas) => {
    setCarrito((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, notas } };
    });
  };

  const removeItem = (id) => {
    setCarrito((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const clearCart = () => setCarrito({});

  // derivados
  const productosFiltrados = useMemo(() => {
    if (categoriaActiva == null) return productos;
    return productos.filter((p) => p.id_categoria === categoriaActiva);
  }, [productos, categoriaActiva]);

  const itemsCarrito = useMemo(() => Object.values(carrito), [carrito]);

  const totalItems = useMemo(
    () => itemsCarrito.reduce((sum, it) => sum + (it.cantidad || 0), 0),
    [itemsCarrito]
  );

  const totalPrecio = useMemo(
    () => itemsCarrito.reduce((sum, it) => sum + (it.precio * it.cantidad), 0),
    [itemsCarrito]
  );

  async function enviarPedido() {
    if (itemsCarrito.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }

    try {
      setEnviando(true);
      setError("");

      const detalles = itemsCarrito.map((it) => ({
        id_producto: it.id,
        cantidad: it.cantidad,
        notas: it.notas || "",
        cliente_nro: 1, // por defecto
      }));

      await apiFetch("/api/comandas", {
        method: "POST",
        body: { mesa, detalles },
      });

      navigate("/mesas");
    } catch (err) {
      setError(err?.message || "Error al enviar pedido");
    } finally {
      setEnviando(false);
    }
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

        {/* Categorías (igual idea, menos lógica) */}
        <div className="categorias-tabs">
          {categorias.map((cat) => (
            <button
              key={cat.id ?? "todos"}
              className={`categoria-tab ${categoriaActiva === cat.id ? "active" : ""}`}
              onClick={() => setCategoriaActiva(cat.id)}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Productos: + / - siempre disponibles (menos taps y menos confusión) */}
        <div className="productos-grid">
          {productosFiltrados.map((p) => {
            const qty = carrito[p.id]?.cantidad || 0;

            return (
              <div key={p.id} className="producto-card">
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => addOne(p)}
                  title="Toca para agregar"
                >
                  <div className="producto-nombre">{p.nombre}</div>
                  <div className="producto-precio">${fmtCLP(p.precio)}</div>
                </div>

                <div className="producto-cantidad" style={{ marginTop: 10 }}>
                  <button
                    className="cantidad-btn"
                    onClick={() => subOne(p.id)}
                    disabled={qty === 0}
                    aria-label="Quitar uno"
                  >
                    −
                  </button>
                  <span className="cantidad-numero">{qty}</span>
                  <button
                    className="cantidad-btn"
                    onClick={() => addOne(p)}
                    aria-label="Agregar uno"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carrito flotante */}
        {totalItems > 0 && (
          <div className="carrito-flotante" onClick={() => setMostrarResumen(true)}>
            <div className="carrito-badge">{totalItems}</div>
            <span>Ver pedido</span>
            <span style={{ fontWeight: 800 }}>${fmtCLP(totalPrecio)}</span>
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
                {itemsCarrito.map((it) => (
                  <li key={it.id}>
                    <div className="item-info">
                      <div className="item-nombre">
                        {it.cantidad}x {it.nombre}
                      </div>
                      <div className="item-detalles">
                        ${fmtCLP(it.precio * it.cantidad)}
                      </div>

                      <textarea
                        className="form-control"
                        placeholder="Notas (opcional)"
                        value={it.notas}
                        onChange={(e) => setNotas(it.id, e.target.value)}
                        style={{ marginTop: 8, fontSize: 13 }}
                        rows={2}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button
                        className="btn btn-danger"
                        onClick={() => removeItem(it.id)}
                        style={{ padding: "8px 12px" }}
                      >
                        🗑️
                      </button>

                      <div className="producto-cantidad">
                        <button className="cantidad-btn" onClick={() => subOne(it.id)}>
                          −
                        </button>
                        <span className="cantidad-numero">{it.cantidad}</span>
                        <button
                          className="cantidad-btn"
                          onClick={() => {
                            // reusar addOne con "producto fake"
                            addOne({ id: it.id, nombre: it.nombre, precio: it.precio });
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div
                style={{
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: "2px solid rgba(255,255,255,0.1)",
                  fontSize: 20,
                  fontWeight: 800,
                  textAlign: "right",
                }}
              >
                Total: ${fmtCLP(totalPrecio)}
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    clearCart();
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
