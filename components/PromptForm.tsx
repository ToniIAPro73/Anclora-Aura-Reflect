import React, { useState } from 'react';
import { LocalEngineConfig, EngineMode } from '../types';

interface PromptFormProps {
  onSubmit: (prompt: string, aspectRatio: string, temperature: number) => void;
  isLoading: boolean;
  engineConfig: LocalEngineConfig;
  onConfigChange: (config: LocalEngineConfig) => void;
  engineMode: EngineMode;
  onEngineModeChange: (mode: EngineMode) => void;
}

const ASPECT_RATIOS = ['Auto', '1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9'];

const PromptForm: React.FC<PromptFormProps> = ({ onSubmit, isLoading, engineConfig, onConfigChange, engineMode, onEngineModeChange }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [temperature, setTemperature] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt, aspectRatio, temperature);
    }
  };

  const updateConfig = (updates: Partial<LocalEngineConfig>) => {
    onConfigChange({
      ...engineConfig,
      ...updates,
    });
  };

  return (
    <div className="glass-card hover-glow w-full mx-auto p-4 rounded-2xl flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
        <div>
          <label htmlFor="prompt" className="block text-sm md:text-base font-medium text-gray-200 mb-2">
            ¿Qué quieres expresar?
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={2}
            className="w-full bg-black/30 border border-white/10 rounded-xl p-2 text-gray-100 text-sm md:text-base leading-relaxed focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 placeholder-gray-500"
            placeholder="Ej: 'Una tarde lluviosa en Tokio', 'calma y serenidad', 'cyberpunk nostálgico'..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="engineMode" className="block text-sm font-medium text-gray-300 mb-2">
              Motor de generación
            </label>
            <select
              id="engineMode"
              name="engineMode"
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
              value={engineMode}
              onChange={(e) => onEngineModeChange(e.target.value as EngineMode)}
              disabled={isLoading}
            >
              <option value={EngineMode.AUTO} className="bg-gray-900 text-white">Auto (fallback)</option>
              <option value={EngineMode.LOCAL} className="bg-gray-900 text-white">Local</option>
              <option value={EngineMode.CLOUD} className="bg-gray-900 text-white">Cloud</option>
            </select>
          </div>

          <div>
            <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-2">
              Relación de Aspecto
            </label>
            <select
              id="aspectRatio"
              name="aspectRatio"
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="temperature" className="block text-sm font-medium text-gray-300 mb-2">
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

        <div className="bg-black/10 border border-white/10 rounded-lg p-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(prev => !prev)}
            className="w-full text-left text-sm font-semibold text-purple-300 flex items-center justify-between"
            disabled={isLoading}
          >
            Ajustes del motor local
            <span className="text-xs text-purple-200">{showAdvanced ? 'Ocultar' : 'Mostrar'}</span>
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="modelPath" className="block text-sm font-medium text-gray-300 mb-1">
                  Ruta del modelo (opcional)
                </label>
                <input
                  type="text"
                  id="modelPath"
                  name="modelPath"
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 placeholder-gray-500"
                  placeholder="Ej: /models/stable-diffusion-v1.5"
                  value={engineConfig.modelPath ?? ''}
                  onChange={(e) => updateConfig({ modelPath: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="steps" className="block text-sm font-medium text-gray-300 mb-1">
                    Número de pasos {engineConfig.steps ?? 20}
                  </label>
                  <input
                    type="range"
                    id="steps"
                    name="steps"
                    min="10"
                    max="150"
                    step="5"
                    value={engineConfig.steps ?? 20}
                    onChange={(e) => updateConfig({ steps: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="guidanceScale" className="block text-sm font-medium text-gray-300 mb-1">
                    Escalado de guía {engineConfig.guidanceScale?.toFixed(1) ?? '7.5'}
                  </label>
                  <input
                    type="range"
                    id="guidanceScale"
                    name="guidanceScale"
                    min="0"
                    max="15"
                    step="0.5"
                    value={engineConfig.guidanceScale ?? 7.5}
                    onChange={(e) => updateConfig({ guidanceScale: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto mb-2">
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center shadow-lg shadow-purple-600/20 hover:shadow-xl hover:shadow-purple-500/30"
          >
            {isLoading ? 'Generando...' : 'Generar Moodboard'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromptForm;
