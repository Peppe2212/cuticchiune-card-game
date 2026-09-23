import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue } from "firebase/database";
import { db } from '../services/firebase';
import { sendMessage } from '../services/gameSync';

// Aggiungi variant="game" tra i parametri
export default function Chat({ roomId, playerName, variant = "game" }) {    
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [unread, setUnread] = useState(0);
    
    // Stato per la notifica a comparsa in alto
    const [toast, setToast] = useState(null);

    const messagesEndRef = useRef(null);
    const isOpenRef = useRef(isOpen);
    const prevLenRef = useRef(0);

    // Manteniamo il ref aggiornato senza riavviare il listener
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    // 🔴 LA TUA NUOVA LISTA DI MESSAGGI RAPIDI
    const quickMessages = [
        "a 10 chiamamo a banna 🎺", "ora piglie a rincorsa", "all’ultimo c’è regalo 😏",
        "carta a sula levala allura !", "a prima regola è sarvarise", "amumento c’è applauso",
        "ora t’aggiusto io !", "Napoliiii", "Soffia cca !", "Antennee !", "arso ncapo arso no !",
        "minchia como si calano !", "Seee ora ti fazzo sarvare accussi !", "te cca sarvate !",
        "Braccio di fuori 😎", "Ta singaste sula chista", "Mi viniste a tirare su 4 di mmano oh !",
        "Franco preciso", "Va nesce si ta fide !", "Sceccooo", "Ci navisse a essere natraa 👀",
        "Cu sa si ni penteee 😜", "Corpo alla Ntone 🙂‍↔️", "Quanto vo fare ?", 
        "Minchia carte di coddo ! 😨", "Cuddaste amico 😬", "C’è chi gioca bene 😌"
    ];

    // Ascolta i nuovi messaggi da Firebase
    useEffect(() => {
        const chatRef = ref(db, `rooms/${roomId}/chat`);
        const unsubscribe = onValue(chatRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const msgList = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
                setMessages(msgList);

                const currentLen = msgList.length;
                const prevLen = prevLenRef.current;

                // Se c'è un NUOVO messaggio...
                if (prevLen > 0 && currentLen > prevLen) {
                    const newMsg = msgList[msgList.length - 1];
                    
                    // ...e la chat è chiusa...
                    if (!isOpenRef.current) {
                        setUnread(u => u + (currentLen - prevLen));
                        
                        // ...e non l'ho mandato io: Mostra il popup in alto!
                        if (newMsg.sender !== playerName) {
                            setToast(newMsg);
                            setTimeout(() => setToast(null), 4000); // Nascondi dopo 4 secondi
                        }
                    }
                }
                prevLenRef.current = currentLen;
            }
        });
        return () => unsubscribe();
    }, [roomId, playerName]);

    // Scorri in basso quando apri la chat o arriva un messaggio a chat aperta
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setUnread(0);
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (inputText.trim()) {
            await sendMessage(roomId, playerName, inputText);
            setInputText("");
        }
    };

    const sendQuickMessage = async (text) => {
        await sendMessage(roomId, playerName, text);
    };

    return (
        <>
            {/* NOTIFICA TOAST IN ALTO (Invariata) */}
            {toast && !isOpen && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-green-900/95 border-2 border-yellow-500 rounded-2xl px-6 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col items-center min-w-[280px] max-w-[90vw] animate-bounce pointer-events-none">
                    <span className="text-yellow-400 text-xs font-black uppercase tracking-wider mb-1">{toast.sender}</span>
                    <span className="text-white text-sm sm:text-base font-bold text-center leading-tight">{toast.text}</span>
                </div>
            )}

            {/* BOTTONE FLUTTUANTE (Adattivo: Gioco vs Lobby) */}
            <button 
                onClick={() => setIsOpen(true)}
                className={`fixed z-[90] flex items-center justify-center font-bold transition-transform hover:scale-105 shadow-[0_4px_15px_rgba(0,0,0,0.6)] border-2 border-blue-400 rounded-full
                    ${variant === 'lobby' 
                        ? 'bottom-6 right-6 sm:bottom-8 sm:right-8 bg-blue-700 hover:bg-blue-600 text-white py-3 px-5 sm:px-6 text-sm sm:text-base gap-2' 
                        : 'right-3 sm:right-6 bottom-[260px] sm:bottom-[280px] bg-blue-700 hover:bg-blue-600 text-white w-12 h-12 sm:w-14 sm:h-14'}`}
                title="Apri Chat"
            >
                <span className={variant === 'lobby' ? "text-lg" : "text-xl sm:text-2xl"}>💬</span>
                
                {/* Testo visibile solo nella lobby */}
                {variant === 'lobby' && <span>Apri Chat</span>}

                {/* Pallino Notifiche (Posizionato in base alla forma del bottone) */}
                {unread > 0 && (
                    <span className={`absolute bg-red-600 text-white font-black flex items-center justify-center rounded-full border-2 border-red-900 animate-pulse shadow-md
                        ${variant === 'lobby' 
                            ? '-top-2 -right-2 text-[11px] sm:text-xs w-6 h-6' 
                            : '-top-1 -left-1 text-[10px] sm:text-xs w-6 h-6 sm:w-7 sm:h-7'}`}>
                        {unread}
                    </span>
                )}
            </button>
            
            {/* PANNELLO DELLA CHAT */}
            {isOpen && (
                <div className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-green-950 shadow-[0_0_50px_rgba(0,0,0,0.9)] z-[100] flex flex-col border-l-2 border-green-700 animate-[slideIn_0.2s_ease-out]">
                    
                    {/* Intestazione */}
                    <div className="bg-green-900 p-3 sm:p-4 flex justify-between items-center border-b border-green-700 shadow-md">
                        <h3 className="text-white font-black text-lg tracking-wide">Sfogati</h3>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="bg-red-800 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-bold shadow-md border border-red-500 transition-colors flex items-center gap-2"
                        >
                            Chiudi ✖
                        </button>
                    </div>

                    {/* Area Messaggi */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-black/60 relative">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 mt-10 italic font-medium">Nessun messaggio. Rompi il ghiaccio!</div>
                        )}
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender === playerName;
                            return (
                                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-gray-400 mb-1 px-1 font-bold">{msg.sender}</span>
                                    <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm sm:text-base shadow-md border ${
                                        isMe 
                                            ? 'bg-green-700 text-white rounded-tr-sm border-green-500' 
                                            : 'bg-gray-800 text-gray-100 rounded-tl-sm border-gray-600'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>

                    {/* 🔴 SLIDER ELEGANTE A 3 RIGHE PER I MESSAGGI RAPIDI */}
                    <div className="bg-green-900 p-3 border-t border-green-700 overflow-x-auto scrollbar-hide shadow-inner">
                        {/* Griglia intelligente: scorre in orizzontale ma riempie 3 righe verticali */}
                        <div className="grid grid-rows-3 gap-2 grid-flow-col auto-cols-max">
                            {quickMessages.map((text, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => sendQuickMessage(text)}
                                    className="bg-green-800 hover:bg-green-700 text-yellow-100 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg border border-green-600 transition-colors shadow-sm text-left whitespace-nowrap"
                                >
                                    {text}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input manuale */}
                    <form onSubmit={handleSend} className="p-3 bg-green-950 flex gap-2 border-t border-green-800 pb-5 sm:pb-3">
                        <input 
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Scrivi una minchiata..." 
                            className="flex-1 bg-green-900 text-white px-4 py-2 rounded-full border border-green-700 focus:outline-none focus:border-yellow-500 placeholder-green-500"
                            maxLength={120}
                        />
                        <button 
                            type="submit" 
                            disabled={!inputText.trim()}
                            className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:bg-gray-700 text-red-950 font-black px-5 py-2 rounded-full shadow-md transition-colors"
                        >
                            ➤
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}