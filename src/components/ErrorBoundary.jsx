import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center">
          <p className="text-6xl mb-4">😅</p>
          <h1 className="text-2xl font-extrabold text-gray-800 mb-2">¡Ups! Algo ha fallado</h1>
          <p className="text-gray-500 mb-6">No pasa nada, vamos a volver a empezar.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-lg font-bold rounded-2xl shadow-lg transition-all"
          >
            Recargar 🔄
          </button>
        </div>
      </div>
    );
  }
}
