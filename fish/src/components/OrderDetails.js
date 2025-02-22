import React, { useState, useEffect } from 'react';
import SalesVisualization from './SalesVisualization';

const OrderDetails = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [status, setStatus] = useState('Pending');
  const [fishEntriesList, setFishEntriesList] = useState([{ fish: '', weight: '', amount: '' }]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showVisualization, setShowVisualization] = useState(false);
  const [availableFish, setAvailableFish] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchAvailableFish();
    fetchPendingOrders();
  }, []);

  const fetchAvailableFish = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fish-entries');
      const data = await response.json();
      setAvailableFish(data);
    } catch (error) {
      console.error('Error fetching fish entries:', error);
      setErrorMessage('Failed to fetch available fish');
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/orders?status=Pending');
      const data = await response.json();
      setPendingOrders(data);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      setErrorMessage('Failed to fetch pending orders');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validate entries
    const validEntries = fishEntriesList.filter(entry => {
      const amount = parseFloat(entry.amount);
      return entry.fish && 
             !isNaN(amount) && 
             amount > 0;
    });

    if (validEntries.length === 0) {
      setErrorMessage('Please add at least one valid fish entry with a proper amount');
      return;
    }

    const order = {
      customerName,
      customerPhone,
      paymentMode,
      status,
      fishEntries: validEntries.map(entry => ({
        fish: entry.fish,
        weight: parseFloat(entry.weight),
        rate: parseFloat(entry.amount) // Map `amount` to `rate` for the backend
      }))
    };

    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (response.ok) {
        setSuccessMessage('Order submitted successfully!');
        resetForm();
        fetchPendingOrders();
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Failed to submit order');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setErrorMessage('Error submitting order');
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setPaymentMode('Cash');
    setStatus('Pending');
    setFishEntriesList([{ fish: '', weight: '', amount: '' }]);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleResolveOrder = async (id, resolution) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: resolution }),
      });

      if (response.ok) {
        fetchPendingOrders();
        setSuccessMessage(`Order ${resolution.toLowerCase()} successfully`);
      } else {
        setErrorMessage('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setErrorMessage('Error updating order status');
    }
  };

  const handleAddFishEntry = () => {
    setFishEntriesList([...fishEntriesList, { fish: '', weight: '', amount: '' }]);
  };

  const handleFishChange = (index, key, value) => {
    const updatedEntries = [...fishEntriesList];
    updatedEntries[index][key] = value;
    setFishEntriesList(updatedEntries);
  };

  const handleDeleteFishEntry = (index) => {
    const updatedEntries = fishEntriesList.filter((_, i) => i !== index);
    setFishEntriesList(updatedEntries);
  };

  const calculateTotal = () => {
    return fishEntriesList.reduce((total, entry) => {
      const amount = parseFloat(entry.amount) || 0;
      return total + amount;
    }, 0);
  };

  return (
    <div className="order-details">
      <div className="form-section">
        <h2>Order Details</h2>
        <button
          onClick={() => setShowVisualization(!showVisualization)}
          className="visualization-btn"
        >
          {showVisualization ? 'Hide Visualization' : 'Show Visualization'}
        </button>

        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {showVisualization ? (
          <SalesVisualization />
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className="fish-entry">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="fish-entry">
                <label>Customer Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>

              <div className="fish-entry">
                <label>Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div className="fish-entry">
                <label>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="form-section">
                <h3>Fish Details</h3>
                {fishEntriesList.map((entry, index) => (
                  <div key={index} className="fish-entry">
                    <select
                      value={entry.fish}
                      onChange={(e) => handleFishChange(index, 'fish', e.target.value)}
                      required
                    >
                      <option value="">Select Fish</option>
                      {availableFish.map((fish) => (
                        <option key={fish.id} value={fish.name}>
                          {fish.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={entry.weight}
                      onChange={(e) => handleFishChange(index, 'weight', e.target.value)}
                      placeholder="Weight in kg"
                      step="0.01"
                      min="0"
                      required
                    />
                    <input
                      type="number"
                      value={entry.amount}
                      onChange={(e) => handleFishChange(index, 'amount', e.target.value)}
                      placeholder="Amount in ₹"
                      step="0.01"
                      min="0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteFishEntry(index)}
                      className="delete-fish-btn"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                <button type="button" onClick={handleAddFishEntry} className="add-fish-btn">
                  Add Fish Entry
                </button>
              </div>

              <div className="summary-section">
                <div className="total">
                  Total: ₹{calculateTotal().toFixed(2)}
                </div>
              </div>

              <button type="submit" className="proceed-btn">
                Submit Order
              </button>
            </form>

            <div className="form-section">
              <h3>Pending Orders</h3>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Payment</th>
                      <th>Items</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.customer_name}</td>
                        <td>{order.customer_phone}</td>
                        <td>{order.payment_mode}</td>
                        <td>
                          <ul>
                            {order.items?.map((item, idx) => (
                              <li key={idx}>
                                {item.fish_name} - {item.weight}kg @ ₹{item.rate}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          <select
                            onChange={(e) => handleResolveOrder(order.id, e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>Select Action</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Canceled">Canceled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {pendingOrders.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center">
                          No pending orders
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;