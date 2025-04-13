// src/components/Layout.tsx
import React, { useEffect, useState } from "react";
import "../../style/layouts/layout.css"; // Optional: for styling
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Dropdown from "../ui/dropdown";
import logo from "../../../public/image/logo.png";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState("");
  const nav = useNavigate();
  const logout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("file_id");
    localStorage.removeItem("steeper");
    localStorage.removeItem("languageSelect");
    nav("/");
  };

  useEffect(() => {
    const userLocal = localStorage.getItem("auth");

    if (userLocal) {
      const formatted = JSON.parse(userLocal);
      setUser(formatted.user.role);
    }
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="info-container">
          <div className="logo">
            <div className="logo-container">
              <img className="img-logo" src={logo} />
            </div>
            <h2>{t("sideBar.title")}</h2>
          </div>
          <ul className="menu">
            <li>
              <NavLink
                to="/camScanner"
                className={({ isActive }) => (isActive ? "active-path" : "")}
              >
                {t("sideBar.camScanner")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/manuelScanner"
                className={({ isActive }) => (isActive ? "active-path" : "")}
              >
                {t("sideBar.manuelScanner")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/uploadScanner"
                className={({ isActive }) => (isActive ? "active-path" : "")}
              >
                {t("sideBar.uploadScanner")}
              </NavLink>
            </li>
            {user === "admin" && (
              <li>
                <NavLink
                  to="/createQR"
                  className={({ isActive }) => (isActive ? "active-path" : "")}
                >
                  {t("sideBar.create")}
                </NavLink>
              </li>
            )}
            {user === "admin" && (
              <li>
                <NavLink
                  to="/settings"
                  className={({ isActive }) => (isActive ? "active-path" : "")}
                >
                  {t("sideBar.settings")}
                </NavLink>
              </li>
            )}
          </ul>
        </div>
        <div className="mb-12 ml-4">
          <Dropdown
            className="mb-4 mt-4"
            data={[
              { title: t("sideBar.french"), value: "fr" },
              { title: t("sideBar.english"), value: "en" },
            ].map((r) => ({
              title: r.title,
              value: r.value,
            }))}
            setValue={i18n.changeLanguage}
            value={i18n.language}
          />
          <button className="deleteBtn max-w-48" onClick={logout}>
            {t("button.logout")}
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
};

export default Layout;
