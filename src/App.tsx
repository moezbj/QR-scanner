// src/App.tsx
import React, { useEffect, useState } from "react";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/login";
import Scanner from "./pages/Scanner";
import ManuelScanner from "./pages/manuelScanner";
import UploadScanner from "./pages/uploadScanner";
import CreateQr from "./pages/createQr";
import Settings from "./pages/Settings";

import ProtectedRoute from "./components/layout/ProtectedRoute";
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("auth")) {
      setIsAuthenticated(!!localStorage.getItem("auth"));
    }
  }, []);
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              redirectPath="/"
            />
          }
        >
          <Route path="/camScanner" element={<Scanner />} />
          <Route path="/manuelScanner" element={<ManuelScanner />} />
          <Route path="/uploadScanner" element={<UploadScanner />} />
          <Route path="/createQR" element={<CreateQr />} />
          <Route path="/settings" element={<Settings />} />

          
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
