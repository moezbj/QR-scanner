/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  data: { title: string; value: any }[];
  title?: string;
  setValue: (value: any) => void;
  value?: any;
  className?: string;
  disabled?: boolean;
}

const Dropdown = ({
  data,
  title,
  setValue,
  value,
  disabled,
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const clas = `custom-dropdown ${className}`;
  return (
    <div className={clas}>
      <div className="dropdown-header" onClick={() => {disabled ? null : setOpen(!open)}}>
        {value ? (
          <span>{title === "template" ? value.name : value}</span>
        ) : (
          <span>{t("button.select")}</span>
        )}

        <span className="arrow">▼</span>
      </div>
      
      {open && (
        <ul className="dropdown-options">
          {data.map((e) => (
            <li
              key={e.title}
              data-value={e.value}
              onClick={() => {
                setValue(e.value);
                setOpen(false);
              }}
            >
              {e.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
