import React, { useEffect, useState } from 'react';
import '../../style/layouts/toast.css';
import { FaCheckCircle, FaExclamationTriangle, FaTimes, FaTimesCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

export type MessageType = 'error' | 'success' | 'warning';


interface MessageProps {
    type: MessageType;
    content: string;
    onClose: () => void;

}

const Message: React.FC<MessageProps> = ({ type, content, onClose }) => {
    const { t } = useTranslation();

    const getIcon = () => {
        switch (type) {
            case 'error':
                return <FaTimesCircle className="icon" />;
            case 'success':
                return <FaCheckCircle className="icon" />;
            case 'warning':
                return <FaExclamationTriangle className="icon" />;
            default:
                return null;
        }
    };
    const getMessageStyle = () => {
        switch (type) {
            case "error":
                return { backgroundColor: '#c17171' };
            case "success":
                return { backgroundColor: '#2e7d32' };
            case "warning":
                return { backgroundColor: '#f57c00' };
            default:
                return { backgroundColor: '#2e7d32' };
        }
    };

    return (
        <>
            <div className="backdrop" onClick={onClose} />
            <div className={`message-modal ${type}`}>
                {getIcon()}
                <p className='text'>{content}</p>
                <button className="close-button" style={{ ...getMessageStyle() }} onClick={onClose}>
                    <FaTimes /> {t("button.close")}
                </button>
            </div>
        </>
    );
};

export default Message;