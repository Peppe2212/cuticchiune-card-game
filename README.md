# 🃏 Cuticchiune - Web Multiplayer Card Game

Cuticchiune è un gioco di carte multiplayer in tempo reale sviluppato in **React** e **Firebase Realtime Database**. Il sistema è progettato per essere *fault-tolerant*, gestendo disconnessioni improvvise, subentri in corsa e automazione tramite bot. (Seguiranno ulteriori sviluppi per il miglioramento generale del sistema) 

Per giocarci: https://cuticchiune-card-game.vercel.app
---

## ✨ Features Principali

*   **Sincronizzazione Real-Time**: Stato centralizzato su Firebase con latenza minima.
*   **Gestione Disconnessioni**: Chi abbandona viene sostituito istantaneamente da un Bot; il tavolo non si blocca mai.
*   **Spettatori & Subentro**: Chi entra a partita iniziata assiste in diretta e può "rubare" il posto a un Bot con un solo click.
*   **Host Infallibile**: La gestione della stanza (avvio, kick) passa automaticamente al primo umano se il creatore esce.
*   **Controllo Infrazioni**: Il sistema rileva se un giocatore non risponde al seme e applica la penalità.

---

## 📜 Regole del Gioco

Cuticchiune è un gioco di prese (trick-taking) "a non prendere", in cui l'obiettivo è **evitare di accumulare punti** (oppure prenderli chirurgicamente tutti per fare il "Cappotto").

### 1. Setup Iniziale
*   **Giocatori**: 4, si gioca con un mazzo standard di 40 carte (es. Siciliane).
*   **Il Primo Turno**: All'inizio della mano le carte vengono distribuite tutte. Il giocatore che possiede il **5 di Denari** è il primo a lanciare una carta.

### 2. Ordine di Presa e Valore delle Carte
Per stabilire chi vince la presa, le carte seguono questa gerarchia di forza (dal più forte al più debole):
*   **Ordine di Presa**: Tre > Due > Asso > Re (10) > Cavallo (9) > Donna/Fante (8) > 7 > 6 > 5 > 4
*   **Valore delle carte**: Tre, Due e le figure (Re, Cavallo, Donna), valgono 1 punto ciascuno. L'asso vale 3 punti, il resto delle carte vale zero.
  
Il punteggio totale in palio ogni mano è di **35 punti**. A fine mano, i punti vengono calcolati sommando il valore delle carte presenti nelle prese di ciascun giocatore. 

### 3. Svolgimento del Turno
*   **Risposta al Seme**: Il primo giocatore lancia una carta dettando il *Seme*. Gli altri giocatori sono **obbligati a rispondere con lo stesso seme** se ne possiedono almeno una carta in mano.
*   **Infrazioni**: Se un giocatore non risponde al seme pur avendolo (Azione Illegale), viene penalizzato immediatamente con +1 Singa.
*   Chi lancia la carta col valore di presa più alto del seme di mano vince la presa, ritira le carte e inizia il turno successivo.
*   Durante l'ultimo giro di mano vengono applicati 3 punti aggiuntivi sull'ultima presa. 

### 4. Le Penalità (Singhe)
A fine mano, si calcolano i punti e si assegna 1 Penalità (chiamata **"Singa"**) in base a queste priorità:
1.  **Cappotto**: Se un giocatore riesce a prendere tutte le carte di valore (facendo 35 punti), dà 1 Singa a tutti gli avversari.
2.  **Zero Prese**: Se nessuno fa Cappotto, chi non ha fatto nemmeno una presa (0 prese) prende 1 Singa.
3.  **Punteggio Massimo**: In tutti gli altri casi, la Singa va a chi ha accumulato più punti nella mano.

### 5. Fine Partita
*   **Modalità**: Si gioca a un limite prefissato (es. 3 Singhe per Partita Rapida, 5 per Standard).
*   **Sconfitta di gruppo**: Se due giocatori raggiungono contemporaneamente il limite, perdono insieme.
*   **Cappotto Negativo (La Banda)**: Se un singolo giocatore arriva al doppio del limite di singhe (es. 10 singhe in una partita a 5), la partita finisce all'istante. Il giocatore subisce una sconfitta estrema e paga da bere!
---
