import React from "react";
import "@/style/layouts/loading.css"; // Assuming you move the CSS to a separate file

const Loading = () => {
  return (
    <div className="loader-container">
      <div className="loader"></div>
    </div>
  );
};

export default Loading;
