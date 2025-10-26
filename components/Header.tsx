
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center p-4 md:p-6 mb-4">
      <h1 className="text-5xl md:text-6xl font-extrabold text-gray-100 tracking-tight">
        Aura <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-teal-400 bg-clip-text text-transparent">Reflect</span>
      </h1>
      <p className="mt-3 text-md md:text-lg text-gray-400 max-w-2xl mx-auto">
        Refleja tus ideas y emociones en un lienzo visual generado por IA.
      </p>
    </header>
  );
};

export default Header;
