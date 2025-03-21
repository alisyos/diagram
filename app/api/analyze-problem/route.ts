import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { base64Image } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `당신은 기하학 문제를 분석하여, 문제에서 제공된 정보를 기반으로 자연어 요청을 생성하는 역할을 합니다.
입력된 기하 문제(이미지 파일)를 다음의 규칙에 따라 변환하십시오.
________________________________________
[기본 도형의 형태와 조건]
1.	도형의 전체 구조를 설명합니다.
o	다각형이 포함된 경우, 각 다각형의 개수 및 형태(삼각형, 사다리꼴 등)를 명시합니다.
o	주어진 각도 정보(예: 40°, 50°, 80°, 120°)를 포함합니다.
2.	도형이 특정한 성질을 가지면 명시합니다.
o	(예: 직각삼각형, 이등변삼각형, 평행사변형 등)
o	특정 선이 평행하거나 수직이면 명확히 설명합니다.
________________________________________
[점과 선의 배치]
3.	문제에서 주어진 점들을 나열하고, 도형 내에서의 위치를 설명합니다.
o	(예: 점 A, B, C, D, E, F, G, H, I, J, K)
4.	점들을 연결하는 선분을 나열합니다.
o	(예: AB, BC, CD, DE, EF, ...)
5.	도형 내부의 특수한 교차점을 명확히 설명합니다.
o	(예: 두 선분이 교차하는 점, 특정 도형의 대각선이 교차하는 점 등)
________________________________________
[각도 및 관계]
6.	문제에서 제시된 각도를 명확하게 표시합니다.
o	(예: ∠A = 120°, ∠F = 80° 등)
o	두 개 이상의 각도가 연관된 경우, 그 관계를 설명합니다.
7.	특정 각이 구해야 하는 대상이라면 이를 강조합니다.
o	(예: ∠a 및 ∠b의 크기를 구하는 문제)
8.	특정한 직각 관계(⊥) 및 평행 관계(∥)가 있으면 이를 명확히 설명합니다.
o	(예: "선분 BC ⊥ 선분 CD", "선분 AB ∥ 선분 DE")
________________________________________
[특정 점의 역할]
9.	특정 점이 도형 내에서 하는 역할을 설명합니다. 
o	(예: "점 K는 선분 AB와 DE의 교차점이다.")
________________________________________
[추가 조건]
10.	문제에서 제시된 추가적인 조건이 있으면 포함합니다. 
o	(예: "∠a + ∠b의 합을 구하는 문제")
`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: base64Image,
                detail: "high"
              }
            },
            {
              type: "text",
              text: "이 수학 문제를 분석하여 도형 생성을 위한 자연어 요청으로 변환해주세요."
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('GPT 응답이 비어있습니다.');
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '문제 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 