import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface GeometryData {
  points: { x: number; y: number; label: string }[];
  lines: { start: string; end: string }[];
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

    // 좌표 변환을 위한 스케일 설정
    const xScale = d3.scaleLinear()
      .domain([0, 10])
      .range([padding, width - padding]);

    const yScale = d3.scaleLinear()
      .domain([0, 10])
      .range([height - padding, padding]);

    // 선 그리기
    data.lines.forEach(line => {
      const startPoint = data.points.find(p => p.label === line.start);
      const endPoint = data.points.find(p => p.label === line.end);
      
      if (startPoint && endPoint) {
        svg.append('line')
          .attr('x1', xScale(startPoint.x))
          .attr('y1', yScale(startPoint.y))
          .attr('x2', xScale(endPoint.x))
          .attr('y2', yScale(endPoint.y))
          .attr('stroke', 'black')
          .attr('stroke-width', 1);
      }
    });

    // 점 그리기
    data.points.forEach(point => {
      svg.append('circle')
        .attr('cx', xScale(point.x))
        .attr('cy', yScale(point.y))
        .attr('r', 3)
        .attr('fill', 'black');

      // 점 라벨 추가
      svg.append('text')
        .attr('x', xScale(point.x) + 10)
        .attr('y', yScale(point.y) - 10)
        .text(point.label)
        .attr('font-size', '12px');
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