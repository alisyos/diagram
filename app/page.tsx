'use client';

import { useState, useCallback } from 'react';
import GeometryRenderer from './components/GeometryRenderer';

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzedText, setAnalyzedText] = useState<string>('');
  const [userText, setUserText] = useState<string>('');
  const [geometryData, setGeometryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processImage = async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      // 이미지를 Base64로 변환
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        setImagePreview(base64Image);

        // 이미지 분석 API 호출
        const response = await fetch('/api/analyze-problem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ base64Image }),
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setAnalyzedText(data.content);
        setUserText(data.content);
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
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

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-center">수학 도형 생성기</h1>
        
        {/* 이미지 업로드 섹션 */}
        <div 
          className={`space-y-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="imageUpload"
            />
            <label 
              htmlFor="imageUpload"
              className="cursor-pointer bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              이미지 선택
            </label>
            <p className="mt-2 text-gray-600">
              또는 이미지를 이 영역에 드래그하여 놓으세요
            </p>
          </div>
          
          {imagePreview && (
            <div className="flex justify-center mt-4">
              <img
                src={imagePreview}
                alt="업로드된 문제"
                className="max-w-md border rounded"
              />
            </div>
          )}
        </div>

        {/* 분석된 텍스트와 사용자 수정 가능한 텍스트 영역 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="font-semibold">분석된 요청 내용:</h2>
            <pre className="whitespace-pre-wrap border rounded p-4 bg-gray-50 h-48 overflow-auto">
              {analyzedText}
            </pre>
          </div>
          <div className="space-y-2">
            <h2 className="font-semibold">요청 내용 수정하기:</h2>
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              className="w-full h-48 border rounded p-4 bg-gray-50"
              placeholder="도형 생성을 위한 요청 내용을 수정하세요..."
            />
          </div>
        </div>

        {/* 도형 생성 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerateGeometry}
            disabled={isLoading}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? '처리 중...' : '도형 생성'}
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="text-red-500 text-center">
            {error}
          </div>
        )}

        {/* 생성된 도형 */}
        {geometryData && (
          <div className="border rounded p-4">
            <GeometryRenderer data={geometryData} />
          </div>
        )}
      </div>
    </main>
  );
}
