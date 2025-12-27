// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginMesero from "./pages/LoginMesero";
import Mesas from "./pages/Mesas";
import TomarPedido from "./pages/TomarPedido";
import MisComandas from "./pages/MisComandas";
import "./App.css";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginMesero />} />
        <Route
          path="/mesas"
          element={
            <PrivateRoute>
              <Mesas />
            </PrivateRoute>
          }
        />
        <Route
          path="/tomar-pedido/:mesa"
          element={
            <PrivateRoute>
              <TomarPedido />
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-comandas"
          element={
            <PrivateRoute>
              <MisComandas />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
