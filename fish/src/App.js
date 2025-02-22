// src/App.js
import React, { useState } from 'react';
import FishEntryForm from './components/FishEntryForm';
import OrderDetails from './components/OrderDetails';
import './App.css';

const App = () => {
  const [fishEntries, setFishEntries] = useState([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const handleProceed = (fishEntries) => {
    setFishEntries(fishEntries);
    setShowOrderDetails(true);
  };

  return (
    <div className="app">
      {showOrderDetails ? (
        <OrderDetails fishEntries={fishEntries} />
      ) : (
        <FishEntryForm onProceed={handleProceed} />
      )}
    </div>
  );
};

export default App;
