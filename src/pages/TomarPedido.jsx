// src/pages/TomarPedido.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const MAX_PERSONAS = 10; // ajusta si quieres
const MIN_PERSONAS = 1;

export default function TomarPedido() {
  const { mesa } = useParams();
  const navigate = useNavigate();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  // ✅ Carrito por persona: { 1: [items...], 2: [items...], ... }
  const [carritoPorPersona, setCarritoPorPersona] = useState({ 1: [] });
  const [personaActiva, setPersonaActiva] = useState(1);

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarResumen, setMostrarResumen] = useState(false);

  // 👇 OBTENER USER DEL LOCALSTORAGE
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarProductos() {
    try {
      setLoading(true);
      const [prodsRes, catsRes] = await Promise.all([
        apiFetch("/api/productos"),
        apiFetch("/api/productos/categorias"),
      ]);

      setProductos(prodsRes.filter((p) => p.disponible));
      setCategorias([{ id: null, nombre: "Todos" }, ...catsRes]);
      setCategoriaActiva(null);
    } catch (err) {
      setError(err.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }

  // --------------------------
  // Helpers carrito por persona
  // --------------------------
  function getCarritoPersona(persona) {
    return carritoPorPersona[persona] || [];
  }

  function setCarritoPersona(persona, updater) {
    setCarritoPorPersona((prev) => {
      const actual = prev[persona] || [];
      const nuevo = typeof updater === "function" ? updater(actual) : updater;
      return { ...prev, [persona]: nuevo };
    });
  }

  function agregarAlCarrito(producto) {
    const p = personaActiva;
    setCarritoPersona(p, (carrito) => {
      const existe = carrito.find((item) => item.id === producto.id);
      if (existe) {
        return carrito.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...carrito, { ...producto, cantidad: 1, notas: "" }];
    });
  }

  function cambiarCantidad(persona, productoId, delta) {
    setCarritoPersona(persona, (carrito) =>
      carrito
        .map((item) => {
          if (item.id !== productoId) return item;
          const nuevaCantidad = item.cantidad + delta;
          return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
        })
        .filter(Boolean)
    );
  }

  function cambiarNotas(persona, productoId, notas) {
    setCarritoPersona(persona, (carrito) =>
      carrito.map((item) => (item.id === productoId ? { ...item, notas } : item))
    );
  }

  function eliminarDelCarrito(persona, productoId) {
    setCarritoPersona(persona, (carrito) => carrito.filter((item) => item.id !== productoId));
  }

  function limpiarTodo() {
    setCarritoPorPersona({ 1: [] });
    setPersonaActiva(1);
    setMostrarResumen(false);
  }

  function agregarPersona() {
    setCarritoPorPersona((prev) => {
      const personas = Object.keys(prev).map(Number).sort((a, b) => a - b);
      const last = personas[personas.length - 1] || 1;
      if (personas.length >= MAX_PERSONAS) return prev;
      const nueva = last + 1;
      return { ...prev, [nueva]: [] };
    });

    // setear activa a la nueva (si existe)
    setPersonaActiva((prevActiva) => {
      const personas = Object.keys(carritoPorPersona).map(Number);
      const next = Math.max(...personas, 1) + 1;
      return Math.min(next, MAX_PERSONAS);
    });
  }

  function quitarPersona(persona) {
    setCarritoPorPersona((prev) => {
      const personas = Object.keys(prev).map(Number).sort((a, b) => a - b);
      if (personas.length <= MIN_PERSONAS) return prev;

      const copia = { ...prev };
      delete copia[persona];

      // reindexar para que queden 1..n (opcional pero más limpio)
      const ordenadas = Object.keys(copia)
        .map(Number)
        .sort((a, b) => a - b);

      const reindexed = {};
      ordenadas.forEach((oldPersona, idx) => {
        reindexed[idx + 1] = copia[oldPersona];
      });

      return reindexed;
    });

    setPersonaActiva((activa) => (activa === persona ? 1 : activa));
  }

  // --------------------------
  // Enviar pedido agrupado
  // --------------------------
  async function enviarPedido() {
    // juntar todos los items de todas las personas
    const personas = Object.keys(carritoPorPersona).map(Number).sort((a, b) => a - b);
    const hayItems = personas.some((p) => (carritoPorPersona[p] || []).length > 0);

    if (!hayItems) {
      setError("Agrega al menos un producto");
      return;
    }

    try {
      setEnviando(true);
      setError("");

      const detalles = personas.flatMap((p) =>
        (carritoPorPersona[p] || []).map((item) => ({
          id_producto: item.id,
          cantidad: item.cantidad,
          notas: item.notas || "",
          cliente_nro: p, // ✅ ahora sí
        }))
      );

      await apiFetch("/api/comandas", {
        method: "POST",
        body: {
          mesa: mesa.toString(),
          detalles,
          id_mesero: user.id,
        },
      });

      alert("✅ Pedido enviado a cocina exitosamente");
      navigate("/mesas");
    } catch (err) {
      console.error("Error al enviar pedido:", err);
      setError(err.message || "Error al enviar pedido");
    } finally {
      setEnviando(false);
    }
  }

  // --------------------------
  // UI helpers / cálculos
  // --------------------------
  const productosFiltrados =
    categoriaActiva === null
      ? productos
      : productos.filter((p) => p.id_categoria === categoriaActiva);

  const personasOrdenadas = useMemo(
    () => Object.keys(carritoPorPersona).map(Number).sort((a, b) => a - b),
    [carritoPorPersona]
  );

  const carritoActivo = getCarritoPersona(personaActiva);

  const totalItems = useMemo(() => {
    return personasOrdenadas.reduce((sum, p) => {
      const items = carritoPorPersona[p] || [];
      return sum + items.reduce((s, it) => s + it.cantidad, 0);
    }, 0);
  }, [carritoPorPersona, personasOrdenadas]);

  const totalPrecio = useMemo(() => {
    return personasOrdenadas.reduce((sum, p) => {
      const items = carritoPorPersona[p] || [];
      return sum + items.reduce((s, it) => s + Number(it.precio) * it.cantidad, 0);
    }, 0);
  }, [carritoPorPersona, personasOrdenadas]);

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

        {/* ✅ Selector de personas (comensales) */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <strong style={{ opacity: 0.9 }}>Persona:</strong>

          {personasOrdenadas.map((p) => (
            <button
              key={p}
              className={`categoria-tab ${personaActiva === p ? "active" : ""}`}
              onClick={() => setPersonaActiva(p)}
              style={{ padding: "8px 12px" }}
              title={`Seleccionar Persona ${p}`}
            >
              {p}
              {personasOrdenadas.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    quitarPersona(p);
                  }}
                  style={{
                    marginLeft: 8,
                    fontWeight: 900,
                    opacity: 0.8,
                    cursor: "pointer",
                  }}
                  title="Quitar persona"
                >
                  ×
                </span>
              )}
            </button>
          ))}

          <button
            className="btn btn-success"
            onClick={agregarPersona}
            disabled={personasOrdenadas.length >= MAX_PERSONAS}
            style={{ padding: "8px 12px" }}
            title="Agregar persona"
          >
            + Persona
          </button>

          <div style={{ marginLeft: "auto", opacity: 0.85, fontWeight: 700 }}>
            Agregando a Persona {personaActiva}
          </div>
        </div>

        {/* Categorías */}
        <div className="categorias-tabs">
          {categorias.map((cat) => (
            <button
              key={cat.id || "todos"}
              className={`categoria-tab ${categoriaActiva === cat.id ? "active" : ""}`}
              onClick={() => setCategoriaActiva(cat.id)}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Productos */}
        <div className="productos-grid">
          {productosFiltrados.map((producto) => {
            const enCarrito = carritoActivo.find((item) => item.id === producto.id);

            return (
              <div
                key={producto.id}
                className="producto-card"
                onClick={() => agregarAlCarrito(producto)}
                title={`Agregar a Persona ${personaActiva}`}
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
                        cambiarCantidad(personaActiva, producto.id, -1);
                      }}
                    >
                      −
                    </button>
                    <span className="cantidad-numero">{enCarrito.cantidad}</span>
                    <button
                      className="cantidad-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        cambiarCantidad(personaActiva, producto.id, 1);
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
        {totalItems > 0 && (
          <div className="carrito-flotante" onClick={() => setMostrarResumen(true)}>
            <div className="carrito-badge">{totalItems}</div>
            <span>Ver pedido</span>
            <span style={{ fontWeight: 800 }}>${totalPrecio.toLocaleString("es-CL")}</span>
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

              <div style={{ marginBottom: 12 }}>
                <strong>Mesa: {mesa}</strong>
              </div>

              {/* ✅ Resumen por persona */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {personasOrdenadas.map((p) => {
                  const items = carritoPorPersona[p] || [];
                  if (items.length === 0) return null;

                  const subtotal = items.reduce(
                    (s, it) => s + Number(it.precio) * it.cantidad,
                    0
                  );

                  return (
                    <div
                      key={p}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>Persona {p}</h3>
                        <div style={{ marginLeft: "auto", fontWeight: 800 }}>
                          Subtotal: ${subtotal.toLocaleString("es-CL")}
                        </div>
                      </div>

                      <ul className="item-list" style={{ marginTop: 10 }}>
                        {items.map((item) => (
                          <li key={`${p}-${item.id}`}>
                            <div className="item-info">
                              <div className="item-nombre">
                                {item.cantidad}x {item.nombre}
                              </div>
                              <div className="item-detalles">
                                ${Number(item.precio * item.cantidad).toLocaleString("es-CL")}
                              </div>

                              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <button
                                  className="cantidad-btn"
                                  onClick={() => cambiarCantidad(p, item.id, -1)}
                                  title="Bajar"
                                >
                                  −
                                </button>
                                <button
                                  className="cantidad-btn"
                                  onClick={() => cambiarCantidad(p, item.id, 1)}
                                  title="Subir"
                                >
                                  +
                                </button>
                              </div>

                              <textarea
                                className="form-control"
                                placeholder="Notas (opcional)"
                                value={item.notas}
                                onChange={(e) => cambiarNotas(p, item.id, e.target.value)}
                                style={{ marginTop: 8, fontSize: 13 }}
                                rows={2}
                              />
                            </div>

                            <button
                              className="btn btn-danger"
                              onClick={() => eliminarDelCarrito(p, item.id)}
                              style={{ padding: "8px 12px" }}
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

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
                Total mesa: ${totalPrecio.toLocaleString("es-CL")}
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button
                  className="btn btn-danger"
                  onClick={limpiarTodo}
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
