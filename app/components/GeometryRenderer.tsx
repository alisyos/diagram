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

interface Angle {
  vertex: string;
  start: string;
  end: string;
  value: number;
  showValue: boolean;
}

interface Circle {
  center: string;
  radius: number;
  showRadius?: boolean;
}

interface GeometryData {
  points: Point[];
  lines: Line[];
  angles: Angle[];
  circles: Circle[];
}

interface Props {
  data: GeometryData;
  onDataChange?: (newData: GeometryData) => void;
}

const GeometryRenderer = ({ data, onDataChange }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // 데이터를 보기 좋게 포맷하는 함수
  const formatPoint = (point: Point) => {
    return `${point.label}(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
  };

  const formatLine = (line: Line) => {
    return `${line.start}${line.end}: ${line.length ? line.length.toFixed(2) : '길이 미표시'}`;
  };

  const formatAngle = (angle: Angle) => {
    return `∠${angle.vertex}${angle.start}${angle.end}: ${angle.value}°`;
  };

  const formatCircle = (circle: Circle) => {
    return `원 ${circle.center}: 반지름 ${circle.radius.toFixed(2)}`;
  };

  // 데이터 수정 핸들러
  const handlePointChange = (index: number, field: keyof Point, value: string) => {
    if (!onDataChange) return;
    
    const newPoints = [...data.points];
    if (field === 'label') {
      newPoints[index] = { ...newPoints[index], [field]: value };
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        newPoints[index] = { ...newPoints[index], [field]: numValue };
      }
    }
    
    onDataChange({ ...data, points: newPoints });
  };

  const handleLineChange = (index: number, field: keyof Line, value: string | boolean) => {
    if (!onDataChange) return;
    
    const newLines = [...data.lines];
    if (field === 'start' || field === 'end') {
      newLines[index] = { ...newLines[index], [field]: value as string };
    } else if (field === 'length' && typeof value === 'string') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        newLines[index] = { ...newLines[index], length: numValue };
      }
    } else if (field === 'showLength') {
      newLines[index] = { ...newLines[index], showLength: value as boolean };
    }
    
    onDataChange({ ...data, lines: newLines });
  };

  const handleAngleChange = (index: number, field: keyof Angle, value: string) => {
    if (!onDataChange) return;
    
    const newAngles = [...data.angles];
    if (field === 'vertex' || field === 'start' || field === 'end') {
      newAngles[index] = { ...newAngles[index], [field]: value };
    } else if (field === 'value') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        newAngles[index] = { ...newAngles[index], value: numValue };
      }
    }
    
    onDataChange({ ...data, angles: newAngles });
  };

  const handleCircleChange = (index: number, field: keyof Circle, value: string) => {
    if (!onDataChange) return;
    
    const newCircles = [...data.circles];
    if (field === 'center') {
      newCircles[index] = { ...newCircles[index], [field]: value };
    } else if (field === 'radius') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        newCircles[index] = { ...newCircles[index], radius: numValue };
      }
    }
    
    onDataChange({ ...data, circles: newCircles });
  };

  // 새로운 점 추가 핸들러
  const handleAddPoint = () => {
    if (!onDataChange) return;
    
    const newPoint: Point = {
      label: String.fromCharCode(65 + data.points.length), // A, B, C, ... 순서로 라벨 생성
      x: 0.00,
      y: 0.00
    };
    
    onDataChange({
      ...data,
      points: [...data.points, newPoint]
    });
  };

  // 새로운 선분 추가 핸들러
  const handleAddLine = () => {
    if (!onDataChange || data.points.length < 2) return;
    
    const newLine: Line = {
      start: data.points[0].label,
      end: data.points[1].label,
      showLength: false
    };
    
    onDataChange({
      ...data,
      lines: [...data.lines, newLine]
    });
  };

  // 점 삭제 핸들러
  const handleDeletePoint = (index: number) => {
    if (!onDataChange) return;
    
    const deletedLabel = data.points[index].label;
    
    // 삭제할 점과 연결된 선분, 각도, 원 찾기 및 제거
    const newLines = data.lines.filter(line => 
      line.start !== deletedLabel && line.end !== deletedLabel
    );
    const newAngles = data.angles.filter(angle => 
      angle.vertex !== deletedLabel && angle.start !== deletedLabel && angle.end !== deletedLabel
    );
    const newCircles = data.circles.filter(circle => 
      circle.center !== deletedLabel
    );
    
    const newPoints = data.points.filter((_, idx) => idx !== index);
    
    onDataChange({
      ...data,
      points: newPoints,
      lines: newLines,
      angles: newAngles,
      circles: newCircles
    });
  };

  // 선분 삭제 핸들러
  const handleDeleteLine = (index: number) => {
    if (!onDataChange) return;
    
    const newLines = data.lines.filter((_, idx) => idx !== index);
    onDataChange({
      ...data,
      lines: newLines
    });
  };

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;  // SVG 너비 증가
    const height = 600; // SVG 높이 증가
    const padding = 80; // 여백 증가

    // 도형의 경계 계산
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
      .domain([xMin - shapeWidth * 0.2, xMax + shapeWidth * 0.2]) // 여백 비율 증가
      .range([padding, width - padding]);

    const yScale = d3.scaleLinear()
      .domain([yMin - shapeHeight * 0.2, yMax + shapeHeight * 0.2]) // 여백 비율 증가
      .range([height - padding, padding]);

    // 원 그리기
    data.circles.forEach(circle => {
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
      const startPoint = points.find(p => p.label === line.start);
      const endPoint = points.find(p => p.label === line.end);
      
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

    // 각도 그리기
    data.angles.forEach(angle => {
      const vertexPoint = points.find(p => p.label === angle.vertex);
      const startPoint = points.find(p => p.label === angle.start);
      const endPoint = points.find(p => p.label === angle.end);

      if (vertexPoint && startPoint && endPoint && angle.showValue) {
        // 각도의 두 벡터 계산
        const v1x = startPoint.x - vertexPoint.x;
        const v1y = startPoint.y - vertexPoint.y;
        const v2x = endPoint.x - vertexPoint.x;
        const v2y = endPoint.y - vertexPoint.y;

        // 각도 계산 (라디안)
        const angle1 = Math.atan2(v1y, v1x);
        const angle2 = Math.atan2(v2y, v2x);

        // 호의 반지름
        const radius = Math.min(
          Math.sqrt(v1x * v1x + v1y * v1y),
          Math.sqrt(v2x * v2x + v2y * v2y)
        ) * 0.2; // 벡터 길이의 20%

        // 호 그리기
        const arcGenerator = d3.arc()
          .innerRadius(radius * 0.8)
          .outerRadius(radius)
          .startAngle(Math.min(angle1, angle2))
          .endAngle(Math.max(angle1, angle2));

        // SVG 그룹 생성 및 변환
        const g = svg.append('g')
          .attr('transform', `translate(${xScale(vertexPoint.x)},${yScale(vertexPoint.y)})`);

        // 호 그리기
        g.append('path')
          .attr('d', arcGenerator({} as any))
          .attr('fill', 'black')
          .attr('opacity', 0.2);

        // 각도 표시
        const midAngle = (angle1 + angle2) / 2;
        const textRadius = radius * 1.2;
        const textX = Math.cos(midAngle) * textRadius;
        const textY = -Math.sin(midAngle) * textRadius; // SVG 좌표계는 Y축이 반전됨

        g.append('text')
          .attr('x', textX)
          .attr('y', textY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '12px')
          .text(`${angle.value}°`);
      }
    });

    // 점 그리기
    points.forEach(point => {
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
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full overflow-auto border rounded-lg">
        <svg
          ref={svgRef}
          width="800"
          height="600"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto"
        />
      </div>
      <div className="w-full max-w-2xl p-4 bg-gray-50 rounded-lg shadow-sm space-y-2 text-sm font-mono">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">점 좌표:</h3>
            <button
              onClick={handleAddPoint}
              className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
            >
              점 추가
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {data.points.map((point, idx) => (
              <div key={idx} className="bg-white p-2 rounded grid grid-cols-5 gap-2 items-center">
                <input
                  type="text"
                  value={point.label}
                  onChange={(e) => handlePointChange(idx, 'label', e.target.value)}
                  className="w-full p-1 border rounded text-center"
                />
                <input
                  type="number"
                  value={point.x.toFixed(2)}
                  onChange={(e) => handlePointChange(idx, 'x', e.target.value)}
                  step="0.01"
                  className="w-full p-1 border rounded"
                />
                <input
                  type="number"
                  value={point.y.toFixed(2)}
                  onChange={(e) => handlePointChange(idx, 'y', e.target.value)}
                  step="0.01"
                  className="w-full p-1 border rounded"
                />
                <span className="text-xs text-gray-500">
                  {formatPoint(point)}
                </span>
                <button
                  onClick={() => handleDeletePoint(idx)}
                  className="w-6 h-6 text-red-500 hover:text-red-600 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">선분:</h3>
            <button
              onClick={handleAddLine}
              className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
              disabled={data.points.length < 2}
            >
              선분 추가
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {data.lines.map((line, idx) => (
              <div key={idx} className="bg-white p-2 rounded grid grid-cols-6 gap-2 items-center">
                <input
                  type="text"
                  value={line.start}
                  onChange={(e) => handleLineChange(idx, 'start', e.target.value)}
                  className="w-full p-1 border rounded text-center"
                />
                <input
                  type="text"
                  value={line.end}
                  onChange={(e) => handleLineChange(idx, 'end', e.target.value)}
                  className="w-full p-1 border rounded text-center"
                />
                <input
                  type="number"
                  value={line.length || ''}
                  onChange={(e) => handleLineChange(idx, 'length', e.target.value)}
                  step="0.01"
                  className="w-full p-1 border rounded"
                  placeholder="길이"
                />
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={line.showLength || false}
                    onChange={(e) => handleLineChange(idx, 'showLength', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-xs">표시</span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatLine(line)}
                </span>
                <button
                  onClick={() => handleDeleteLine(idx)}
                  className="w-6 h-6 text-red-500 hover:text-red-600 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        {data.angles.length > 0 && (
          <div>
            <h3 className="font-bold mb-1">각도:</h3>
            <div className="grid grid-cols-1 gap-2">
              {data.angles.map((angle, idx) => (
                <div key={idx} className="bg-white p-2 rounded grid grid-cols-5 gap-2 items-center">
                  <input
                    type="text"
                    value={angle.vertex}
                    onChange={(e) => handleAngleChange(idx, 'vertex', e.target.value)}
                    className="w-full p-1 border rounded text-center"
                  />
                  <input
                    type="text"
                    value={angle.start}
                    onChange={(e) => handleAngleChange(idx, 'start', e.target.value)}
                    className="w-full p-1 border rounded text-center"
                  />
                  <input
                    type="text"
                    value={angle.end}
                    onChange={(e) => handleAngleChange(idx, 'end', e.target.value)}
                    className="w-full p-1 border rounded text-center"
                  />
                  <input
                    type="number"
                    value={angle.value}
                    onChange={(e) => handleAngleChange(idx, 'value', e.target.value)}
                    step="1"
                    className="w-full p-1 border rounded"
                  />
                  <span className="text-xs text-gray-500">
                    {formatAngle(angle)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.circles.length > 0 && (
          <div>
            <h3 className="font-bold mb-1">원:</h3>
            <div className="grid grid-cols-1 gap-2">
              {data.circles.map((circle, idx) => (
                <div key={idx} className="bg-white p-2 rounded grid grid-cols-3 gap-2 items-center">
                  <input
                    type="text"
                    value={circle.center}
                    onChange={(e) => handleCircleChange(idx, 'center', e.target.value)}
                    className="w-full p-1 border rounded text-center"
                  />
                  <input
                    type="number"
                    value={circle.radius}
                    onChange={(e) => handleCircleChange(idx, 'radius', e.target.value)}
                    step="0.1"
                    className="w-full p-1 border rounded"
                  />
                  <span className="text-xs text-gray-500">
                    {formatCircle(circle)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeometryRenderer; 