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

interface Curve {
  type: string;
  base?: number;
  coefficient?: number;
  xRange: {
    min: number;
    max: number;
  };
  points: number;
}

interface GeometryData {
  points: Point[];
  lines: Line[];
  angles: Angle[];
  circles: Circle[];
  curves: Curve[];
}

interface Props {
  data: GeometryData;
  onDataChange?: (newData: GeometryData) => void;
}

// 곡선 생성 함수
const generateCurvePoints = (curve: Curve): Point[] => {
  const numPoints = curve.points || 100;
  const points: Point[] = [];
  const step = (curve.xRange.max - curve.xRange.min) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = curve.xRange.min + i * step;
    let y = 0;

    switch (curve.type) {
      case 'logarithm':
        if (x > 0) {
          const base = curve.base || Math.E;
          y = Math.log(x) / Math.log(base);
        }
        break;
      case 'exponential':
        const base = curve.base || Math.E;
        y = Math.pow(base, x);
        break;
      case 'linear':
        const coef = curve.coefficient || 1;
        y = coef * x;
        break;
      case 'quadratic':
        const a = curve.coefficient || 1;
        y = a * x * x;
        break;
    }

    points.push({ x, y, label: '' });
  }

  return points;
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

  // 새로운 곡선 추가 핸들러
  const handleAddCurve = () => {
    if (!onDataChange) return;
    
    const newCurve: Curve = {
      type: "linear", // 기본값은 선형 함수
      coefficient: 1,
      xRange: {
        min: 0,
        max: 10
      },
      points: 100
    };
    
    onDataChange({
      ...data,
      curves: [...data.curves, newCurve]
    });
  };

  // 곡선 삭제 핸들러
  const handleDeleteCurve = (index: number) => {
    if (!onDataChange) return;
    
    const newCurves = data.curves.filter((_, idx) => idx !== index);
    onDataChange({
      ...data,
      curves: newCurves
    });
  };

  // 곡선 속성 변경 핸들러
  const handleCurveChange = (index: number, field: string, value: string | number) => {
    if (!onDataChange) return;
    
    const newCurves = [...data.curves];
    
    if (field === 'type') {
      newCurves[index] = { ...newCurves[index], type: value as string };
    } else if (field === 'base' || field === 'coefficient' || field === 'points') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numValue)) {
        newCurves[index] = { ...newCurves[index], [field]: numValue };
      }
    } else if (field === 'xMin' || field === 'xMax') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numValue)) {
        const xRange = { ...newCurves[index].xRange };
        if (field === 'xMin') xRange.min = numValue;
        if (field === 'xMax') xRange.max = numValue;
        newCurves[index] = { ...newCurves[index], xRange };
      }
    }
    
    onDataChange({ ...data, curves: newCurves });
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
    const curves = data.curves || [];
    
    // 곡선의 범위를 고려하여 경계 계산
    let xMin = Math.min(...points.map(p => p.x), ...circles.map(c => {
      const center = points.find(p => p.label === c.center);
      return center ? center.x - c.radius : Infinity;
    }));
    
    let xMax = Math.max(...points.map(p => p.x), ...circles.map(c => {
      const center = points.find(p => p.label === c.center);
      return center ? center.x + c.radius : -Infinity;
    }));
    
    let yMin = Math.min(...points.map(p => p.y), ...circles.map(c => {
      const center = points.find(p => p.label === c.center);
      return center ? center.y - c.radius : Infinity;
    }));
    
    let yMax = Math.max(...points.map(p => p.y), ...circles.map(c => {
      const center = points.find(p => p.label === c.center);
      return center ? center.y + c.radius : -Infinity;
    }));
    
    // 곡선이 있는 경우 범위 확장
    if (curves.length > 0) {
      // 곡선의 x 범위 고려
      xMin = Math.min(xMin, ...curves.map(c => c.xRange.min));
      xMax = Math.max(xMax, ...curves.map(c => c.xRange.max));
      
      // y 범위는 곡선 함수 계산 필요
      const yValues: number[] = [];
      
      curves.forEach(curve => {
        const { min, max } = curve.xRange;
        const step = (max - min) / (curve.points || 100);
        
        for (let x = min; x <= max; x += step) {
          if (x <= 0 && curve.type === 'logarithm') continue; // 로그 함수는 x > 0에서만 정의
          
          let y = 0;
          const coef = curve.coefficient || 1;
          const base = curve.base || Math.E;
          
          switch (curve.type) {
            case 'linear':
              y = coef * x;
              break;
            case 'quadratic':
              y = coef * x * x;
              break;
            case 'logarithm':
              y = coef * Math.log(x) / Math.log(base);
              break;
            case 'exponential':
              y = coef * Math.pow(base, x);
              break;
          }
          
          yValues.push(y);
        }
      });
      
      if (yValues.length > 0) {
        yMin = Math.min(yMin, ...yValues);
        yMax = Math.max(yMax, ...yValues);
      }
    }
    
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

    // 곡선이 있는 경우에만 축 그리기
    if (curves.length > 0) {
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);
      
      svg.append('g')
        .attr('transform', `translate(0, ${yScale(0)})`)
        .call(xAxis);
      
      svg.append('g')
        .attr('transform', `translate(${xScale(0)}, 0)`)
        .call(yAxis);
    }

    // 곡선 그리기
    curves.forEach(curve => {
      const { min, max } = curve.xRange;
      const step = (max - min) / (curve.points || 100);
      const points: [number, number][] = [];
      
      for (let x = min; x <= max; x += step) {
        if (x <= 0 && curve.type === 'logarithm') continue; // 로그 함수는 x > 0에서만 정의
        
        let y = 0;
        const coef = curve.coefficient || 1;
        const base = curve.base || Math.E;
        
        switch (curve.type) {
          case 'linear':
            y = coef * x;
            break;
          case 'quadratic':
            y = coef * x * x;
            break;
          case 'logarithm':
            y = coef * Math.log(x) / Math.log(base);
            break;
          case 'exponential':
            y = coef * Math.pow(base, x);
            break;
        }
        
        points.push([x, y]);
      }
      
      const line = d3.line()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]))
        .curve(d3.curveMonotoneX);
      
      svg.append('path')
        .datum(points)
        .attr('fill', 'none')
        .attr('stroke', curve.type === 'linear' ? '#ff6b6b' : '#4dabf7')
        .attr('stroke-width', 2)
        .attr('d', line);
      
      // 함수 이름 표시
      const lastPoint = points[points.length - 1];
      let label = '';
      const coef = curve.coefficient || 1;
      const base = curve.base || Math.E;
      
      switch (curve.type) {
        case 'linear':
          label = `y = ${coef}x`;
          break;
        case 'quadratic':
          label = `y = ${coef}x²`;
          break;
        case 'logarithm':
          label = `y = ${coef}log${base !== Math.E ? base : ''}(x)`;
          break;
        case 'exponential':
          label = `y = ${coef}${base !== Math.E ? base : 'e'}^x`;
          break;
      }
      
      svg.append('text')
        .attr('x', xScale(lastPoint[0]))
        .attr('y', yScale(lastPoint[1]) - 10)
        .attr('text-anchor', 'end')
        .attr('font-size', '12px')
        .text(label);
    });

    // 선분 그리기
    data.lines.forEach(line => {
      const startPoint = points.find(p => p.label === line.start);
      const endPoint = points.find(p => p.label === line.end);

      if (startPoint && endPoint) {
        svg.append('line')
          .attr('x1', xScale(startPoint.x))
          .attr('y1', yScale(startPoint.y))
          .attr('x2', xScale(endPoint.x))
          .attr('y2', yScale(endPoint.y))
          .attr('stroke', '#212529')
          .attr('stroke-width', 2);

        // 길이 표시
        if (line.showLength && line.length) {
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;
          
          svg.append('text')
            .attr('x', xScale(midX))
            .attr('y', yScale(midY) - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(`${line.length.toFixed(2)}`);
        }
      }
    });

    // 각도 그리기
    data.angles.forEach(angle => {
      const vertexPoint = points.find(p => p.label === angle.vertex);
      const startPoint = points.find(p => p.label === angle.start);
      const endPoint = points.find(p => p.label === angle.end);

      if (vertexPoint && startPoint && endPoint) {
        // 각도 계산
        const startVector = {
          x: startPoint.x - vertexPoint.x,
          y: startPoint.y - vertexPoint.y
        };
        const endVector = {
          x: endPoint.x - vertexPoint.x,
          y: endPoint.y - vertexPoint.y
        };

        const startAngle = Math.atan2(startVector.y, startVector.x);
        const endAngle = Math.atan2(endVector.y, endVector.x);
        
        // 각도 호 그리기
        const radius = 20; // 호의 반지름 (픽셀 단위)
        const arcGenerator = d3.arc()
          .innerRadius(radius)
          .outerRadius(radius)
          .startAngle(startAngle)
          .endAngle(endAngle);
        
        svg.append('path')
          .attr('d', arcGenerator({} as any))
          .attr('transform', `translate(${xScale(vertexPoint.x)}, ${yScale(vertexPoint.y)})`)
          .attr('fill', 'none')
          .attr('stroke', '#fd7e14')
          .attr('stroke-width', 2);
        
        // 각도 값 표시
        if (angle.showValue) {
          const midAngle = (startAngle + endAngle) / 2;
          const labelRadius = radius + 10;
          const labelX = vertexPoint.x + Math.cos(midAngle) * labelRadius / (width / (xScale.domain()[1] - xScale.domain()[0]));
          const labelY = vertexPoint.y + Math.sin(midAngle) * labelRadius / (height / (yScale.domain()[0] - yScale.domain()[1]));
          
          svg.append('text')
            .attr('x', xScale(labelX))
            .attr('y', yScale(labelY))
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(`${angle.value}°`);
        }
      }
    });

    // 원 그리기
    data.circles.forEach(circle => {
      const centerPoint = points.find(p => p.label === circle.center);

      if (centerPoint) {
        svg.append('circle')
          .attr('cx', xScale(centerPoint.x))
          .attr('cy', yScale(centerPoint.y))
          .attr('r', xScale(centerPoint.x + circle.radius) - xScale(centerPoint.x))
          .attr('fill', 'none')
          .attr('stroke', '#20c997')
          .attr('stroke-width', 2);
        
        // 반지름 표시
        if (circle.showRadius) {
          const radiusEndX = centerPoint.x + circle.radius;
          const radiusEndY = centerPoint.y;
          
          // 반지름 선 그리기
          svg.append('line')
            .attr('x1', xScale(centerPoint.x))
            .attr('y1', yScale(centerPoint.y))
            .attr('x2', xScale(radiusEndX))
            .attr('y2', yScale(radiusEndY))
            .attr('stroke', '#20c997')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4');
          
          // 반지름 값 표시
          svg.append('text')
            .attr('x', xScale((centerPoint.x + radiusEndX) / 2))
            .attr('y', yScale(radiusEndY) - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(`r=${circle.radius.toFixed(2)}`);
        }
      }
    });

    // 점 그리기
    points.forEach(point => {
      svg.append('circle')
        .attr('cx', xScale(point.x))
        .attr('cy', yScale(point.y))
        .attr('r', 5)
        .attr('fill', '#4dabf7');

      svg.append('text')
        .attr('x', xScale(point.x) + 10)
        .attr('y', yScale(point.y) - 10)
        .attr('font-size', '14px')
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
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">곡선:</h3>
            <button
              onClick={handleAddCurve}
              className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
            >
              곡선 추가
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {data.curves.map((curve, idx) => (
              <div key={idx} className="bg-white p-2 rounded grid grid-cols-1 gap-2">
                <div className="grid grid-cols-6 gap-2 items-center">
                  <select
                    value={curve.type}
                    onChange={(e) => handleCurveChange(idx, 'type', e.target.value)}
                    className="w-full p-1 border rounded"
                  >
                    <option value="linear">선형 (y = x)</option>
                    <option value="logarithm">로그 (y = log x)</option>
                    <option value="exponential">지수 (y = e^x)</option>
                    <option value="quadratic">이차 (y = x²)</option>
                  </select>
                  
                  {(curve.type === 'logarithm' || curve.type === 'exponential') && (
                    <input
                      type="number"
                      value={curve.base || ''}
                      onChange={(e) => handleCurveChange(idx, 'base', e.target.value)}
                      step="0.1"
                      className="w-full p-1 border rounded"
                      placeholder="밑"
                    />
                  )}
                  
                  <input
                    type="number"
                    value={curve.coefficient || ''}
                    onChange={(e) => handleCurveChange(idx, 'coefficient', e.target.value)}
                    step="0.1"
                    className="w-full p-1 border rounded"
                    placeholder="계수"
                  />
                  
                  <input
                    type="number"
                    value={curve.xRange.min}
                    onChange={(e) => handleCurveChange(idx, 'xMin', e.target.value)}
                    step="0.1"
                    className="w-full p-1 border rounded"
                    placeholder="x 최소"
                  />
                  
                  <input
                    type="number"
                    value={curve.xRange.max}
                    onChange={(e) => handleCurveChange(idx, 'xMax', e.target.value)}
                    step="0.1"
                    className="w-full p-1 border rounded"
                    placeholder="x 최대"
                  />
                  
                  <button
                    onClick={() => handleDeleteCurve(idx)}
                    className="w-6 h-6 text-red-500 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeometryRenderer; 