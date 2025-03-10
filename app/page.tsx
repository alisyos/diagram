'use client';

import { useState } from 'react';
import GeometryRenderer from './components/GeometryRenderer';

export default function Home() {
  const [input, setInput] = useState('');
  const [geometryData, setGeometryData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate-geometry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: input }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '도형 생성 중 오류가 발생했습니다.');
      }

      setGeometryData(data);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : '도형 생성 중 오류가 발생했습니다.');
      setGeometryData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">수학 도형 생성기</h1>
        
        <form onSubmit={handleSubmit} className="mb-8">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-40 p-4 border rounded-lg mb-4"
            placeholder="문제 텍스트를 입력하세요..."
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? '도형 생성 중...' : '도형 생성'}
          </button>
        </form>

        <div className="border rounded-lg p-4">
          {error ? (
            <div className="text-center text-red-500">
              {error}
            </div>
          ) : geometryData ? (
            <GeometryRenderer data={geometryData} />
          ) : (
            <div className="text-center text-gray-500">
              도형이 여기에 표시됩니다
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
