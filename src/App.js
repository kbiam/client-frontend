// App.js or any other component where you want to include EventPage
import React from 'react';
import EventPage from './EventPage';
import './App.css'; // Import your global styles
import {Route, Routes} from "react-router-dom"
import Header from './Header';
// import EventViewerPage from './EventViewerPage';
import Modal from "react-modal";
import StartStream from './StartStream';

function App() {
  Modal.setAppElement("#root");
  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path='/' element = {<EventPage />}/>
        <Route path='/view-stream/:streamId' element = {<EventPage />}/>
        <Route path='/start-stream' element = {<StartStream />}/>
      </Routes>
    </div>
  );
}

export default App;
