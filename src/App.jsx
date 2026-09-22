import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Room from './components/Room';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* La rotta principale (localhost:5173/) carica sempre la Home */}
        <Route path="/" element={<Home />} />
        
        {/* La rotta parametrica carica il tavolo di gioco solo se c'è un codice */}
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}