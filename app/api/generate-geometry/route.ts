import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 마크다운 코드 블록 표시를 제거하는 함수
function cleanMarkdownCodeBlock(content: string): string {
  return content
    .replace(/^```json\n/, '')  // 시작 부분의 ```json 제거
    .replace(/\n```$/, '')      // 끝 부분의 ``` 제거
    .trim();                    // 앞뒤 공백 제거
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: `당신은 수학 문제의 도형을 분석하여 JSON 형식으로 변환하는 전문가입니다.

주어진 문제를 분석하여 다음을 수행하세요:
1. 문제에서 언급된 모든 점들을 식별합니다.
2. 문제에서 명시적으로 언급된 선분들을 식별합니다.
3. 도형의 특성(평행, 수직, 길이 비율 등)을 분석합니다.
4. 모든 기하학적 조건을 만족하는 좌표를 계산합니다.

직각삼각형 처리 방법:
1. 직각이 있는 꼭지점을 기준점으로 설정합니다.
2. 이 점에서 수직/수평으로 다른 두 점을 배치합니다.
예시:
- 상단에 직각이 있는 경우: 상단 점을 (0,4)로 하고, 하단 두 점을 (-3,0), (3,0)과 같이 배치
- 하단에 직각이 있는 경우: 하단 점을 (0,0)으로 하고, 다른 두 점을 (-3,4), (3,4)와 같이 배치

응답은 반드시 다음 JSON 형식으로만 제공하세요:
{
  "points": [
    {"x": number, "y": number, "label": string}  // 각 점의 좌표와 라벨 (좌표는 소수점으로 표현)
  ],
  "lines": [
    {
      "start": string,      // 시작점 라벨
      "end": string,        // 끝점 라벨
      "length": number,     // 선분의 길이 (선택적)
      "showLength": boolean // 길이를 표시할지 여부, 기본값 false
    }
  ]
}

좌표 생성 시 주의사항:
- 모든 점의 좌표는 소수점 형태로 표현하세요 (예: 5.333333)
- 직각삼각형의 경우 반드시 한 변은 x축에 평행하게, 다른 한 변은 y축에 평행하게 좌표를 설정하세요
- 도형의 특성(평행, 길이 비율 등)이 정확히 반영되어야 합니다
- 불필요한 점이나 선분을 추가하지 마세요
- 문제에서 요구하는 모든 기하학적 조건을 만족해야 합니다
- 문제에서 명시적으로 길이가 주어진 경우에만 해당 선분의 showLength를 true로 설정하세요
- 단순히 도형을 구성하는 선분의 경우 showLength는 false로 설정하세요

마크다운 코드 블록이나 다른 설명 없이 순수한 JSON 형식으로만 응답하세요.`
        },
        {
          role: "user",
          content: `다음 도형 문제를 분석하여 적절한 좌표를 생성해주세요. 주어진 길이는 반드시 도형에 표시되어야 합니다:

${text}

주어진 문제의 모든 기하학적 조건을 정확히 반영해주세요.`
        }
      ]
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('GPT 응답이 비어있습니다.');
    }

    try {
      const cleanContent = cleanMarkdownCodeBlock(content);
      // 분수 형태의 표현을 계산된 소수점으로 변환
      const normalizedContent = cleanContent.replace(/(-?\d+)\/(\d+)/g, (_, num, den) => (Number(num) / Number(den)).toString());
      const geometryData = JSON.parse(normalizedContent);
      
      if (!geometryData.points || !geometryData.lines) {
        throw new Error('잘못된 도형 데이터 형식입니다.');
      }
      return NextResponse.json(geometryData);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', content);
      throw new Error('도형 데이터 파싱에 실패했습니다.');
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '도형 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 