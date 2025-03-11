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
이미지 파일 형태로 공유되는 입력된 기하 문제를 다음의 규칙에 따라 변환하십시오.

[기본 도형의 형태와 조건]
문제에서 제시된 도형의 종류를 명확하게 설명합니다. (예: 평행사변형, 사다리꼴, 삼각형 등)
도형이 특정한 성질을 가지면 명시합니다. (예: 직각삼각형, 정사각형, 직사각형 등)

[점의 배치]
문제에서 주어진 점들을 도형 내에서 어디에 위치하는지 설명합니다.
주요 점들이 연결되는 방법을 나열합니다.

[선분의 특성]
문제에서 주어진 선분과 그 길이를 포함합니다.
특정한 비율 관계가 있으면 명시합니다.

[직각 관계 및 평행 관계]
문제에서 언급된 직각 관계(⊥) 및 평행 관계(∥)를 포함합니다.

[특정 점의 역할]
특정 점이 도형 내에서 하는 역할을 설명합니다. (예: 선의 중점, 연장선과의 교점 등)

[추가 조건]
문제에서 주어진 특별한 조건이 있으면 포함합니다.

응답은 번호가 매겨진 목록 형태로 제공하세요.`
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