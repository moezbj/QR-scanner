import Message, { MessageType } from '@/components/ui/Toast';
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface MessageContextType {
    showMessage: (type: MessageType, content: string) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [message, setMessage] = useState<any | null>(null);

    const showMessage = (type: MessageType, content: string) => {
        setMessage({ type, content });
    };

    const closeMessage = () => {
        setMessage(null);
      };
    return (
        <MessageContext.Provider value={{ showMessage }}>
            {children}
            {message && <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
                <Message type={message.type} content={message.content} onClose={closeMessage} />
            </div>}
        </MessageContext.Provider>
    );
};

export const useMessage = (): MessageContextType => {
    const context = useContext(MessageContext);
    if (!context) {
        throw new Error('useMessage must be used within a MessageProvider');
    }
    return context;
};