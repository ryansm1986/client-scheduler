import React from 'react';

const Home = () => {
  return (
    <div className="container mx-auto px-6 py-12 bg-gradient-to-b from-indigo-50 to-white min-h-screen flex items-center justify-center">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 animate-fade-in">
          Welcome to Client Scheduler
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Streamline your client management and scheduling with a sleek, intuitive interface designed for efficiency.
        </p>
        <a
          href="/schedule"
          className="inline-block bg-indigo-600 text-white py-3 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 transform hover:-translate-y-1"
        >
          Start Scheduling
        </a>
      </div>
    </div>
  );
};

export default Home;

// Add this to src/index.css for the animation
/*
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 1s ease-in-out;
}
*/