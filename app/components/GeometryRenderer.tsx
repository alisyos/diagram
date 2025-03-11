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

interface Circle {
  center: string;
  radius: number;
  showRadius?: boolean;
}

interface GeometryData {
  points: Point[];
  lines: Line[];
  circles: Circle[];
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

    // 도형의 경계 계산 (원의 반지름도 고려)
    const points = data.points;
    const circles = data.circles || [];
    
    const xMin = Math.min(...points.map(p => p.x), ...circles.map(c => {
      const center = points.find(p => p.label === c.center);
      return center ? center.x - c.radius : Infinity;
    }));
    const xMax = Math.max(...points.map(p => p.x), ...circles.map(c => {
      const center = points.find(p => p.label === c.center);
      return center ? center.x + c.radius : -Infinity;
    }));
    const yMin = Math.min(...points.map(p => p.y), ...circles.map(c => {
      const center = points.find(p => p.label === c.center);
      return center ? center.y - c.radius : Infinity;
    }));
    const yMax = Math.max(...points.map(p => p.y), ...circles.map(c => {
      const center = points.find(p => p.label === c.center);
      return center ? center.y + c.radius : -Infinity;
    }));

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

    // 원 그리기
    circles.forEach(circle => {
      const centerPoint = points.find(p => p.label === circle.center);
      if (centerPoint) {
        // 원 그리기
        svg.append('circle')
          .attr('cx', xScale(centerPoint.x))
          .attr('cy', yScale(centerPoint.y))
          .attr('r', xScale(centerPoint.x + circle.radius) - xScale(centerPoint.x))
          .attr('stroke', 'black')
          .attr('fill', 'none')
          .attr('stroke-width', 1);

        // 반지름 표시
        if (circle.showRadius) {
          // 반지름 선 그리기
          svg.append('line')
            .attr('x1', xScale(centerPoint.x))
            .attr('y1', yScale(centerPoint.y))
            .attr('x2', xScale(centerPoint.x + circle.radius))
            .attr('y2', yScale(centerPoint.y))
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4');

          // 반지름 텍스트
          svg.append('text')
            .attr('x', xScale(centerPoint.x + circle.radius / 2))
            .attr('y', yScale(centerPoint.y) - 10)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '12px')
            .text(circle.radius.toString());
        }
      }
    });

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