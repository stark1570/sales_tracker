import React, { useState, useEffect } from 'react';
import '../App.css'; // Adjust the path to point to the correct location of App.css

const FishEntryForm = ({ onProceed }) => {
  const [fishEntries, setFishEntries] = useState([{ name: '', weight: '', amount: '' }]);

  // Fetch fish entries from the backend when the component mounts
  useEffect(() => {
    fetchFishEntries();
  }, []);

  // Fetch fish entries from the backend
  const fetchFishEntries = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fish-entries');
      const data = await response.json();
      if (data.length > 0) {
        setFishEntries(data);
      }
    } catch (error) {
      console.error('Error fetching fish entries:', error);
    }
  };

  // Calculate total investment
  const calculateTotalInvestment = () => {
    return fishEntries.reduce((total, fish) => {
      if (fish.name && fish.weight && fish.amount) {
        return total + parseFloat(fish.amount);
      }
      return total;
    }, 0);
  };

  // Add a new fish entry
  const handleAddFish = () => {
    setFishEntries([...fishEntries, { name: '', weight: '', amount: '' }]);
  };

  // Handle input changes
  const handleChange = (index, key, value) => {
    const newFishEntries = [...fishEntries];
    newFishEntries[index][key] = value;
    setFishEntries(newFishEntries);
  };

  // Handle form submission (send data to the backend)
  const handleProceed = async () => {
    const isValid = fishEntries.every(fish =>
      fish.name.trim() && // Ensure name is a non-empty string
      !isNaN(parseFloat(fish.weight)) && // Ensure weight is a valid number
      !isNaN(parseFloat(fish.amount)) // Ensure amount is a valid number
    );

    if (isValid) {
      // Remove duplicates based on fish name
      const uniqueFishEntries = [];
      const fishNames = new Set(); // Track fish names to detect duplicates

      fishEntries.forEach((fish) => {
        if (!fishNames.has(fish.name)) {
          fishNames.add(fish.name); // Add fish name to the set
          uniqueFishEntries.push(fish); // Add fish entry to the unique list
        }
      });

      try {
        const response = await fetch('http://localhost:5000/api/fish-entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fishEntries: uniqueFishEntries }), // Send only unique entries
        });

        if (response.ok) {
          alert('Fish entries saved successfully!');
          onProceed(uniqueFishEntries); // Proceed to the next step with unique entries
        } else {
          alert('Failed to save fish entries.');
        }
      } catch (error) {
        console.error('Error saving fish entries:', error);
        alert('An error occurred while saving fish entries.');
      }
    } else {
      alert('Please fill in all fields for each fish entry.');
    }
  };

  // Handle deleting a fish entry
  const handleDeleteFish = async (index, id) => {
    if (id) {
      // If the entry has an ID, delete it from the backend
      try {
        const response = await fetch(`http://localhost:5000/api/fish-entries/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          alert('Fish entry deleted successfully!');
        } else {
          alert('Failed to delete fish entry.');
        }
      } catch (error) {
        console.error('Error deleting fish entry:', error);
        alert('An error occurred while deleting the fish entry.');
      }
    }

    // Remove the entry from the frontend state
    const newFishEntries = fishEntries.filter((_, i) => i !== index);
    setFishEntries(newFishEntries);
  };

  return (
    <div className="fish-entry-form">
      <h2>Enter Fish Details</h2>
      {fishEntries.map((fish, index) => (
        <div key={index} className="fish-entry">
          <input
            type="text"
            placeholder="Fish Name"
            value={fish.name}
            onChange={(e) => handleChange(index, 'name', e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Weight (kg)"
            value={fish.weight}
            onChange={(e) => handleChange(index, 'weight', e.target.value)}
            required
            min="0"
            step="0.01"
          />
          <input
            type="number"
            placeholder="Amount Paid (INR)"
            value={fish.amount}
            onChange={(e) => handleChange(index, 'amount', e.target.value)}
            required
            min="0"
            step="0.01"
          />
          <button
            type="button"
            onClick={() => handleDeleteFish(index, fish.id)} // Pass the index and ID (if available)
            className="delete-fish-btn"
          >
            🗑️
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAddFish} className="add-fish-btn">
        + Add Fish
      </button>
      <div className="total-investment">
        <h3>Total Investment: {calculateTotalInvestment().toFixed(2)} INR</h3>
      </div>
      <button type="button" onClick={handleProceed} className="proceed-btn">
        Proceed
      </button>
    </div>
  );
};

export default FishEntryForm;