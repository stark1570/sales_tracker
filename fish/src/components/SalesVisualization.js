import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; // Import the xlsx library

const SalesVisualization = () => {
  const [orders, setOrders] = useState([]);
  const [availableFish, setAvailableFish] = useState([]);
  const [filter, setFilter] = useState({
    status: '',
    paymentMode: '',
    fishName: ''
  });
  const [totals, setTotals] = useState({
    totalAmount: 0,
    totalInvestment: 0,
    profit: 0
  });

  // Fetch orders based on filters
  const fetchOrders = async () => {
    try {
      let url = 'http://localhost:5000/api/orders';
      const params = new URLSearchParams();
      
      if (filter.status) params.append('status', filter.status);
      if (filter.paymentMode) params.append('payment_mode', filter.paymentMode);
      if (filter.fishName) params.append('fish_name', filter.fishName);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Fetch available fish names
  const fetchAvailableFish = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fish-entries');
      const data = await response.json();
      setAvailableFish(data);
    } catch (error) {
      console.error('Error fetching fish entries:', error);
    }
  };

  // Fetch totals based on filters
  const fetchTotals = async () => {
    try {
      let url = 'http://localhost:5000/api/orders/totals';
      const params = new URLSearchParams();
      
      if (filter.status) params.append('status', filter.status);
      if (filter.paymentMode) params.append('payment_mode', filter.paymentMode);
      if (filter.fishName) params.append('fish_name', filter.fishName);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      // Ensure all values are numbers, defaulting to 0 if null or undefined
      setTotals({
        totalAmount: data.total_amount || 0,
        totalInvestment: data.total_investment || 0,
        profit: data.profit || 0
      });
    } catch (error) {
      console.error('Error fetching totals:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchAvailableFish();
    fetchTotals();
  }, [filter]);

  // Calculate total based on the `rate` field
  const calculateTotal = (items) => {
    return items.reduce((total, item) => total + (item.rate || 0), 0);
  };

  // Get CSS class for status badges
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Resolved':
        return 'status-badge resolved';
      case 'Pending':
        return 'status-badge pending';
      case 'Canceled':
        return 'status-badge canceled';
      default:
        return 'status-badge';
    }
  };

  // Export data to Excel
  const exportToExcel = () => {
    // Prepare the data for the Excel file
    const worksheetData = orders.map((order) => ({
      Date: order.order_date,
      Customer: order.customer_name,
      Phone: order.customer_phone,
      Payment: order.payment_mode,
      Status: order.status,
      Items: order.items.map((item) => `${item.fish_name} - ${item.weight}kg @ ₹${item.rate}/kg`).join(', '),
      Total: calculateTotal(order.items).toFixed(2)
    }));

    // Add totals to the worksheet data
    worksheetData.push({});
    worksheetData.push({
      Date: 'Totals',
      Total: `₹${totals.totalAmount.toFixed(2)}`,
      Investment: `₹${totals.totalInvestment.toFixed(2)}`,
      Profit: `₹${totals.profit.toFixed(2)}`
    });

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Create a workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Data');

    // Export the workbook to an Excel file
    XLSX.writeFile(workbook, 'sales_data.xlsx');
  };

  return (
    <div className="sales-visualization">
      <div className="form-section">
        <h2>Sales Visualization</h2>
        <div className="filter-section">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
            <option value="Canceled">Canceled</option>
          </select>
          
          <select
            value={filter.paymentMode}
            onChange={(e) => setFilter({ ...filter, paymentMode: e.target.value })}
          >
            <option value="">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
          </select>
          
          <select
            value={filter.fishName}
            onChange={(e) => setFilter({ ...filter, fishName: e.target.value })}
          >
            <option value="">All Fish</option>
            {availableFish.map((fish) => (
              <option key={fish.id} value={fish.name}>
                {fish.name}
              </option>
            ))}
          </select>
        </div>

        <div className="totals-section">
          <p>Total Amount: ₹{(totals.totalAmount || 0).toFixed(2)}</p>
          <p>Total Investment: ₹{(totals.totalInvestment || 0).toFixed(2)}</p>
          <p>Profit: ₹{(totals.profit || 0).toFixed(2)}</p>
        </div>

        <button type="button" onClick={exportToExcel} className="export-btn">
          Export to Excel
        </button>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.order_date}</td>
                  <td>{order.customer_name}</td>
                  <td>{order.customer_phone}</td>
                  <td>{order.payment_mode}</td>
                  <td>
                    <span className={getStatusBadgeClass(order.status)}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <ul>
                      {order.items.map((item, idx) => (
                        <li key={idx}>
                          {item.fish_name} - {item.weight}kg @ ₹{item.rate}/kg
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="text-right">
                    ₹{calculateTotal(order.items).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesVisualization;