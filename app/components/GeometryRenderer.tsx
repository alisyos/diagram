import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Point {
  x: number;
  y: number;
  label: string;
}

interface Line {
  start: string;
  end: string;
  length?: number;
  showLength?: boolean;
}

interface GeometryData {
  points: Point[];
  lines: Line[];
}

interface Props {
  data: GeometryData;
}

const GeometryRenderer = ({ data }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;
    const padding = 50;

    // 도형의 경계 계산
    const xMin = Math.min(...data.points.map(p => p.x));
    const xMax = Math.max(...data.points.map(p => p.x));
    const yMin = Math.min(...data.points.map(p => p.y));
    const yMax = Math.max(...data.points.map(p => p.y));

    // 도형의 크기
    const shapeWidth = xMax - xMin;
    const shapeHeight = yMax - yMin;

    // 스케일 조정 (여백을 고려한 중앙 정렬)
    const xScale = d3.scaleLinear()
      .domain([xMin - shapeWidth * 0.1, xMax + shapeWidth * 0.1])
      .range([padding, width - padding]);

    const yScale = d3.scaleLinear()
      .domain([yMin - shapeHeight * 0.1, yMax + shapeHeight * 0.1])
      .range([height - padding, padding]);

    // 선 그리기
    data.lines.forEach(line => {
      const startPoint = data.points.find(p => p.label === line.start);
      const endPoint = data.points.find(p => p.label === line.end);
      
      if (startPoint && endPoint) {
        // 선분 그리기
        svg.append('line')
          .attr('x1', xScale(startPoint.x))
          .attr('y1', yScale(startPoint.y))
          .attr('x2', xScale(endPoint.x))
          .attr('y2', yScale(endPoint.y))
          .attr('stroke', 'black')
          .attr('stroke-width', 1);

        // 길이 표시
        if (line.showLength && line.length !== undefined) {
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;
          
          // 선분의 방향 벡터 계산
          const dx = endPoint.x - startPoint.x;
          const dy = endPoint.y - startPoint.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          
          // 수직 방향 벡터 계산
          const perpX = -dy / length;
          const perpY = dx / length;
          
          // 길이 표시 위치 계산 (선분 바깥쪽)
          const offset = 0.3; // 선분으로부터의 거리
          const textX = midX + perpX * offset;
          const textY = midY + perpY * offset;

          // 길이 텍스트
          svg.append('text')
            .attr('x', xScale(textX))
            .attr('y', yScale(textY))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '12px')
            .text(line.length.toString());
        }
      }
    });

    // 점 그리기
    data.points.forEach(point => {
      // 점
      svg.append('circle')
        .attr('cx', xScale(point.x))
        .attr('cy', yScale(point.y))
        .attr('r', 3)
        .attr('fill', 'black');

      // 점 라벨
      svg.append('text')
        .attr('x', xScale(point.x))
        .attr('y', yScale(point.y) - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text(point.label);
    });
  }, [data]);

  return (
    <svg
      ref={svgRef}
      width="600"
      height="400"
      className="mx-auto border rounded-lg"
    />
  );
};

export default GeometryRenderer; 