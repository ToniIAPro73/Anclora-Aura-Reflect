import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MockedFunction } from 'vitest';
import { describe, beforeEach, it, expect, vi } from 'vitest';

vi.mock('../services/geminiService', () => ({
  generateInitialImages: vi.fn(),
  refineImages: vi.fn(),
}));

import App from '../App';
import { generateInitialImages, refineImages } from '../services/geminiService';

const mockedGenerate = generateInitialImages as MockedFunction<typeof generateInitialImages>;
const mockedRefine = refineImages as MockedFunction<typeof refineImages>;

const setupPromptSubmission = async () => {
  const user = userEvent.setup();
  render(<App />);

  const promptField = screen.getAllByLabelText(/Introduce una emoción/i)[0];
  const aspectRatioSelect = screen.getAllByLabelText(/Relación de Aspecto/i)[0];
  const temperatureSlider = screen.getAllByLabelText(/Temperatura/i)[0];
  const submitButton = screen.getAllByRole('button', { name: /Generar Moodboard/i })[0];

  await user.type(promptField, 'Lluvia futurista en neón');
  await user.selectOptions(aspectRatioSelect, '1:1');
  fireEvent.change(temperatureSlider, { target: { value: '0.7' } });
  await user.click(submitButton);

  return { user };
};

describe('App backend contract handling', () => {
  beforeEach(() => {
    mockedGenerate.mockReset();
    mockedRefine.mockReset();
  });

  it('renders generated images when the backend resolves successfully', async () => {
    mockedGenerate.mockResolvedValue(['initial-image-a', 'initial-image-b']);

    await setupPromptSubmission();

    await waitFor(() => {
      expect(mockedGenerate).toHaveBeenCalledWith(
        'Lluvia futurista en neón',
        '1:1',
        0.7,
      );
    });

    const generatedImages = await screen.findAllByRole('img', { name: /Generated moodboard/i });
    expect(generatedImages).toHaveLength(2);
    expect(generatedImages[0]).toHaveAttribute('src', 'data:image/png;base64,initial-image-a');
  });

  it('surfaces an error message when the backend generation fails', async () => {
    mockedGenerate.mockRejectedValue(new Error('Backend offline'));

    await setupPromptSubmission();

    const errorAlert = await screen.findAllByRole('alert');
    expect(errorAlert[0]).toHaveTextContent('Failed to generate images. Please try again.');
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it('calls refine API with selected images and updates gallery on success', async () => {
    mockedGenerate.mockResolvedValue(['initial-image-a', 'initial-image-b']);
    mockedRefine.mockResolvedValue(['refined-one', 'refined-two']);

    const { user } = await setupPromptSubmission();

    const initialImages = await screen.findAllByRole('img', { name: /Generated moodboard/i });
    await user.click(initialImages[0]);

    const refineInput = screen.getAllByPlaceholderText(/combinar estilos/i)[0];
    await user.type(refineInput, 'Más contraste y textura');
    const refineButton = screen.getAllByRole('button', { name: /Refinar/i })[0];
    await user.click(refineButton);

    await waitFor(() => {
      expect(mockedRefine).toHaveBeenCalledWith(
        [
          'data:image/png;base64,initial-image-a',
        ],
        'Más contraste y textura',
      );
    });

    await waitFor(() => {
      const refinedImages = screen.getAllByRole('img', { name: /Generated moodboard/i });
      expect(refinedImages[0]).toHaveAttribute('src', 'data:image/png;base64,refined-one');
    });
  });

  it('shows an error and keeps previous images when refinement fails', async () => {
    mockedGenerate.mockResolvedValue(['initial-image-a', 'initial-image-b']);
    mockedRefine.mockImplementation(async () => {
      throw new Error('Timeout');
    });

    const { user } = await setupPromptSubmission();

    const generatedImages = await screen.findAllByRole('img', { name: /Generated moodboard/i });
    const initialSrcs = generatedImages.map(image => image.getAttribute('src'));
    await user.click(generatedImages[0]);

    const refineInput = screen.getAllByPlaceholderText(/combinar estilos/i)[0];
    await user.type(refineInput, 'Más luces cálidas');
    const refineButton = screen.getAllByRole('button', { name: /Refinar/i })[0];
    await user.click(refineButton);

    const errorAlert = await screen.findAllByRole('alert');
    expect(errorAlert[0]).toHaveTextContent('Failed to refine images. Please try again.');

    const persistedImages = screen.getAllByRole('img', { name: /Generated moodboard/i });
    const persistedSrcs = persistedImages.map(image => image.getAttribute('src'));
    expect(persistedSrcs).toEqual(initialSrcs);
  });
});
