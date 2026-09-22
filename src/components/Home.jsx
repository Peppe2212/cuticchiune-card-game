import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Home() {
    const [roomCode, setRoomCode] = useState('')
    const [errorMsg, setErrorMsg] = useState('')
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // Controlla se siamo stati cacciati da una stanza inesistente
    useEffect(() => {
        if (searchParams.get('error') === 'notfound') {
        setErrorMsg('La stanza che cerchi non esiste più o il codice è errato.')
        // Pulisce l'URL dopo 3 secondi
        setTimeout(() => navigate('/', { replace: true }), 3000)
        } else if (searchParams.get('error') === 'started') {
        setErrorMsg('La partita in questo tavolo è già iniziata!')
        setTimeout(() => navigate('/', { replace: true }), 3000)
        }
    }, [searchParams, navigate])

    const createRoom = () => {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase()
        // Passiamo un parametro invisibile per dire a Room che vogliamo CREARE
        navigate(`/room/${code}`, { state: { isCreating: true } })
    }

    const joinRoom = (e) => {
        e.preventDefault()
        if (roomCode.trim()) {
        navigate(`/room/${roomCode.toUpperCase()}`)
        }
    }

    return (
        <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center p-4">
        {/* BANNER DI ERRORE */}
        {errorMsg && (
            <div className="absolute top-4 sm:top-10 w-[90%] sm:w-auto bg-red-600 text-white font-bold px-4 py-3 sm:px-6 sm:py-3 rounded-lg shadow-xl animate-bounce border-2 border-red-800 z-50 text-center text-sm sm:text-base">
            ⚠️ {errorMsg}
            </div>
        )}

        {/* CONTENITORE PRINCIPALE (Padding ridotti su mobile) */}
        <div className="bg-green-800 p-6 sm:p-8 rounded-2xl shadow-2xl border-2 sm:border-4 border-green-700 max-w-md w-full text-center">
            
            {/* TITOLO SCALATO (text-4xl su mobile, 5xl su pc) */}
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-widest uppercase drop-shadow-lg mb-2">
            Cuticchiune
            </h1>
            <p className="text-green-300 mb-6 sm:mb-8 italic text-sm sm:text-base">Il gioco in cui meno prendi, meglio è (forse).</p>

            <button 
            onClick={createRoom}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-lg text-lg sm:text-xl transition-all shadow-md mb-4 sm:mb-6"
            >
            🃏 Crea Nuovo Tavolo
            </button>

            <div className="flex items-center my-4">
            <div className="flex-grow border-t border-green-600"></div>
            <span className="mx-4 text-green-400 font-medium text-sm sm:text-base">OPPURE</span>
            <div className="flex-grow border-t border-green-600"></div>
            </div>

            <form onSubmit={joinRoom} className="flex flex-col gap-3">
            <input 
                type="text" 
                placeholder="Codice Tavolo (es. ABCD)" 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full p-3 sm:p-4 text-center text-lg sm:text-xl rounded-lg font-mono uppercase bg-green-100 text-green-900 focus:outline-none focus:ring-4 focus:ring-yellow-500"
                maxLength={4}
            />
            <button 
                type="submit"
                disabled={roomCode.length !== 4}
                className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 sm:px-6 rounded-lg transition-all text-sm sm:text-base"
            >
                Entra nel Tavolo
            </button>
            </form>
        </div>
        </div>
    )
}