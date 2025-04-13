import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style/pages/login.css"; // Assuming you move the CSS to a separate file
import { useTranslation } from "react-i18next";
import logo from "../../public/image/logo-.png";
import Dropdown from "../components/ui/dropdown";
import { useMessage } from "@/hooks/message";

const Login = ({
  setIsAuthenticated,
}: {
  setIsAuthenticated: (value: boolean) => void;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [disableBtn, setDisableBtn] = useState<boolean>(false);

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showMessage } = useMessage();

  const handleSubmit = (e: any) => {
    console.log("ffrer");
    e.preventDefault();
    setDisableBtn(true);
    // Basic validation
    if (!email || !password) {
      showMessage("warning", t("login.empty"));

      setDisableBtn(false);

      return;
    }
    // Send the credentials to the main process using the exposed API
    window.electronAPI.send("authenticate-user", { email, password });

    // Listen for the authentication result
    window.electronAPI.receive("authentication-result", (result: any) => {
      if (result.success) {
        localStorage.setItem("auth", JSON.stringify(result)); // Store a fake token
        setDisableBtn(false);
        setIsAuthenticated(true); // Update the state to trigger a re-render
        navigate("/camScanner"); // Redirect to a protected route
      } else {
        setDisableBtn(false);
        showMessage(
          "error",
          result.message === "ERROR_CREDENTIALS"
            ? t("login.ERROR_CREDENTIALS")
            : ""
        );
      }
    });
  };

  return (
    <div className="container">
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 20,
        }}
      >
        <Dropdown
          className="mb-4 mt-4 !w-32"
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
      </div>
      <div className="login-container">
        <div className="login-logo">
          <img src={logo} alt="Logo" />
        </div>
        <div>
          <div className="input-group">
            <label htmlFor="email">{t("login.email")}</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="example@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="customWidth"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">{t("login.password")}</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="*****"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="customWidth"
            />
          </div>
          <div className="btn" onClick={handleSubmit}>
            {t("button.login")}
          </div>
          {/*         <a href="#" className="forgot-password">
            Forgot Password?
          </a> */}
        </div>
      </div>
    </div>
  );
};

export default Login;
