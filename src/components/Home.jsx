import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [roomCode, setRoomCode] = useState('')
  const navigate = useNavigate()

  // Genera un codice casuale di 4 lettere per la nuova stanza
  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()
    navigate(`/room/${code}`)
  }

  const joinRoom = (e) => {
    e.preventDefault()
    if (roomCode.trim()) {
      navigate(`/room/${roomCode.toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center p-4">
      <div className="bg-green-800 p-8 rounded-2xl shadow-2xl border-4 border-green-700 max-w-md w-full text-center">
        <h1 className="text-5xl font-bold text-white tracking-widest uppercase drop-shadow-lg mb-2">
          Cuticchiune
        </h1>
        <p className="text-green-300 mb-8 italic">Il gioco in cui meno prendi, meglio è (forse).</p>

        <button 
          onClick={createRoom}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all shadow-md mb-6"
        >
          🃏 Crea Nuovo Tavolo
        </button>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-green-600"></div>
          <span className="mx-4 text-green-400 font-medium">OPPURE</span>
          <div className="flex-grow border-t border-green-600"></div>
        </div>

        <form onSubmit={joinRoom} className="flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Codice Tavolo (es. ABCD)" 
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="w-full p-4 text-center text-xl rounded-lg font-mono uppercase bg-green-100 text-green-900 focus:outline-none focus:ring-4 focus:ring-yellow-500"
            maxLength={4}
          />
          <button 
            type="submit"
            disabled={roomCode.length !== 4}
            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all"
          >
            Entra nel Tavolo
          </button>
        </form>
      </div>
    </div>
  )
}