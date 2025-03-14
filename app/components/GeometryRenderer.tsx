import { useEffect, useRef, useState } from 'react';
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
  showLengthArc?: boolean; // 길이를 호로 표시할지 여부
}

interface Angle {
  vertex: string;
  start: string;
  end: string;
  value: number;
  showValue: boolean;
  rotation?: number;
}

interface Circle {
  center: string;
  radius: number;
  showRadius?: boolean;
  startAngle?: number; // 시작 각도 (도 단위, 0-360)
  endAngle?: number; // 끝 각도 (도 단위, 0-360)
  showArc?: boolean; // 호를 표시할지 여부
  fillArc?: boolean; // 부채꼴로 채울지 여부
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
  const [showGrid, setShowGrid] = useState(false); // 모눈종이 표시 여부 상태
  const [zoomLevel, setZoomLevel] = useState(1); // 확대/축소 레벨 상태

  // 데이터를 보기 좋게 포맷하는 함수
  const formatPoint = (point: Point) => {
    return `${point.label}(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
  };

  const formatLine = (line: Line) => {
    let text = `${line.start}${line.end}: ${line.length ? line.length.toFixed(2) : '길이 미표시'}`;
    if (line.showLengthArc) {
      text += ' (호 표시)';
    }
    return text;
  };

  const formatAngle = (angle: Angle) => {
    return `∠${angle.vertex}${angle.start}${angle.end}: ${angle.value}°`;
  };

  const formatCircle = (circle: Circle) => {
    let text = `원 ${circle.center}: 반지름 ${circle.radius.toFixed(2)}`;
    if (circle.startAngle !== undefined && circle.endAngle !== undefined) {
      text += ` (${circle.startAngle}° ~ ${circle.endAngle}°)`;
    }
    return text;
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
    } else if (field === 'showLength' || field === 'showLengthArc') {
      newLines[index] = { ...newLines[index], [field]: value as boolean };
    }
    
    onDataChange({ ...data, lines: newLines });
  };

  const handleAngleChange = (index: number, field: keyof Angle, value: string | boolean) => {
    if (!onDataChange) return;
    
    const newAngles = [...data.angles];
    if (field === 'vertex' || field === 'start' || field === 'end') {
      newAngles[index] = { ...newAngles[index], [field]: value as string };
    } else if (field === 'value') {
      const numValue = parseFloat(value as string);
      if (!isNaN(numValue)) {
        newAngles[index] = { ...newAngles[index], value: numValue };
      }
    } else if (field === 'showValue' || field === 'rotation') {
      newAngles[index] = { ...newAngles[index], [field]: value };
    }
    
    onDataChange({ ...data, angles: newAngles });
  };

  const handleCircleChange = (index: number, field: keyof Circle, value: string | boolean | number) => {
    if (!onDataChange) return;
    
    const newCircles = [...data.circles];
    if (field === 'center') {
      newCircles[index] = { ...newCircles[index], [field]: value as string };
    } else if (field === 'radius' || field === 'startAngle' || field === 'endAngle') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value as number;
      if (!isNaN(numValue)) {
        newCircles[index] = { ...newCircles[index], [field]: numValue };
      }
    } else if (field === 'showRadius' || field === 'showArc' || field === 'fillArc') {
      newCircles[index] = { ...newCircles[index], [field]: value as boolean };
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
      showLength: false,
      showLengthArc: false
    };
    
    onDataChange({
      ...data,
      lines: [...data.lines, newLine]
    });
  };

  // 새로운 원 추가 핸들러
  const handleAddCircle = () => {
    if (!onDataChange || data.points.length < 1) return;
    
    const newCircle: Circle = {
      center: data.points[0].label,
      radius: 1.0,
      showRadius: false
    };
    
    onDataChange({
      ...data,
      circles: [...data.circles, newCircle]
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

  // 원 삭제 핸들러
  const handleDeleteCircle = (index: number) => {
    if (!onDataChange) return;
    
    const newCircles = data.circles.filter((_, idx) => idx !== index);
    onDataChange({
      ...data,
      circles: newCircles
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

  // 확대 핸들러
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3)); // 최대 3배까지 확대
  };

  // 축소 핸들러
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5)); // 최소 0.5배까지 축소
  };

  // 확대/축소 초기화 핸들러
  const handleResetZoom = () => {
    setZoomLevel(1);
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

    // 역 스케일 함수 (SVG 좌표 -> 실제 좌표)
    const xInverse = d3.scaleLinear()
      .domain([padding, width - padding])
      .range([xMin - shapeWidth * 0.2, xMax + shapeWidth * 0.2]);

    const yInverse = d3.scaleLinear()
      .domain([height - padding, padding])
      .range([yMin - shapeHeight * 0.2, yMax + shapeHeight * 0.2]);

    // 확대/축소 적용을 위한 그룹 생성
    const zoomGroup = svg.append('g')
      .attr('transform', `scale(${zoomLevel}) translate(${(width * (1 - zoomLevel)) / (2 * zoomLevel)}, ${(height * (1 - zoomLevel)) / (2 * zoomLevel)})`);

    // 모눈종이 그리기 (showGrid가 true일 때만)
    if (showGrid) {
      // 배경 사각형 추가
      zoomGroup.append('rect')
        .attr('x', padding)
        .attr('y', padding)
        .attr('width', width - 2 * padding)
        .attr('height', height - 2 * padding)
        .attr('fill', '#f8f9fa');
      
      // x축 모눈선 그리기
      const xDomain = xScale.domain();
      const xStep = Math.ceil((xDomain[1] - xDomain[0]) / 20); // 적절한 간격 계산
      
      for (let x = Math.floor(xDomain[0]); x <= Math.ceil(xDomain[1]); x += xStep) {
        zoomGroup.append('line')
          .attr('x1', xScale(x))
          .attr('y1', padding)
          .attr('x2', xScale(x))
          .attr('y2', height - padding)
          .attr('stroke', '#dee2e6')
          .attr('stroke-width', 1);
        
        // 주요 눈금에 숫자 표시
        if (x % (xStep * 2) === 0) {
          zoomGroup.append('text')
            .attr('x', xScale(x))
            .attr('y', height - padding + 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#6c757d')
            .text(x.toString());
        }
      }
      
      // y축 모눈선 그리기
      const yDomain = yScale.domain();
      const yStep = Math.ceil((yDomain[1] - yDomain[0]) / 20); // 적절한 간격 계산
      
      for (let y = Math.floor(yDomain[0]); y <= Math.ceil(yDomain[1]); y += yStep) {
        zoomGroup.append('line')
          .attr('x1', padding)
          .attr('y1', yScale(y))
          .attr('x2', width - padding)
          .attr('y2', yScale(y))
          .attr('stroke', '#dee2e6')
          .attr('stroke-width', 1);
        
        // 주요 눈금에 숫자 표시
        if (y % (yStep * 2) === 0) {
          zoomGroup.append('text')
            .attr('x', padding - 10)
            .attr('y', yScale(y))
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#6c757d')
            .text(y.toString());
        }
      }
      
      // 원점 강조 (0, 0)
      if (xDomain[0] <= 0 && xDomain[1] >= 0 && yDomain[0] <= 0 && yDomain[1] >= 0) {
        zoomGroup.append('line')
          .attr('x1', xScale(0))
          .attr('y1', padding)
          .attr('x2', xScale(0))
          .attr('y2', height - padding)
          .attr('stroke', '#adb5bd')
          .attr('stroke-width', 1.5);
        
        zoomGroup.append('line')
          .attr('x1', padding)
          .attr('y1', yScale(0))
          .attr('x2', width - padding)
          .attr('y2', yScale(0))
          .attr('stroke', '#adb5bd')
          .attr('stroke-width', 1.5);
      }
    }

    // 곡선이 있는 경우에만 축 그리기
    if (curves.length > 0) {
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);
      
      zoomGroup.append('g')
        .attr('transform', `translate(0, ${yScale(0)})`)
        .call(xAxis);
      
      zoomGroup.append('g')
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
      
      zoomGroup.append('path')
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
      
      zoomGroup.append('text')
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
        // 선분 그리기
        zoomGroup.append('line')
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
          
          zoomGroup.append('text')
            .attr('x', xScale(midX))
            .attr('y', yScale(midY) - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(`${line.length.toFixed(2)}`);
        }
        
        // 길이를 호로 표시
        if (line.showLengthArc && line.length) {
          // 두 점 사이의 거리 계산
          const dx = endPoint.x - startPoint.x;
          const dy = endPoint.y - startPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 선분의 중점 계산
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;
          
          // 선분의 방향 벡터 계산
          const dirX = dx / distance;
          const dirY = dy / distance;
          
          // 선분에 수직인 벡터 계산 (시계 방향으로 90도 회전)
          const perpX = dirY;
          const perpY = -dirX;
          
          // 호의 높이 계산 (선분 길이의 약 15%)
          const arcHeight = distance * 0.15;
          
          // 호의 제어점 (선분의 중점에서 수직 방향으로 이동)
          const controlX = midX + perpX * arcHeight;
          const controlY = midY + perpY * arcHeight;
          
          // 2차 베지어 곡선으로 호 그리기
          const pathData = `M ${xScale(startPoint.x)} ${yScale(startPoint.y)} 
                            Q ${xScale(controlX)} ${yScale(controlY)}, 
                            ${xScale(endPoint.x)} ${yScale(endPoint.y)}`;
          
          zoomGroup.append('path')
            .attr('d', pathData)
            .attr('fill', 'none')
            .attr('stroke', '#adb5bd')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4');
          
          // 길이 값 표시 (제어점 위치에)
          zoomGroup.append('text')
            .attr('x', xScale(controlX))
            .attr('y', yScale(controlY) - 5)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#495057')
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

        // 벡터의 각도 계산 (라디안)
        const startAngle = Math.atan2(startVector.y, startVector.x);
        const endAngle = Math.atan2(endVector.y, endVector.x);
        
        // 두 벡터 사이의 각도 계산 (라디안)
        let angleDiff = endAngle - startAngle;
        
        // 각도가 180도를 넘지 않도록 조정
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // 각도의 방향이 반시계 방향인지 확인
        const isCounterClockwise = angleDiff > 0;
        
        // 각도 값이 주어진 경우, 그 값을 사용하여 호의 끝 각도 계산
        let actualEndAngle;
        if (angle.value !== undefined) {
          // 각도를 라디안으로 변환
          const angleInRadians = (angle.value * Math.PI) / 180;
          
          // 시작 각도에서 주어진 각도만큼 이동
          actualEndAngle = startAngle + (isCounterClockwise ? angleInRadians : -angleInRadians);
        } else {
          actualEndAngle = endAngle;
        }
        
        // 사용자 지정 회전 적용 (라디안으로 변환)
        const rotationOffset = angle.rotation ? (angle.rotation * Math.PI) / 180 : 0;
        const adjustedStartAngle = startAngle + rotationOffset;
        const adjustedEndAngle = actualEndAngle + rotationOffset;
        
        // 각도 호 그리기 (showValue가 true인 경우에만)
        if (angle.showValue) {
          const radius = 20; // 호의 반지름 (픽셀 단위)
          
          // SVG 좌표계에서는 y축이 반전되어 있으므로 각도도 반전
          // D3의 arc 함수는 시계 방향으로 각도를 측정하지만, 
          // SVG 좌표계에서는 y축이 아래로 증가하므로 반시계 방향으로 그려짐
          const arcGenerator = d3.arc()
            .innerRadius(radius)
            .outerRadius(radius)
            .startAngle(adjustedStartAngle)
            .endAngle(adjustedEndAngle)
            .context(null);
          
          zoomGroup.append('path')
            .attr('d', arcGenerator({} as any))
            .attr('transform', `translate(${xScale(vertexPoint.x)}, ${yScale(vertexPoint.y)})`)
            .attr('fill', 'none')
            .attr('stroke', '#fd7e14')
            .attr('stroke-width', 2);
          
          // 각도 값 표시
          const midAngle = (adjustedStartAngle + adjustedEndAngle) / 2;
          const labelRadius = radius + 10;
          
          // 화면 좌표계에서의 위치 계산
          const screenX = xScale(vertexPoint.x) + Math.cos(midAngle) * labelRadius;
          const screenY = yScale(vertexPoint.y) + Math.sin(midAngle) * labelRadius;
          
          zoomGroup.append('text')
            .attr('x', screenX)
            .attr('y', screenY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#fd7e14')
            .text(`${angle.value}°`);
        }
      }
    });

    // 원 그리기
    data.circles.forEach(circle => {
      const centerPoint = points.find(p => p.label === circle.center);

      if (centerPoint) {
        // 완전한 원인지 부채꼴/호인지 확인
        const isFullCircle = circle.startAngle === undefined || circle.endAngle === undefined;
        
        if (isFullCircle) {
          // 완전한 원 그리기
          zoomGroup.append('circle')
            .attr('cx', xScale(centerPoint.x))
            .attr('cy', yScale(centerPoint.y))
            .attr('r', xScale(centerPoint.x + circle.radius) - xScale(centerPoint.x))
            .attr('fill', 'none')
            .attr('stroke', '#20c997')
            .attr('stroke-width', 2);
        } else {
          // 부채꼴/호 그리기
          const startAngleRad = ((circle.startAngle || 0) * Math.PI) / 180;
          const endAngleRad = ((circle.endAngle || 0) * Math.PI) / 180;
          
          // D3의 arc 생성기 사용
          const arcGenerator = d3.arc()
            .innerRadius(0)
            .outerRadius(xScale(centerPoint.x + circle.radius) - xScale(centerPoint.x))
            .startAngle(startAngleRad)
            .endAngle(endAngleRad);
          
          zoomGroup.append('path')
            .attr('d', arcGenerator({} as any))
            .attr('transform', `translate(${xScale(centerPoint.x)}, ${yScale(centerPoint.y)})`)
            .attr('fill', circle.fillArc ? 'rgba(32, 201, 151, 0.2)' : 'none')
            .attr('stroke', '#20c997')
            .attr('stroke-width', 2);
          
          // 호의 시작점과 끝점을 중심과 연결하는 선 (부채꼴인 경우)
          if (circle.fillArc) {
            // 시작점 연결선
            const startX = centerPoint.x + circle.radius * Math.cos(startAngleRad);
            const startY = centerPoint.y + circle.radius * Math.sin(startAngleRad);
            
            zoomGroup.append('line')
              .attr('x1', xScale(centerPoint.x))
              .attr('y1', yScale(centerPoint.y))
              .attr('x2', xScale(startX))
              .attr('y2', yScale(startY))
              .attr('stroke', '#20c997')
              .attr('stroke-width', 1.5);
            
            // 끝점 연결선
            const endX = centerPoint.x + circle.radius * Math.cos(endAngleRad);
            const endY = centerPoint.y + circle.radius * Math.sin(endAngleRad);
            
            zoomGroup.append('line')
              .attr('x1', xScale(centerPoint.x))
              .attr('y1', yScale(centerPoint.y))
              .attr('x2', xScale(endX))
              .attr('y2', yScale(endY))
              .attr('stroke', '#20c997')
              .attr('stroke-width', 1.5);
          }
        }
        
        // 반지름 표시
        if (circle.showRadius) {
          // 반지름 표시 각도 계산 (부채꼴인 경우 중간 각도, 아니면 0도)
          const radiusAngle = !isFullCircle ? 
            (((circle.startAngle || 0) + (circle.endAngle || 0)) / 2) * Math.PI / 180 : 0;
          
          const radiusEndX = centerPoint.x + circle.radius * Math.cos(radiusAngle);
          const radiusEndY = centerPoint.y + circle.radius * Math.sin(radiusAngle);
          
          // 반지름 선 그리기
          zoomGroup.append('line')
            .attr('x1', xScale(centerPoint.x))
            .attr('y1', yScale(centerPoint.y))
            .attr('x2', xScale(radiusEndX))
            .attr('y2', yScale(radiusEndY))
            .attr('stroke', '#20c997')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4');
          
          // 반지름 값 표시
          zoomGroup.append('text')
            .attr('x', xScale((centerPoint.x + radiusEndX) / 2))
            .attr('y', yScale((centerPoint.y + radiusEndY) / 2) - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(`r=${circle.radius.toFixed(2)}`);
        }
      }
    });

    // 드래그 이벤트 핸들러
    const dragHandler = d3.drag<SVGCircleElement, unknown>()
      .on('start', function(event) {
        d3.select(this).attr('fill', '#ff6b6b'); // 드래그 시작 시 색상 변경
      })
      .on('drag', function(event, d) {
        const pointIndex = d3.select(this).attr('data-index');
        if (pointIndex === null) return;
        
        const idx = parseInt(pointIndex);
        const newX = xInverse(event.x);
        const newY = yInverse(event.y);
        
        // 점 위치 업데이트
        if (onDataChange && idx >= 0 && idx < data.points.length) {
          const newPoints = [...data.points];
          newPoints[idx] = {
            ...newPoints[idx],
            x: newX,
            y: newY
          };
          
          onDataChange({
            ...data,
            points: newPoints
          });
        }
      })
      .on('end', function() {
        d3.select(this).attr('fill', '#4dabf7'); // 드래그 종료 시 원래 색상으로 복원
      });

    // 점 그리기 (드래그 기능 추가)
    points.forEach((point, index) => {
      // 점 그리기
      zoomGroup.append('circle')
        .attr('cx', xScale(point.x))
        .attr('cy', yScale(point.y))
        .attr('r', 5)
        .attr('fill', '#4dabf7')
        .attr('cursor', 'move') // 커서 스타일 변경
        .attr('data-index', index.toString()) // 인덱스 저장
        .call(dragHandler as any); // 드래그 이벤트 연결

      // 라벨 그리기
      zoomGroup.append('text')
        .attr('x', xScale(point.x) + 10)
        .attr('y', yScale(point.y) - 10)
        .attr('font-size', '14px')
        .text(point.label);
    });
  }, [data, onDataChange, showGrid, zoomLevel]); // zoomLevel 의존성 추가

  return (
    <div className="flex flex-col md:flex-row items-start gap-4 w-full">
      <div className="w-full md:w-1/2 overflow-auto border rounded-lg">
        <div className="flex justify-between p-2 bg-gray-50 border-b">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700 font-bold"
              title="축소"
            >
              -
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs text-gray-700"
              title="확대/축소 초기화"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700 font-bold"
              title="확대"
            >
              +
            </button>
          </div>
          
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer mr-4">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={() => setShowGrid(!showGrid)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ms-3 text-sm font-medium text-gray-500">모눈종이 표시</span>
            </label>
          </div>
        </div>
        <svg
          ref={svgRef}
          width="800"
          height="600"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto"
        />
      </div>
      
      <div className="w-full md:w-1/2 p-4 bg-gray-50 rounded-lg shadow-sm space-y-4 text-sm font-mono max-h-[600px] overflow-y-auto">
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
              <div key={idx} className="bg-white p-2 rounded grid grid-cols-1 gap-2">
                <div className="grid grid-cols-6 gap-2 items-center">
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
                      className="mr-1"
                    />
                    <span className="text-xs">직선</span>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={line.showLengthArc || false}
                      onChange={(e) => handleLineChange(idx, 'showLengthArc', e.target.checked)}
                      className="mr-1"
                    />
                    <span className="text-xs">호</span>
                  </div>
                  <button
                    onClick={() => handleDeleteLine(idx)}
                    className="w-6 h-6 text-red-500 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatLine(line)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {data.angles.length > 0 && (
          <div>
            <h3 className="font-bold mb-1">각도:</h3>
            <div className="grid grid-cols-1 gap-2">
              {data.angles.map((angle, idx) => (
                <div key={idx} className="bg-white p-2 rounded grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-6 gap-2 items-center">
                    <input
                      type="text"
                      value={angle.vertex}
                      onChange={(e) => handleAngleChange(idx, 'vertex', e.target.value)}
                      className="w-full p-1 border rounded text-center"
                      placeholder="꼭지점"
                    />
                    <input
                      type="text"
                      value={angle.start}
                      onChange={(e) => handleAngleChange(idx, 'start', e.target.value)}
                      className="w-full p-1 border rounded text-center"
                      placeholder="시작점"
                    />
                    <input
                      type="text"
                      value={angle.end}
                      onChange={(e) => handleAngleChange(idx, 'end', e.target.value)}
                      className="w-full p-1 border rounded text-center"
                      placeholder="끝점"
                    />
                    <input
                      type="number"
                      value={angle.value}
                      onChange={(e) => handleAngleChange(idx, 'value', e.target.value)}
                      step="1"
                      className="w-full p-1 border rounded"
                      placeholder="각도"
                    />
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={angle.showValue || false}
                        onChange={(e) => handleAngleChange(idx, 'showValue', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-xs">표시</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatAngle(angle)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center mt-1">
                    <div className="flex items-center">
                      <span className="text-xs mr-2">회전:</span>
                      <input
                        type="number"
                        value={angle.rotation || 0}
                        onChange={(e) => handleAngleChange(idx, 'rotation', e.target.value)}
                        step="5"
                        className="w-full p-1 border rounded"
                        placeholder="회전 (도)"
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      회전 각도: {angle.rotation || 0}°
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {data.circles.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">원:</h3>
              <button
                onClick={handleAddCircle}
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
                disabled={data.points.length < 1}
              >
                원 추가
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {data.circles.map((circle, idx) => (
                <div key={idx} className="bg-white p-2 rounded grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <input
                      type="text"
                      value={circle.center}
                      onChange={(e) => handleCircleChange(idx, 'center', e.target.value)}
                      className="w-full p-1 border rounded text-center"
                      placeholder="중심점"
                    />
                    <input
                      type="number"
                      value={circle.radius}
                      onChange={(e) => handleCircleChange(idx, 'radius', e.target.value)}
                      step="0.1"
                      className="w-full p-1 border rounded"
                      placeholder="반지름"
                    />
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={circle.showRadius || false}
                        onChange={(e) => handleCircleChange(idx, 'showRadius', e.target.checked)}
                        className="mr-1"
                      />
                      <span className="text-xs">반지름 표시</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 items-center mt-1">
                    <input
                      type="number"
                      value={circle.startAngle !== undefined ? circle.startAngle : ''}
                      onChange={(e) => handleCircleChange(idx, 'startAngle', e.target.value)}
                      step="5"
                      className="w-full p-1 border rounded"
                      placeholder="시작 각도"
                    />
                    <input
                      type="number"
                      value={circle.endAngle !== undefined ? circle.endAngle : ''}
                      onChange={(e) => handleCircleChange(idx, 'endAngle', e.target.value)}
                      step="5"
                      className="w-full p-1 border rounded"
                      placeholder="끝 각도"
                    />
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={circle.fillArc || false}
                        onChange={(e) => handleCircleChange(idx, 'fillArc', e.target.checked)}
                        className="mr-1"
                      />
                      <span className="text-xs">부채꼴</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCircle(idx)}
                      className="w-6 h-6 text-red-500 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {formatCircle(circle)}
                  </div>
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