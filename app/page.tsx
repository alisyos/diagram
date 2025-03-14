'use client';

import { useState, useCallback } from 'react';
import GeometryRenderer from './components/GeometryRenderer';
import type { GeometryData } from './types';

// 기본 도형 데이터 정의
const defaultGeometryData: GeometryData = {
  points: [
    { label: 'A', x: 0, y: 0, visible: true },
    { label: 'B', x: 5, y: 0, visible: true },
    { label: 'C', x: 2.5, y: 4, visible: true }
  ],
  lines: [
    { start: 'A', end: 'B', showLength: true, length: 5 },
    { start: 'B', end: 'C', showLength: true, length: 5 },
    { start: 'C', end: 'A', showLength: true, length: 5 }
  ],
  angles: [],
  circles: [],
  curves: []
};

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzedText, setAnalyzedText] = useState<string>('');
  const [userText, setUserText] = useState<string>('');
  const [geometryData, setGeometryData] = useState<GeometryData>(defaultGeometryData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미지 드래그 영역 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Image = reader.result as string;
        setImagePreview(base64Image);

        // 이미지 분석 API 호출
        try {
          setIsLoading(true);
          const response = await fetch('/api/analyze-problem', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              base64Image: base64Image 
            }),
          });

          if (!response.ok) {
            throw new Error('이미지 분석에 실패했습니다.');
          }

          const data = await response.json();
          setAnalyzedText(data.content);
          setUserText(data.content);
        } catch (err) {
          setError(err instanceof Error ? err.message : '이미지 분석 중 오류가 발생했습니다.');
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Image = reader.result as string;
        setImagePreview(base64Image);

        // 이미지 분석 API 호출
        try {
          setIsLoading(true);
          const response = await fetch('/api/analyze-problem', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              base64Image: base64Image 
            }),
          });

          if (!response.ok) {
            throw new Error('이미지 분석에 실패했습니다.');
          }

          const data = await response.json();
          setAnalyzedText(data.content);
          setUserText(data.content);
        } catch (err) {
          setError(err instanceof Error ? err.message : '이미지 분석 중 오류가 발생했습니다.');
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateGeometry = async () => {
    if (!userText) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-geometry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: userText }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setGeometryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '도형 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataChange = (newData: GeometryData) => {
    setGeometryData(newData);
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-center mb-8">수학 도형 생성기</h1>
        
        {/* 이미지 선택 및 드래그 영역 */}
        <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
          <button
            onClick={() => document.getElementById('imageInput')?.click()}
            className="bg-blue-500 text-white px-4 py-2 rounded mb-2"
          >
            이미지 선택
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="imageInput"
          />
          <div className="text-gray-500 text-sm">
            또는 이미지를 이 영역에 드래그하여 놓으세요
          </div>
          {imagePreview && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full max-h-64 mx-auto"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 분석된 요청 내용 */}
          <div>
            <h3 className="font-bold mb-2">분석된 요청 내용:</h3>
            <div className="bg-gray-50 p-4 rounded-lg h-[200px] overflow-auto">
              <p className="whitespace-pre-wrap">{analyzedText || '분석된 내용이 여기에 표시됩니다.'}</p>
            </div>
          </div>

          {/* 요청 내용 수정하기 */}
          <div>
            <h3 className="font-bold mb-2">요청 내용 수정하기:</h3>
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              className="w-full h-[200px] p-4 border rounded-lg resize-none"
              placeholder="도형 생성을 위한 요청 내용을 수정하세요..."
            />
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleGenerateGeometry}
            disabled={isLoading}
            className="bg-blue-500 text-white px-8 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? '생성 중...' : '도형 생성'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {analyzedText && !geometryData && (
          <div className="p-4 bg-blue-100 text-blue-700 rounded-lg mb-4">
            <p className="font-bold">분석이 완료되었습니다!</p>
            <p>분석된 내용을 확인하고 필요한 경우 수정한 후, 아래 "도형 생성" 버튼을 클릭하세요.</p>
          </div>
        )}

        {/* 생성된 도형 - 항상 표시되도록 수정 */}
        <div className="w-full">
          <h2 className="text-xl font-bold mb-4">생성된 도형</h2>
          <GeometryRenderer 
            data={geometryData} 
            onDataChange={handleDataChange}
          />
        </div>
      </div>
    </main>
  );
}
