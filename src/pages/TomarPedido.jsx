// src/pages/TomarPedido.jsx - MEJORADO CON CLIENTES INDIVIDUALES
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function TomarPedido() {
  const { mesa } = useParams();
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  
  // 🆕 NUEVO: Gestión de clientes y pedidos separados
  const [clientes, setClientes] = useState([
    { id: 1, nombre: "Cliente 1", pedido: [] }
  ]);
  const [clienteActivo, setClienteActivo] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarResumen, setMostrarResumen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

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

  // 🆕 AGREGAR NUEVO CLIENTE
  function agregarCliente() {
    const nuevoId = Math.max(...clientes.map(c => c.id)) + 1;
    setClientes([...clientes, { 
      id: nuevoId, 
      nombre: `Cliente ${nuevoId}`, 
      pedido: [] 
    }]);
    setClienteActivo(nuevoId);
  }

  // 🆕 ELIMINAR CLIENTE
  function eliminarCliente(clienteId) {
    if (clientes.length === 1) {
      alert("Debe haber al menos un cliente");
      return;
    }
    
    if (window.confirm("¿Eliminar este cliente y su pedido?")) {
      const nuevosClientes = clientes.filter(c => c.id !== clienteId);
      setClientes(nuevosClientes);
      if (clienteActivo === clienteId) {
        setClienteActivo(nuevosClientes[0].id);
      }
    }
  }

  // 🆕 AGREGAR AL PEDIDO DEL CLIENTE ACTIVO
  function agregarAlPedido(producto) {
    setClientes(clientes.map(cliente => {
      if (cliente.id !== clienteActivo) return cliente;
      
      const existe = cliente.pedido.find(item => item.id === producto.id);
      
      if (existe) {
        return {
          ...cliente,
          pedido: cliente.pedido.map(item =>
            item.id === producto.id
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          )
        };
      } else {
        return {
          ...cliente,
          pedido: [...cliente.pedido, { ...producto, cantidad: 1, notas: "" }]
        };
      }
    }));
  }

  // 🆕 CAMBIAR CANTIDAD EN PEDIDO DEL CLIENTE
  function cambiarCantidad(clienteId, productoId, delta) {
    setClientes(clientes.map(cliente => {
      if (cliente.id !== clienteId) return cliente;
      
      return {
        ...cliente,
        pedido: cliente.pedido.map(item => {
          if (item.id === productoId) {
            const nuevaCantidad = item.cantidad + delta;
            return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
          }
          return item;
        }).filter(Boolean)
      };
    }));
  }

  // 🆕 CAMBIAR NOTAS
  function cambiarNotas(clienteId, productoId, notas) {
    setClientes(clientes.map(cliente => {
      if (cliente.id !== clienteId) return cliente;
      
      return {
        ...cliente,
        pedido: cliente.pedido.map(item =>
          item.id === productoId ? { ...item, notas } : item
        )
      };
    }));
  }

  // 🆕 ELIMINAR PRODUCTO DEL PEDIDO
  function eliminarDelPedido(clienteId, productoId) {
    setClientes(clientes.map(cliente => {
      if (cliente.id !== clienteId) return cliente;
      
      return {
        ...cliente,
        pedido: cliente.pedido.filter(item => item.id !== productoId)
      };
    }));
  }

  async function enviarPedido() {
    const totalItems = clientes.reduce((sum, c) => sum + c.pedido.length, 0);
    
    if (totalItems === 0) {
      setError("Agrega al menos un producto");
      return;
    }

    try {
      setEnviando(true);
      setError("");

      // 🆕 COMBINAR TODOS LOS PEDIDOS CON CLIENTE_NRO
      const detalles = [];
      clientes.forEach(cliente => {
        cliente.pedido.forEach(item => {
          detalles.push({
            id_producto: item.id,
            cantidad: item.cantidad,
            notas: item.notas || "",
            cliente_nro: cliente.id, // 👈 IDENTIFICADOR DEL CLIENTE
          });
        });
      });

      console.log("Enviando pedido con clientes:", {
        mesa,
        detalles,
        id_mesero: user.id,
      });

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

  const productosFiltrados = categoriaActiva === null
    ? productos
    : productos.filter(p => p.id_categoria === categoriaActiva);

  // 🆕 CALCULAR TOTALES
  const clienteSeleccionado = clientes.find(c => c.id === clienteActivo);
  const totalItemsActivo = clienteSeleccionado?.pedido.reduce((sum, item) => sum + item.cantidad, 0) || 0;
  const totalItemsGeneral = clientes.reduce((sum, c) => 
    sum + c.pedido.reduce((s, item) => s + item.cantidad, 0), 0
  );
  const totalPrecioGeneral = clientes.reduce((sum, c) => 
    sum + c.pedido.reduce((s, item) => s + (item.precio * item.cantidad), 0), 0
  );

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

        {/* 🆕 SELECTOR DE CLIENTES */}
        <div className="clientes-selector">
          <div className="clientes-tabs">
            {clientes.map(cliente => {
              const itemsCliente = cliente.pedido.reduce((sum, item) => sum + item.cantidad, 0);
              
              return (
                <button
                  key={cliente.id}
                  className={`cliente-tab ${clienteActivo === cliente.id ? 'active' : ''}`}
                  onClick={() => setClienteActivo(cliente.id)}
                >
                  <div className="cliente-tab-nombre">
                    👤 {cliente.nombre}
                  </div>
                  {itemsCliente > 0 && (
                    <span className="cliente-tab-badge">{itemsCliente}</span>
                  )}
                  {clientes.length > 1 && (
                    <button
                      className="cliente-tab-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarCliente(cliente.id);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </button>
              );
            })}
            
            <button className="cliente-tab-add" onClick={agregarCliente}>
              ➕ Agregar
            </button>
          </div>
        </div>

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
            const enPedido = clienteSeleccionado?.pedido.find(item => item.id === producto.id);
            
            return (
              <div
                key={producto.id}
                className="producto-card"
                onClick={() => agregarAlPedido(producto)}
              >
                <div className="producto-nombre">{producto.nombre}</div>
                <div className="producto-precio">
                  ${Number(producto.precio).toLocaleString("es-CL")}
                </div>
                
                {enPedido && (
                  <div className="producto-cantidad">
                    <button
                      className="cantidad-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        cambiarCantidad(clienteActivo, producto.id, -1);
                      }}
                    >
                      −
                    </button>
                    <span className="cantidad-numero">{enPedido.cantidad}</span>
                    <button
                      className="cantidad-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        cambiarCantidad(clienteActivo, producto.id, 1);
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
        {totalItemsGeneral > 0 && (
          <div className="carrito-flotante" onClick={() => setMostrarResumen(true)}>
            <div className="carrito-badge">{totalItemsGeneral}</div>
            <span>Ver pedido completo</span>
            <span style={{ fontWeight: 800 }}>
              ${totalPrecioGeneral.toLocaleString("es-CL")}
            </span>
          </div>
        )}

        {/* 🆕 MODAL RESUMEN MEJORADO */}
        {mostrarResumen && (
          <div className="modal-overlay" onClick={() => setMostrarResumen(false)}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Resumen del pedido - Mesa {mesa}</h2>
                <button className="modal-close" onClick={() => setMostrarResumen(false)}>
                  ✕
                </button>
              </div>

              <div className="resumen-por-clientes">
                {clientes.map(cliente => {
                  if (cliente.pedido.length === 0) return null;
                  
                  const totalCliente = cliente.pedido.reduce(
                    (sum, item) => sum + (item.precio * item.cantidad), 0
                  );
                  
                  return (
                    <div key={cliente.id} className="cliente-seccion">
                      <div className="cliente-seccion-header">
                        <h3>👤 {cliente.nombre}</h3>
                        <span className="cliente-total">
                          ${totalCliente.toLocaleString("es-CL")}
                        </span>
                      </div>
                      
                      <ul className="item-list">
                        {cliente.pedido.map(item => (
                          <li key={item.id}>
                            <div className="item-info">
                              <div className="item-header">
                                <span className="item-cantidad">{item.cantidad}x</span>
                                <span className="item-nombre">{item.nombre}</span>
                                <span className="item-precio">
                                  ${(item.precio * item.cantidad).toLocaleString("es-CL")}
                                </span>
                              </div>
                              
                              <textarea
                                className="form-control"
                                placeholder="Notas (opcional)"
                                value={item.notas}
                                onChange={(e) => cambiarNotas(cliente.id, item.id, e.target.value)}
                                style={{ marginTop: 8, fontSize: 13 }}
                                rows={2}
                              />
                            </div>
                            
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => eliminarDelPedido(cliente.id, item.id)}
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

              <div className="resumen-total">
                <div className="total-row">
                  <span>Total items:</span>
                  <span>{totalItemsGeneral}</span>
                </div>
                <div className="total-row total-final">
                  <span>Total a pagar:</span>
                  <span>${totalPrecioGeneral.toLocaleString("es-CL")}</span>
                </div>
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm("¿Cancelar todo el pedido?")) {
                      setClientes([{ id: 1, nombre: "Cliente 1", pedido: [] }]);
                      setClienteActivo(1);
                      setMostrarResumen(false);
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  Cancelar todo
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

      {/* 🆕 ESTILOS ADICIONALES */}
      <style>{`
        .clientes-selector {
          margin-bottom: 20px;
        }

        .clientes-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .cliente-tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: 140px;
        }

        .cliente-tab:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .cliente-tab.active {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .cliente-tab-nombre {
          flex: 1;
        }

        .cliente-tab-badge {
          background: rgba(255, 255, 255, 0.3);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .cliente-tab.active .cliente-tab-badge {
          background: rgba(255, 255, 255, 0.4);
        }

        .cliente-tab-delete {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.2);
          border: none;
          color: white;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .cliente-tab-delete:hover {
          background: #ef4444;
          transform: scale(1.1);
        }

        .cliente-tab-add {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          background: rgba(16, 185, 129, 0.2);
          border: 2px dashed rgba(16, 185, 129, 0.5);
          border-radius: 12px;
          color: #10b981;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .cliente-tab-add:hover {
          background: rgba(16, 185, 129, 0.3);
          border-color: #10b981;
          transform: scale(1.05);
        }

        .modal-large {
          max-width: 700px;
          max-height: 85vh;
          overflow-y: auto;
        }

        .resumen-por-clientes {
          margin-bottom: 20px;
        }

        .cliente-seccion {
          margin-bottom: 24px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cliente-seccion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid rgba(59, 130, 246, 0.3);
        }

        .cliente-seccion-header h3 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: #3b82f6;
        }

        .cliente-total {
          font-size: 18px;
          font-weight: 800;
          color: #10b981;
        }

        .item-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .item-list li {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .item-info {
          flex: 1;
        }

        .item-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .item-cantidad {
          font-size: 16px;
          font-weight: 800;
          color: #3b82f6;
          min-width: 40px;
        }

        .item-nombre {
          flex: 1;
          font-size: 15px;
          font-weight: 600;
        }

        .item-precio {
          font-size: 15px;
          font-weight: 700;
          color: #10b981;
        }

        .resumen-total {
          margin-top: 24px;
          padding: 20px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 12px;
          border: 2px solid rgba(59, 130, 246, 0.3);
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 16px;
        }

        .total-final {
          margin-top: 12px;
          padding-top: 16px;
          border-top: 2px solid rgba(255, 255, 255, 0.2);
          font-size: 24px;
          font-weight: 800;
        }

        .total-final span:last-child {
          color: #10b981;
        }

        .btn-sm {
          padding: 8px 12px;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .cliente-tab {
            min-width: 120px;
            padding: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
}
