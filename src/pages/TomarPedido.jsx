// src/pages/TomarPedido.jsx - ORDENAMIENTO CORREGIDO
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function TomarPedido() {
  const { mesa } = useParams();
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  
  const [clientes, setClientes] = useState([
    { id: 1, nombre: "Cliente 1", pedido: [] }
  ]);
  const [clienteActivo, setClienteActivo] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [busqueda, setBusqueda] = useState("");

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
      
      // 🔧 CORRECCIÓN: Ordenar categorías (case-insensitive)
      const ordenCategorias = {
        'todos': 0,
        'principal': 1,
        'agregados': 2,
        'agregado': 2, // por si acaso está en singular
        'ensalada': 3,
        'bebida': 4,
        'postre': 5
      };
      
      const categoriasOrdenadas = [
        { id: null, nombre: "Todos" },
        ...catsRes.sort((a, b) => {
          const nombreA = a.nombre.toLowerCase().trim();
          const nombreB = b.nombre.toLowerCase().trim();
          const ordenA = ordenCategorias[nombreA] !== undefined ? ordenCategorias[nombreA] : 999;
          const ordenB = ordenCategorias[nombreB] !== undefined ? ordenCategorias[nombreB] : 999;
          
          // Si tienen el mismo orden o no están en la lista, ordenar alfabéticamente
          if (ordenA === ordenB) {
            return nombreA.localeCompare(nombreB);
          }
          return ordenA - ordenB;
        })
      ];
      
      console.log("Categorías ordenadas:", categoriasOrdenadas.map(c => c.nombre));
      
      setCategorias(categoriasOrdenadas);
      setCategoriaActiva(null);
    } catch (err) {
      setError(err.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }

  function renombrarCliente(clienteId, nuevoNombre) {
    if (!nuevoNombre.trim()) return;
    
    setClientes(clientes.map(c => 
      c.id === clienteId ? { ...c, nombre: nuevoNombre.trim() } : c
    ));
  }

  function agregarCliente() {
    const nuevoId = Math.max(...clientes.map(c => c.id)) + 1;
    const nuevoNombre = `Cliente ${nuevoId}`;
    
    setClientes([...clientes, { 
      id: nuevoId, 
      nombre: nuevoNombre, 
      pedido: [] 
    }]);
    setClienteActivo(nuevoId);
  }

  function eliminarCliente(clienteId) {
    if (clientes.length === 1) {
      alert("Debe haber al menos un cliente");
      return;
    }
    
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente.pedido.length > 0) {
      if (!window.confirm(`¿Eliminar a ${cliente.nombre} y sus ${cliente.pedido.length} productos?`)) {
        return;
      }
    }
    
    const nuevosClientes = clientes.filter(c => c.id !== clienteId);
    setClientes(nuevosClientes);
    if (clienteActivo === clienteId) {
      setClienteActivo(nuevosClientes[0].id);
    }
  }

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
    
    const card = document.querySelector(`[data-producto-id="${producto.id}"]`);
    if (card) {
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.transform = 'scale(1)';
      }, 100);
    }
  }

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

  function eliminarDelPedido(clienteId, productoId) {
    setClientes(clientes.map(cliente => {
      if (cliente.id !== clienteId) return cliente;
      
      return {
        ...cliente,
        pedido: cliente.pedido.filter(item => item.id !== productoId)
      };
    }));
  }

  function duplicarPedido(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente || cliente.pedido.length === 0) return;
    
    const nuevoId = Math.max(...clientes.map(c => c.id)) + 1;
    setClientes([...clientes, {
      id: nuevoId,
      nombre: `Cliente ${nuevoId}`,
      pedido: cliente.pedido.map(item => ({ ...item }))
    }]);
    setClienteActivo(nuevoId);
  }

  async function enviarPedido() {
    const totalItems = clientes.reduce((sum, c) => sum + c.pedido.length, 0);
    
    if (totalItems === 0) {
      setError("Agrega al menos un producto");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      setEnviando(true);
      setError("");

      const detalles = [];
      clientes.forEach(cliente => {
        cliente.pedido.forEach(item => {
          detalles.push({
            id_producto: item.id,
            cantidad: item.cantidad,
            notas: item.notas || "",
            cliente_nro: cliente.id,
          });
        });
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
      setTimeout(() => setError(""), 5000);
    } finally {
      setEnviando(false);
    }
  }

  let productosFiltrados = categoriaActiva === null
    ? productos
    : productos.filter(p => p.id_categoria === categoriaActiva);
  
  if (busqueda.trim()) {
    productosFiltrados = productosFiltrados.filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }

  const clienteSeleccionado = clientes.find(c => c.id === clienteActivo);
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
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando productos...</p>
        </div>
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
          <div className="alert alert-error" style={{ animation: 'slideIn 0.3s' }}>
            <span>⚠️</span>
            {error}
          </div>
        )}

        {/* SELECTOR DE CLIENTES */}
        <div className="clientes-selector">
          <div className="clientes-tabs">
            {clientes.map(cliente => {
              const itemsCliente = cliente.pedido.reduce((sum, item) => sum + item.cantidad, 0);
              
              return (
                <div key={cliente.id} className="cliente-tab-container">
                  <button
                    className={`cliente-tab ${clienteActivo === cliente.id ? 'active' : ''}`}
                    onClick={() => setClienteActivo(cliente.id)}
                    onDoubleClick={() => {
                      const nuevoNombre = prompt("Nuevo nombre:", cliente.nombre);
                      if (nuevoNombre) renombrarCliente(cliente.id, nuevoNombre);
                    }}
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
                  
                  {cliente.pedido.length > 0 && clienteActivo === cliente.id && (
                    <button
                      className="cliente-tab-menu"
                      onClick={() => duplicarPedido(cliente.id)}
                      title="Duplicar este pedido a nuevo cliente"
                    >
                      📋
                    </button>
                  )}
                </div>
              );
            })}
            
            <button className="cliente-tab-add" onClick={agregarCliente}>
              ➕ Cliente
            </button>
          </div>
          
          <div className="cliente-tip">
            <small>💡 Doble clic en un cliente para renombrar</small>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="search-input"
          />
          {busqueda && (
            <button className="search-clear" onClick={() => setBusqueda("")}>
              ✕
            </button>
          )}
        </div>

        {/* CATEGORÍAS ORDENADAS */}
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

        {/* PRODUCTOS */}
        <div className="productos-grid">
          {productosFiltrados.length === 0 ? (
            <div className="empty-state">
              <p>No se encontraron productos</p>
            </div>
          ) : (
            productosFiltrados.map(producto => {
              const enPedido = clienteSeleccionado?.pedido.find(item => item.id === producto.id);
              
              return (
                <div
                  key={producto.id}
                  data-producto-id={producto.id}
                  className={`producto-card ${enPedido ? 'en-pedido' : ''}`}
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
            })
          )}
        </div>

        {/* CARRITO FLOTANTE */}
        {totalItemsGeneral > 0 && (
          <div className="carrito-flotante" onClick={() => setMostrarResumen(true)}>
            <div className="carrito-info">
              <div className="carrito-badge">{totalItemsGeneral}</div>
              <div className="carrito-texto">
                <div className="carrito-label">Ver pedido completo</div>
                <div className="carrito-clientes">
                  {clientes.filter(c => c.pedido.length > 0).length} {
                    clientes.filter(c => c.pedido.length > 0).length === 1 ? 'cliente' : 'clientes'
                  }
                </div>
              </div>
            </div>
            <div className="carrito-total">
              ${totalPrecioGeneral.toLocaleString("es-CL")}
            </div>
          </div>
        )}

        {/* MODAL RESUMEN */}
        {mostrarResumen && (
          <div className="modal-overlay" onClick={() => setMostrarResumen(false)}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>Resumen del pedido</h2>
                  <p style={{ fontSize: 14, color: '#94a3b8', margin: '4px 0 0 0' }}>
                    Mesa {mesa} • {clientes.filter(c => c.pedido.length > 0).length} clientes
                  </p>
                </div>
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
                              
                              <input
                                type="text"
                                className="form-control"
                                placeholder="💬 Notas (ej: sin cebolla, extra salsa...)"
                                value={item.notas}
                                onChange={(e) => cambiarNotas(cliente.id, item.id, e.target.value)}
                                style={{ marginTop: 8, fontSize: 13 }}
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
                  <span>Total de items</span>
                  <span>{totalItemsGeneral}</span>
                </div>
                <div className="total-row">
                  <span>Total de clientes</span>
                  <span>{clientes.filter(c => c.pedido.length > 0).length}</span>
                </div>
                <div className="total-row total-final">
                  <span>Total a pagar</span>
                  <span>${totalPrecioGeneral.toLocaleString("es-CL")}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm("¿Cancelar todo el pedido?")) {
                      setClientes([{ id: 1, nombre: "Cliente 1", pedido: [] }]);
                      setClienteActivo(1);
                      setMostrarResumen(false);
                    }
                  }}
                >
                  Cancelar todo
                </button>
                <button
                  className="btn btn-success btn-large"
                  onClick={enviarPedido}
                  disabled={enviando}
                >
                  {enviando ? (
                    <>
                      <span className="spinner-small"></span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      ✓ Enviar a cocina
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ESTILOS */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 20px;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .spinner-small {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          margin-right: 8px;
        }

        .clientes-selector {
          margin-bottom: 20px;
        }

        .clientes-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
          scrollbar-width: thin;
        }

        .clientes-tabs::-webkit-scrollbar {
          height: 6px;
        }

        .clientes-tabs::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .cliente-tab-container {
          position: relative;
          display: flex;
          gap: 4px;
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

        .cliente-tab-menu {
          width: 36px;
          height: 100%;
          background: rgba(16, 185, 129, 0.2);
          border: 2px solid rgba(16, 185, 129, 0.3);
          border-radius: 8px;
          color: #10b981;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cliente-tab-menu:hover {
          background: rgba(16, 185, 129, 0.3);
          transform: scale(1.05);
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

        .cliente-tip {
          margin-top: 8px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }

        .search-bar {
          position: relative;
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 14px 40px 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 0.08);
        }

        .search-input::placeholder {
          color: #64748b;
        }

        .search-clear {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.2);
          border: none;
          color: #ef4444;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-clear:hover {
          background: #ef4444;
          color: white;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
          font-size: 16px;
        }

        .producto-card {
          transition: all 0.2s;
        }

        .producto-card.en-pedido {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
        }

        .carrito-flotante {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
        }

        .carrito-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .carrito-texto {
          flex: 1;
        }

        .carrito-label {
          font-size: 15px;
          font-weight: 600;
        }

        .carrito-clientes {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 2px;
        }

        .carrito-total {
          font-size: 24px;
          font-weight: 800;
          color: #10b981;
        }

        .modal-large {
          max-width: 700px;
          max-height: 85vh;
          overflow-y: auto;
        }

        .modal-header p {
          margin: 0;
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

        .modal-actions {
          margin-top: 24px;
          display: flex;
          gap: 12px;
        }

        .modal-actions .btn-danger {
          flex: 1;
        }

        .modal-actions .btn-success {
          flex: 2;
        }

        .btn-large {
          padding: 16px 24px;
          font-size: 17px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
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

          .carrito-total {
            font-size: 20px;
          }

          .modal-actions {
            flex-direction: column;
          }

          .modal-actions .btn-danger,
          .modal-actions .btn-success {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
