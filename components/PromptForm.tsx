
import React, { useState } from 'react';

interface PromptFormProps {
  onSubmit: (prompt: string, aspectRatio: string, temperature: number) => void;
  isLoading: boolean;
}

const ASPECT_RATIOS = ['Auto', '1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9'];

const PromptForm: React.FC<PromptFormProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [temperature, setTemperature] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt, aspectRatio, temperature);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-black/20 p-6 rounded-xl shadow-2xl border border-purple-500/20 backdrop-blur-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-lg font-medium text-gray-300 mb-2">
            Introduce una emoción, tema o idea
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={3}
            className="w-full bg-black/30 border border-purple-500/30 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 placeholder-gray-500"
            placeholder="Ej: 'Una tarde lluviosa en Tokio', 'calma y serenidad', 'cyberpunk nostálgico'..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="aspectRatio" className="block text-lg font-medium text-gray-300 mb-2">
                    Relación de Aspecto
                </label>
                <select
                    id="aspectRatio"
                    name="aspectRatio"
                    className="w-full bg-black/30 border border-purple-500/30 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    disabled={isLoading}
                >
                    {ASPECT_RATIOS.map(ratio => (
                    <option key={ratio} value={ratio} className="bg-gray-900 text-white">
                        {ratio}
                    </option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="temperature" className="block text-lg font-medium text-gray-300 mb-2">
                    Temperatura ({temperature.toFixed(1)})
                </label>
                <input
                    type="range"
                    id="temperature"
                    name="temperature"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    disabled={isLoading}
                />
            </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center shadow-lg shadow-purple-600/20 hover:shadow-xl hover:shadow-purple-500/30"
        >
          {isLoading ? 'Generando...' : 'Generar Moodboard'}
        </button>
      </form>
    </div>
  );
};

export default PromptForm;
