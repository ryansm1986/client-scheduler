import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/clients');
      setClients(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/clients', form);
      fetchClients();
      setForm({ name: '', email: '', phone: '' });
      setError(null);
    } catch (err) {
      console.error('Error adding client:', err);
      setError('Failed to add client. Please check your input.');
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Manage Clients</h1>
      {error && <p className="text-red-500 text-center mb-6">{error}</p>}

      {/* Form Section */}
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md mx-auto mb-10 transform transition duration-300 hover:shadow-xl">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Add New Client</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              placeholder="123-456-7890"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition duration-300 transform hover:-translate-y-1"
          >
            Add Client
          </button>
        </form>
      </div>

      {/* Client List */}
      {clients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300 transform hover:-translate-y-1"
            >
              <h3 className="text-xl font-semibold text-gray-800">{client.name}</h3>
              <p className="text-gray-600 mt-2">{client.email}</p>
              <p className="text-gray-600">{client.phone}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center">No clients found. Add one to get started!</p>
      )}
    </div>
  );
};

export default Clients;