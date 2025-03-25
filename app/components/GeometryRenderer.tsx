import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Point {
  x: number;
  y: number;
  label: string;
  visible?: boolean; // 점 표시 여부
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
  showRadiusArc?: boolean; // 반지름을 호로 표시할지 여부 추가
  startAngle?: number; // 시작 각도 (도 단위, 0-360)
  endAngle?: number; // 끝 각도 (도 단위, 0-360)
  showArc?: boolean; // 호를 표시할지 여부
  fillArc?: boolean; // 부채꼴로 채울지 여부
  startPoint?: string; // 호의 시작점 (점 라벨)
  endPoint?: string; // 호의 끝점 (점 라벨)
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

// 길이 값 표시 형식을 수정하는 함수 추가
const formatNumber = (num: number): string => {
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
};

const GeometryRenderer = ({ data, onDataChange }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [showGrid, setShowGrid] = useState(true); // 모눈종이 표시 기본값을 true로 변경
  const [zoomLevel, setZoomLevel] = useState(1); // 확대/축소 레벨 상태
  const [flipX, setFlipX] = useState(false); // 좌우 반전 상태
  const [flipY, setFlipY] = useState(false); // 상하 반전 상태
  const [rotation, setRotation] = useState(0); // 회전 각도 상태 (도 단위)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // 패닝 오프셋 상태
  const [isDragging, setIsDragging] = useState(false); // 드래그 중인지 여부
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // 드래그 시작 위치
  
  // 초기 데이터가 없는 경우 사용할 기본 데이터
  const defaultData: GeometryData = {
    points: [
      { label: 'A', x: 0, y: 0, visible: true },
      { label: 'B', x: 5, y: 0, visible: true },
      { label: 'C', x: 2.5, y: 4, visible: true }
    ],
    lines: [
      { start: 'A', end: 'B', showLength: true, length: 5 },
      { start: 'B', end: 'C', showLength: true, length: 5 },
      { start: 'C', end: 'A', showLength: true, length: 5 }
    ],
    angles: [],
    circles: [],
    curves: []
  };
  
  // 실제 사용할 데이터 (props로 받은 데이터 또는 기본 데이터)
  const actualData = data || defaultData;

  // 데이터를 보기 좋게 포맷하는 함수
  const formatPoint = (point: Point) => {
    return `${point.label}(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
  };

  const formatLine = (line: Line) => {
    let text = `${line.start}${line.end}: ${line.length ? formatNumber(line.length) : '길이 미표시'}`;
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
    
    const newPoints = [...actualData.points];
    if (field === 'label') {
      newPoints[index] = { ...newPoints[index], [field]: value };
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        newPoints[index] = { ...newPoints[index], [field]: numValue };
      }
    }
    
    onDataChange({ ...actualData, points: newPoints });
  };

  const handleLineChange = (index: number, field: keyof Line, value: string | boolean) => {
    if (!onDataChange) return;
    
    const newLines = [...actualData.lines];
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
    
    onDataChange({ ...actualData, lines: newLines });
  };

  const handleAngleChange = (index: number, field: keyof Angle, value: string | boolean) => {
    if (!onDataChange) return;
    
    const newAngles = [...actualData.angles];
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
    
    onDataChange({ ...actualData, angles: newAngles });
  };

  const handleCircleChange = (index: number, field: keyof Circle, value: string | boolean | number) => {
    if (!onDataChange) return;
    
    const newCircles = [...actualData.circles];
    if (field === 'center' || field === 'startPoint' || field === 'endPoint') {
      newCircles[index] = { ...newCircles[index], [field]: value as string };
      
      // startPoint나 endPoint가 설정되면 자동으로 showArc를 true로 설정
      if ((field === 'startPoint' || field === 'endPoint') && value) {
        newCircles[index].showArc = true;
      }
    } else if (field === 'radius' || field === 'startAngle' || field === 'endAngle') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value as number;
      if (!isNaN(numValue)) {
        newCircles[index] = { ...newCircles[index], [field]: numValue };
        
        // startAngle이나 endAngle이 설정되면 자동으로 showArc를 true로 설정
        if ((field === 'startAngle' || field === 'endAngle') && numValue !== undefined) {
          newCircles[index].showArc = true;
        }
      }
    } else if (field === 'showRadius' || field === 'showRadiusArc' || field === 'showArc' || field === 'fillArc') {
      newCircles[index] = { ...newCircles[index], [field]: value as boolean };
    }
    
    onDataChange({ ...actualData, circles: newCircles });
  };

  // 새로운 점 추가 핸들러
  const handleAddPoint = () => {
    if (!onDataChange) return;
    
    const newPoint: Point = {
      label: String.fromCharCode(65 + actualData.points.length), // A, B, C, ... 순서로 라벨 생성
      x: 0.00,
      y: 0.00,
      visible: true // 기본값은 표시
    };
    
    onDataChange({
      ...actualData,
      points: [...actualData.points, newPoint]
    });
  };

  // 새로운 선분 추가 핸들러
  const handleAddLine = () => {
    if (!onDataChange || actualData.points.length < 2) return;
    
    // 선택된 두 점 사이의 거리 계산
    const startPoint = actualData.points[0];
    const endPoint = actualData.points[1];
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const newLine: Line = {
      start: startPoint.label,
      end: endPoint.label,
      showLength: true,
      showLengthArc: false,
      length: distance > 0 ? distance : 5 // 실제 거리가 있으면 그 값을, 없으면 기본값 5 사용
    };
    
    onDataChange({
      ...actualData,
      lines: [...actualData.lines, newLine]
    });
  };

  // 새로운 원 추가 핸들러
  const handleAddCircle = () => {
    if (!onDataChange || actualData.points.length < 1) return;
    
    const newCircle: Circle = {
      center: actualData.points[0].label,
      radius: 3.0, // 기본 반지름을 1.0에서 3.0으로 증가
      showRadius: true, // 반지름 표시를 기본으로 활성화
      showRadiusArc: false, // 반지름 호 표시는 기본적으로 비활성화
      showArc: true, // 호를 표시할지 여부
      fillArc: true, // 부채꼴로 채울지 여부
      startPoint: actualData.points[0].label, // 호의 시작점 (점 라벨)
      endPoint: actualData.points[0].label // 호의 끝점 (점 라벨)
    };
    
    onDataChange({
      ...actualData,
      circles: [...actualData.circles, newCircle]
    });
  };

  // 점 삭제 핸들러
  const handleDeletePoint = (index: number) => {
    if (!onDataChange) return;
    
    const deletedLabel = actualData.points[index].label;
    
    // 삭제할 점과 연결된 선분, 각도, 원 찾기 및 제거
    const newLines = actualData.lines.filter(line => 
      line.start !== deletedLabel && line.end !== deletedLabel
    );
    const newAngles = actualData.angles.filter(angle => 
      angle.vertex !== deletedLabel && angle.start !== deletedLabel && angle.end !== deletedLabel
    );
    const newCircles = actualData.circles.filter(circle => 
      circle.center !== deletedLabel
    );
    
    const newPoints = actualData.points.filter((_, idx) => idx !== index);
    
    onDataChange({
      ...actualData,
      points: newPoints,
      lines: newLines,
      angles: newAngles,
      circles: newCircles
    });
  };

  // 선분 삭제 핸들러
  const handleDeleteLine = (index: number) => {
    if (!onDataChange) return;
    
    const newLines = actualData.lines.filter((_, idx) => idx !== index);
    onDataChange({
      ...actualData,
      lines: newLines
    });
  };

  // 원 삭제 핸들러
  const handleDeleteCircle = (index: number) => {
    if (!onDataChange) return;
    
    const newCircles = actualData.circles.filter((_, idx) => idx !== index);
    onDataChange({
      ...actualData,
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
      ...actualData,
      curves: [...actualData.curves, newCurve]
    });
  };

  // 곡선 삭제 핸들러
  const handleDeleteCurve = (index: number) => {
    if (!onDataChange) return;
    
    const newCurves = actualData.curves.filter((_, idx) => idx !== index);
    onDataChange({
      ...actualData,
      curves: newCurves
    });
  };

  // 곡선 속성 변경 핸들러
  const handleCurveChange = (index: number, field: string, value: string | number) => {
    if (!onDataChange) return;
    
    const newCurves = [...actualData.curves];
    
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
    
    onDataChange({ ...actualData, curves: newCurves });
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
    setPanOffset({ x: 0, y: 0 }); // 패닝도 초기화
    setRotation(0); // 회전도 초기화
  };

  // 패닝 시작 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // 좌클릭만 처리
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      
      // 커서 스타일 변경
      if (svgContainerRef.current) {
        svgContainerRef.current.style.cursor = 'grabbing';
      }
    }
  };

  // 패닝 중 핸들러
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      setPanOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // 패닝 종료 핸들러
  const handleMouseUp = () => {
    setIsDragging(false);
    
    // 커서 스타일 복원
    if (svgContainerRef.current) {
      svgContainerRef.current.style.cursor = 'grab';
    }
  };

  // 마우스가 영역을 벗어났을 때 핸들러
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      
      // 커서 스타일 복원
      if (svgContainerRef.current) {
        svgContainerRef.current.style.cursor = 'grab';
      }
    }
  };

  // 마우스 휠 이벤트 핸들러 (확대/축소)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // 휠 위로 스크롤 시 확대, 아래로 스크롤 시 축소
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(prev + 0.1, 3)); // 최대 3배까지 확대
    } else {
      setZoomLevel(prev => Math.max(prev - 0.1, 0.5)); // 최소 0.5배까지 축소
    }
  };

  // 점 표시 여부 변경 핸들러 추가
  const handlePointVisibilityChange = (index: number, visible: boolean) => {
    if (!onDataChange) return;
    
    const newPoints = [...actualData.points];
    newPoints[index] = { ...newPoints[index], visible };
    
    onDataChange({ ...actualData, points: newPoints });
  };

  // 점 좌표 미세 조정 핸들러 추가
  const handleAdjustPoint = (index: number, field: 'x' | 'y', amount: number) => {
    if (!onDataChange) return;
    
    const newPoints = [...actualData.points];
    const currentValue = newPoints[index][field];
    const newValue = Math.round((currentValue + amount) * 100) / 100; // 소수점 둘째 자리까지 반올림
    
    newPoints[index] = { ...newPoints[index], [field]: newValue };
    onDataChange({ ...actualData, points: newPoints });
  };

  // 새로운 각도 추가 핸들러
  const handleAddAngle = () => {
    if (!onDataChange || actualData.points.length < 3) return;
    
    // 세 점으로 각도 계산
    const vertexPoint = actualData.points[0];
    const startPoint = actualData.points[1];
    const endPoint = actualData.points[2];
    
    // 벡터 계산
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
    
    // 라디안을 도로 변환
    const angleDegrees = Math.round(Math.abs(angleDiff) * 180 / Math.PI);
    
    const newAngle: Angle = {
      vertex: vertexPoint.label,
      start: startPoint.label,
      end: endPoint.label,
      value: angleDegrees || 90, // 계산된 각도가 0이면 기본값 90 사용
      showValue: true,
      rotation: 0
    };
    
    onDataChange({
      ...actualData,
      angles: [...actualData.angles, newAngle]
    });
  };

  // 회전 각도 변경 핸들러
  const handleRotationChange = (angle: number) => {
    setRotation(angle);
  };

  // 회전 초기화 핸들러
  const handleResetRotation = () => {
    setRotation(0);
  };

  // 반원 추가 핸들러
  const handleAddSemicircle = () => {
    if (!onDataChange || actualData.points.length < 2) return;
    
    // 두 점으로 반원 생성 (첫번째 점: 중심, 두번째 점: 지름 끝점)
    const centerPoint = actualData.points[0];
    const diameterPoint = actualData.points[1];
    
    // 반지름 계산
    const dx = diameterPoint.x - centerPoint.x;
    const dy = diameterPoint.y - centerPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);
    
    // 각도 계산 (두 점이 이루는 각도)
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // 반원은 각도가 180도인 부채꼴
    // 시작 각도는 계산된 각도에서 90도 뺀 값
    // 끝 각도는 시작 각도 + 180도
    const startAngle = angle - 90;
    const endAngle = startAngle + 180;
    
    // 반원의 시작점과 끝점 계산
    const startPointX = centerPoint.x + radius * Math.cos((startAngle * Math.PI) / 180);
    const startPointY = centerPoint.y + radius * Math.sin((startAngle * Math.PI) / 180);
    const endPointX = centerPoint.x + radius * Math.cos((endAngle * Math.PI) / 180);
    const endPointY = centerPoint.y + radius * Math.sin((endAngle * Math.PI) / 180);
    
    // 시작점과 끝점을 추가
    const startPointLabel = `${centerPoint.label}_start`;
    const endPointLabel = `${centerPoint.label}_end`;
    
    const newPoints = [
      ...actualData.points,
      { label: startPointLabel, x: startPointX, y: startPointY, visible: true },
      { label: endPointLabel, x: endPointX, y: endPointY, visible: true }
    ];
    
    const newCircle: Circle = {
      center: centerPoint.label,
      radius: radius,
      startAngle: startAngle,
      endAngle: endAngle,
      showArc: true,
      fillArc: true,
      showRadius: true,
      startPoint: startPointLabel,
      endPoint: endPointLabel
    };
    
    onDataChange({
      ...actualData,
      points: newPoints,
      circles: [...actualData.circles, newCircle]
    });
  };

  // 부채꼴 추가 핸들러
  const handleAddSector = () => {
    if (!onDataChange || actualData.points.length < 3) return;
    
    // 세 점으로 부채꼴 생성 (첫번째 점: 중심, 두번째 점과 세번째 점: 부채꼴의 경계)
    const centerPoint = actualData.points[0];
    const startPoint = actualData.points[1];
    const endPoint = actualData.points[2];
    
    // 반지름 계산 (첫번째 점과 두번째 점 사이의 거리)
    const radius = Math.sqrt(
      Math.pow(startPoint.x - centerPoint.x, 2) + 
      Math.pow(startPoint.y - centerPoint.y, 2)
    );
    
    // 시작 각도 계산 (중심점에서 시작점까지의 각도)
    const startAngle = Math.atan2(
      startPoint.y - centerPoint.y,
      startPoint.x - centerPoint.x
    ) * 180 / Math.PI;
    
    // 끝 각도 계산 (중심점에서 끝점까지의 각도)
    const endAngle = Math.atan2(
      endPoint.y - centerPoint.y,
      endPoint.x - centerPoint.x
    ) * 180 / Math.PI;
    
    // 부채꼴 객체 생성
    const newCircle: Circle = {
      center: centerPoint.label,
      radius: radius,
      startAngle: startAngle,
      endAngle: endAngle,
      showArc: true,
      fillArc: true,
      showRadius: true,
      startPoint: startPoint.label,
      endPoint: endPoint.label
    };
    
    onDataChange({
      ...actualData,
      circles: [...actualData.circles, newCircle]
    });
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;  // SVG 너비 증가
    const height = 600; // SVG 높이 증가
    const padding = 80; // 여백 증가

    // 도형의 경계 계산
    const points = actualData.points || [];
    const circles = actualData.circles || [];
    const curves = actualData.curves || [];
    
    // 항상 기본 경계 설정 (데이터가 비어있어도 도형 영역이 보이도록)
    let xMin = -10;
    let xMax = 10;
    let yMin = -10;
    let yMax = 10;
    
    // 데이터가 있는 경우에만 경계 재계산
    if (points.length > 0 || circles.length > 0 || curves.length > 0) {
      // 점과 원의 범위 계산
      if (points.length > 0) {
        xMin = Math.min(...points.map(p => p.x));
        xMax = Math.max(...points.map(p => p.x));
        yMin = Math.min(...points.map(p => p.y));
        yMax = Math.max(...points.map(p => p.y));
      }
      
      // 원의 범위 고려
      if (circles.length > 0) {
        circles.forEach(c => {
          const center = points.find(p => p.label === c.center);
          if (center) {
            xMin = Math.min(xMin, center.x - c.radius);
            xMax = Math.max(xMax, center.x + c.radius);
            yMin = Math.min(yMin, center.y - c.radius);
            yMax = Math.max(yMax, center.y + c.radius);
          }
        });
      }
      
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
    }
    
    // 도형의 크기 (최소 크기 보장)
    const shapeWidth = Math.max(xMax - xMin, 20);
    const shapeHeight = Math.max(yMax - yMin, 20);

    // 정사각형 모눈종이를 위한 스케일 조정
    // 더 넓은 범위를 기준으로 동일한 스케일 적용
    const maxRange = Math.max(shapeWidth, shapeHeight);
    
    // SVG의 가로세로 비율 계산
    const svgAspectRatio = (width - 2 * padding) / (height - 2 * padding);
    
    // 원점(0,0)이 항상 중앙에 오도록 도메인 범위 조정
    // 모눈종이 기준 칸 수를 5에서 15로 증가시켜 더 넓은 영역 표시
    const xDomainSize = Math.max(15, maxRange) * svgAspectRatio;
    const yDomainSize = Math.max(15, maxRange);
    
    // 원점 중심으로 도메인 설정
    const xDomainMin = -xDomainSize / 2;
    const xDomainMax = xDomainSize / 2;
    const yDomainMin = -yDomainSize / 2;
    const yDomainMax = yDomainSize / 2;

    // 스케일 조정 (여백을 고려한 중앙 정렬)
    const xScale = d3.scaleLinear()
      .domain([xDomainMin, xDomainMax])
      .range([padding, width - padding]);

    const yScale = d3.scaleLinear()
      .domain([yDomainMin, yDomainMax])
      .range([height - padding, padding]);

    // 역 스케일 함수 (SVG 좌표 -> 실제 좌표)
    const xInverse = d3.scaleLinear()
      .domain([padding, width - padding])
      .range([xDomainMin, xDomainMax]);

    const yInverse = d3.scaleLinear()
      .domain([height - padding, padding])
      .range([yDomainMin, yDomainMax]);

    // SVG의 중심점 계산
    const centerX = width / 2;
    const centerY = height / 2;

    // 패닝 및 확대/축소만 적용하는 그룹 (모눈종이용)
    const gridGroup = svg.append('g')
      .attr('transform', function() {
        let transform = '';
        
        // 패닝 오프셋 적용
        transform += `translate(${panOffset.x}, ${panOffset.y}) `;
        
        // 확대/축소 적용 (중심점 기준)
        transform += `translate(${centerX}, ${centerY}) `;
        transform += `scale(${zoomLevel}) `;
        transform += `translate(${-centerX}, ${-centerY}) `;
        
        // 확대/축소에 따른 추가 이동 (중심 유지를 위해)
        const zoomOffsetX = (width * (1 - zoomLevel)) / (2 * zoomLevel);
        const zoomOffsetY = (height * (1 - zoomLevel)) / (2 * zoomLevel);
        transform += `translate(${zoomOffsetX}, ${zoomOffsetY})`;
        
        return transform;
      });

    // 패닝, 확대/축소, 반전, 회전을 모두 적용하는 그룹 (도형용)
    const shapeGroup = svg.append('g')
      .attr('transform', function() {
        let transform = '';
        
        // 패닝 오프셋 적용
        transform += `translate(${panOffset.x}, ${panOffset.y}) `;
        
        // 먼저 중심으로 이동
        transform += `translate(${centerX}, ${centerY}) `;
        
        // 회전 적용 (도 단위를 라디안으로 변환)
        transform += `rotate(${rotation}) `;
        
        // 확대/축소 및 반전 적용
        transform += `scale(${zoomLevel * (flipX ? -1 : 1)}, ${zoomLevel * (flipY ? -1 : 1)}) `;
        
        // 다시 원래 위치로 이동
        transform += `translate(${-centerX}, ${-centerY}) `;
        
        // 확대/축소에 따른 추가 이동 (중심 유지를 위해)
        const zoomOffsetX = (width * (1 - zoomLevel)) / (2 * zoomLevel);
        const zoomOffsetY = (height * (1 - zoomLevel)) / (2 * zoomLevel);
        transform += `translate(${zoomOffsetX}, ${zoomOffsetY})`;
        
        return transform;
      });

    // 텍스트 반전 방지를 위한 함수 정의
    const createNonFlippedText = (
      parent: d3.Selection<SVGGElement, unknown, null, undefined>,
      x: number, 
      y: number, 
      text: string, 
      options: {
        fontSize?: string,
        fill?: string,
        textAnchor?: string,
        dominantBaseline?: string,
        fontWeight?: string
      } = {}
    ) => {
      const {
        fontSize = '12px',
        fill = '#000',
        textAnchor = 'middle',
        dominantBaseline = 'middle',
        fontWeight = 'normal'
      } = options;
      
      const textGroup = parent.append('g')
        .attr('transform', function() {
          // 텍스트 위치 계산
          const textX = xScale(x);
          const textY = yScale(y);
          
          // 텍스트 반전 및 회전 방지를 위한 변환
          let transform = `translate(${textX}, ${textY})`;
          
          // 반전이 적용된 경우 텍스트에 대해 반전을 상쇄
          if (flipX || flipY || rotation !== 0) {
            // 회전 상쇄 (반대 방향으로 회전)
            if (rotation !== 0) {
              transform += ` rotate(${-rotation})`;
            }
            
            // 반전 상쇄
            transform += ` scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`;
          }
          
          return transform;
        });
      
      return textGroup.append('text')
        .attr('text-anchor', textAnchor)
        .attr('dominant-baseline', dominantBaseline)
        .attr('font-size', fontSize)
        .attr('fill', fill)
        .attr('font-weight', fontWeight)
        .text(text);
    };

    // 모눈종이 그리기 (showGrid가 true일 때만)
    if (showGrid) {
      // 배경 사각형 추가
      gridGroup.append('rect')
        .attr('x', padding)
        .attr('y', padding)
        .attr('width', width - 2 * padding)
        .attr('height', height - 2 * padding)
        .attr('fill', '#f8f9fa');
      
      // 정사각형 모눈종이를 위한 그리드 간격 계산
      // x축과 y축에 동일한 간격 적용
      const gridStep = 1; // 기본 그리드 간격 (실제 좌표 기준)
      
      // 확대/축소 레벨에 따라 그리드 간격 조정
      const adjustedGridStep = zoomLevel < 0.8 ? 5 : gridStep;
      
      // x축 모눈선 그리기
      const xDomain = xScale.domain();
      for (let x = Math.floor(xDomain[0] / adjustedGridStep) * adjustedGridStep; 
           x <= Math.ceil(xDomain[1] / adjustedGridStep) * adjustedGridStep; 
           x += adjustedGridStep) {
        gridGroup.append('line')
          .attr('x1', xScale(x))
          .attr('y1', padding)
          .attr('x2', xScale(x))
          .attr('y2', height - padding)
          .attr('stroke', '#dee2e6')
          .attr('stroke-width', 1);
        
        // 주요 눈금에 숫자 표시 (5의 배수일 때)
        if (x % 5 === 0) {
          gridGroup.append('text')
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
      for (let y = Math.floor(yDomain[0] / adjustedGridStep) * adjustedGridStep; 
           y <= Math.ceil(yDomain[1] / adjustedGridStep) * adjustedGridStep; 
           y += adjustedGridStep) {
        gridGroup.append('line')
          .attr('x1', padding)
          .attr('y1', yScale(y))
          .attr('x2', width - padding)
          .attr('y2', yScale(y))
          .attr('stroke', '#dee2e6')
          .attr('stroke-width', 1);
        
        // 주요 눈금에 숫자 표시 (5의 배수일 때)
        if (y % 5 === 0) {
          gridGroup.append('text')
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
        gridGroup.append('line')
          .attr('x1', xScale(0))
          .attr('y1', padding)
          .attr('x2', xScale(0))
          .attr('y2', height - padding)
          .attr('stroke', '#adb5bd')
          .attr('stroke-width', 1.5);
        
        gridGroup.append('line')
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
      
      gridGroup.append('g')
        .attr('transform', `translate(0, ${yScale(0)})`)
        .call(xAxis);
      
      gridGroup.append('g')
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
      
      shapeGroup.append('path')
        .datum(points)
        .attr('fill', 'none')
        .attr('stroke', curve.type === 'linear' ? '#ff6b6b' : '#4dabf7')
        .attr('stroke-width', 1.5)
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
      
      shapeGroup.append('text')
        .attr('x', xScale(lastPoint[0]))
        .attr('y', yScale(lastPoint[1]) - 10)
        .attr('text-anchor', 'end')
        .attr('font-size', '12px')
        .text(label);
    });

    // 선분 그리기
    actualData.lines.forEach(line => {
      const startPoint = points.find(p => p.label === line.start);
      const endPoint = points.find(p => p.label === line.end);

      if (startPoint && endPoint) {
        // 선분 그리기
        shapeGroup.append('line')
          .attr('x1', xScale(startPoint.x))
          .attr('y1', yScale(startPoint.y))
          .attr('x2', xScale(endPoint.x))
          .attr('y2', yScale(endPoint.y))
          .attr('stroke', '#212529')
          .attr('stroke-width', 1.5);

        // 길이 표시
        if (line.showLength && line.length) {
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;
          
          createNonFlippedText(
            shapeGroup, 
            midX, 
            midY - 0.3,
            formatNumber(line.length),
            { fontSize: '13px', fontWeight: 'bold' }
          );
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
          
          shapeGroup.append('path')
            .attr('d', pathData)
            .attr('fill', 'none')
            .attr('stroke', '#adb5bd')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4');
          
          // 길이 값 표시 (제어점 위치에)
          createNonFlippedText(
            shapeGroup, 
            controlX, 
            controlY - 0.2,
            formatNumber(line.length), 
            { fill: '#495057', fontSize: '13px', fontWeight: 'bold' }
          );
        }
      }
    });

    // 각도 그리기
    actualData.angles.forEach(angle => {
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
          const radius = 20; // 반지름 크기를 30에서 20으로 감소
          
          // 직각(90도)인 경우 직각 기호로 표시
          if (Math.abs(angle.value - 90) < 0.1) { // 90도에 가까운 경우 (오차 허용)
            // 두 벡터의 단위 벡터 계산
            const startVectorLength = Math.sqrt(startVector.x * startVector.x + startVector.y * startVector.y);
            const endVectorLength = Math.sqrt(endVector.x * endVector.x + endVector.y * endVector.y);
            
            const startUnitVector = {
              x: startVector.x / startVectorLength,
              y: startVector.y / startVectorLength
            };
            
            const endUnitVector = {
              x: endVector.x / endVectorLength,
              y: endVector.y / endVectorLength
            };
            
            // 직각 기호의 크기를 더 작게 조정 (화면에서 벗어나지 않도록)
            const squareSize = radius * 0.02; // 크기 감소 (0.05에서 0.02로)
            
            // 직각 기호의 세 점 계산
            const point1 = {
              x: startUnitVector.x * squareSize,
              y: startUnitVector.y * squareSize
            };
            
            const point3 = {
              x: endUnitVector.x * squareSize,
              y: endUnitVector.y * squareSize
            };
            
            const point2 = {
              x: point1.x + endUnitVector.x * squareSize,
              y: point1.y + endUnitVector.y * squareSize
            };
            
            // 회전 변환을 적용하기 위한 그룹 생성
            const rightAngleGroup = shapeGroup.append('g')
              .attr('transform', `translate(${xScale(vertexPoint.x)}, ${yScale(vertexPoint.y)})`);
            
            // 직각 기호 그리기 (ㄱ 모양) - 상대 좌표로 변경
            // 회전 효과가 적용되도록 SVG 좌표 변환 방식 수정
            const p1x = xScale(vertexPoint.x + point1.x) - xScale(vertexPoint.x);
            const p1y = yScale(vertexPoint.y + point1.y) - yScale(vertexPoint.y);
            const p2x = xScale(vertexPoint.x + point2.x) - xScale(vertexPoint.x);
            const p2y = yScale(vertexPoint.y + point2.y) - yScale(vertexPoint.y);
            const p3x = xScale(vertexPoint.x + point3.x) - xScale(vertexPoint.x);
            const p3y = yScale(vertexPoint.y + point3.y) - yScale(vertexPoint.y);
            
            const pathData = `M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y}`;
            
            rightAngleGroup.append('path')
              .attr('d', pathData)
              .attr('fill', 'none')
              .attr('stroke', '#fd7e14')
              .attr('stroke-width', 2);
              
            // 직각 표시 사각형 추가 (더 명확하게 보이도록)
            const smallSquareSize = squareSize * 0.3;
            const rectX = p2x - smallSquareSize / 2;
            const rectY = p2y - smallSquareSize / 2;
            
            rightAngleGroup.append('rect')
              .attr('x', rectX)
              .attr('y', rectY)
              .attr('width', smallSquareSize)
              .attr('height', smallSquareSize)
              .attr('fill', '#fd7e14')
              .attr('stroke', 'none');
          } else {
            // 일반 각도는 원호로 표시
            const arcGenerator = d3.arc()
              .innerRadius(radius)
              .outerRadius(radius)
              .startAngle(adjustedStartAngle)
              .endAngle(adjustedEndAngle)
              .context(null);
            
            shapeGroup.append('path')
              .attr('d', arcGenerator({} as any))
              .attr('transform', `translate(${xScale(vertexPoint.x)}, ${yScale(vertexPoint.y)})`)
              .attr('fill', 'none')
              .attr('stroke', '#fd7e14')
              .attr('stroke-width', 1.5);
          }
          
          // 각도 값 표시
          const midAngle = (adjustedStartAngle + adjustedEndAngle) / 2;
          const labelRadius = radius + 10;
          
          // 화면 좌표계에서의 위치 계산
          const screenX = vertexPoint.x + Math.cos(midAngle) * labelRadius / width * (xMax - xMin);
          const screenY = vertexPoint.y + Math.sin(midAngle) * labelRadius / height * (yMax - yMin);
          
          createNonFlippedText(
            shapeGroup, 
            screenX, 
            screenY, 
            `${angle.value}°`, 
            { fontSize: '12px', fill: '#fd7e14' }
          );
        }
      }
    });

    // 원 그리기
    actualData.circles.forEach(circle => {
      const centerPoint = points.find(p => p.label === circle.center);
      const startPointObj = circle.startPoint ? points.find(p => p.label === circle.startPoint) : null;
      const endPointObj = circle.endPoint ? points.find(p => p.label === circle.endPoint) : null;

      if (centerPoint) {
        // 완전한 원인지 부채꼴/호인지 확인
        // 시작점이나 끝점이 설정되어 있거나, showArc가 true이고 시작/끝 각도가 설정되어 있으면 부채꼴/호로 처리
        const isFullCircle = !circle.showArc || 
                             ((!circle.startPoint && !circle.endPoint) && 
                             (circle.startAngle === undefined || circle.endAngle === undefined));
        
        if (isFullCircle) {
          // 완전한 원 그리기
          shapeGroup.append('circle')
            .attr('cx', xScale(centerPoint.x))
            .attr('cy', yScale(centerPoint.y))
            .attr('r', xScale(centerPoint.x + circle.radius) - xScale(centerPoint.x))
            .attr('fill', 'none')
            .attr('stroke', '#20c997')
            .attr('stroke-width', 2.5);
        } else {
          // 부채꼴/호 그리기
          const startAngleRad = ((circle.startAngle || 0) * Math.PI) / 180;
          const endAngleRad = ((circle.endAngle || 0) * Math.PI) / 180;
          
          // SVG 좌표계에서는 0도가 동쪽(3시)이고 시계 방향이 아닌 반시계 방향으로 각도가 증가
          // 수학에서의 각도와 SVG 각도의 차이를 처리
          
          // 큰 호(large-arc)인지 결정 (도형 사이의 각도가 180도 이상인 경우)
          const angleDiff = Math.abs(circle.endAngle! - circle.startAngle!);
          const largeArcFlag = angleDiff > 180 ? 1 : 0;
          
          // 시계 방향(sweep)인지 결정
          // SVG에서는 반시계 방향이 양수, 시계 방향이 음수인데 반대로 해줘야 함
          const sweepFlag = circle.endAngle! > circle.startAngle! ? 1 : 0;
          
          // 원호의 시작점과 끝점 계산
          let startX: number, startY: number, endX: number, endY: number;
          let svgStartX: number, svgStartY: number, svgEndX: number, svgEndY: number;
          let svgCenterX: number, svgCenterY: number;

          svgCenterX = xScale(centerPoint.x);
          svgCenterY = yScale(centerPoint.y);

          if (startPointObj && endPointObj) {
            // 지정된 점 사용
            startX = startPointObj.x;
            startY = startPointObj.y;
            endX = endPointObj.x;
            endY = endPointObj.y;
            
            // 호의 양끝점까지의 거리 계산 (실제 반지름으로 사용)
            const startRadius = Math.sqrt(
              Math.pow(startX - centerPoint.x, 2) + 
              Math.pow(startY - centerPoint.y, 2)
            );
            
            const endRadius = Math.sqrt(
              Math.pow(endX - centerPoint.x, 2) + 
              Math.pow(endY - centerPoint.y, 2)
            );
            
            // 두 반지름의 평균 사용 (더 안정적인 호 생성)
            const avgRadius = (startRadius + endRadius) / 2;
            
            // 지정된 점을 기준으로 각도 계산
            const startAngle = Math.atan2(startY - centerPoint.y, startX - centerPoint.x);
            const endAngle = Math.atan2(endY - centerPoint.y, endX - centerPoint.x);
            
            // 삼각형 방향 확인 (외적 사용)
            // v1 = 중심점에서 시작점으로의 벡터
            // v2 = 중심점에서 끝점으로의 벡터
            const v1x = startX - centerPoint.x;
            const v1y = startY - centerPoint.y;
            const v2x = endX - centerPoint.x;
            const v2y = endY - centerPoint.y;

            // 외적(cross product)으로 방향 확인
            // 양수: 반시계 방향, 음수: 시계 방향
            const crossProduct = v1x * v2y - v1y * v2x;

            // 각도의 차이 계산
            let angleDiff = endAngle - startAngle;

            // 각도 차이가 180도(π)를 넘으면 조정
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // 큰 호인지 여부 결정
            const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;

            // 시계 방향인지 결정 - 외적 값에 따라 결정
            const sweepFlag = crossProduct > 0 ? 0 : 1;

            // SVG 좌표로 변환
            svgStartX = xScale(startX);
            svgStartY = yScale(startY);
            svgEndX = xScale(endX);
            svgEndY = yScale(endY);
            
            // SVG 반지름 계산 (화면 좌표 기준)
            const svgRadius = xScale(centerPoint.x + avgRadius) - xScale(centerPoint.x);
            
            if (circle.fillArc) {
              // 부채꼴로 그리기 (정확한 SVG path 사용)
              // M: 시작점, A: 호, L: 중심점으로 직선
              const pathData = `M ${svgStartX},${svgStartY} A ${svgRadius},${svgRadius} 0 ${largeArcFlag} ${sweepFlag} ${svgEndX},${svgEndY} L ${svgCenterX},${svgCenterY} Z`;
              
              shapeGroup.append('path')
                .attr('d', pathData)
                .attr('fill', 'rgba(32, 201, 151, 0.3)')
                .attr('stroke', '#20c997')
                .attr('stroke-width', 2.5);
            } else {
              // 호만 그리기
              const pathData = `M ${svgStartX},${svgStartY} A ${svgRadius},${svgRadius} 0 ${largeArcFlag} ${sweepFlag} ${svgEndX},${svgEndY}`;
              
              shapeGroup.append('path')
                .attr('d', pathData)
                .attr('fill', 'none')
                .attr('stroke', '#20c997')
                .attr('stroke-width', 2.5);
            }
            
            // 연결선 표시 - 호의 점들을 특별한 색상으로 강조하여 시각화
            if (startPointObj.visible !== false) {
              // 시작점 표시
              shapeGroup.append('circle')
                .attr('cx', svgStartX)
                .attr('cy', svgStartY)
                .attr('r', 3)
                .attr('fill', '#20c997')
                .attr('stroke', '#20c997')
                .attr('stroke-width', 1.5);
            }
            
            if (endPointObj.visible !== false) {
              // 끝점 표시
              shapeGroup.append('circle')
                .attr('cx', svgEndX)
                .attr('cy', svgEndY)
                .attr('r', 3)
                .attr('fill', '#20c997')
                .attr('stroke', '#20c997')
                .attr('stroke-width', 1.5);
            }
            
            // 중심점에서 시작점과 끝점으로 선 그리기
            if (circle.fillArc) {
              // 시작점 연결선
              shapeGroup.append('line')
                .attr('x1', svgCenterX)
                .attr('y1', svgCenterY)
                .attr('x2', svgStartX)
                .attr('y2', svgStartY)
                .attr('stroke', '#20c997')
                .attr('stroke-width', 2);
              
              // 끝점 연결선
              shapeGroup.append('line')
                .attr('x1', svgCenterX)
                .attr('y1', svgCenterY)
                .attr('x2', svgEndX)
                .attr('y2', svgEndY)
                .attr('stroke', '#20c997')
                .attr('stroke-width', 2);
            }
          } else {
            // 지정된 점이 없는 경우(기존 각도 사용)
            startX = centerPoint.x + circle.radius * Math.cos(startAngleRad);
            startY = centerPoint.y + circle.radius * Math.sin(startAngleRad);
            endX = centerPoint.x + circle.radius * Math.cos(endAngleRad);
            endY = centerPoint.y + circle.radius * Math.sin(endAngleRad);
            
            svgStartX = xScale(startX);
            svgStartY = yScale(startY);
            svgEndX = xScale(endX);
            svgEndY = yScale(endY);
            
            // SVG 반지름 계산 (화면 좌표 기준)
            const svgRadius = xScale(centerPoint.x + circle.radius) - xScale(centerPoint.x);
            
            // SVG 중심점 좌표
            const svgCenterX = xScale(centerPoint.x);
            const svgCenterY = yScale(centerPoint.y);
            
            // 각도의 차이 계산 (도 단위)
            const angleDiff = circle.endAngle! - circle.startAngle!;
            
            // 큰 호인지 여부 결정
            const largeArcFlag = Math.abs(angleDiff) > 180 ? 1 : 0;
            
            // 시계 방향인지 결정
            const sweepFlag = angleDiff > 0 ? 1 : 0;
            
            if (circle.fillArc) {
              // 부채꼴로 그리기 (정확한 SVG path 사용)
              // M: 시작점, A: 호, L: 중심점으로 직선
              const pathData = `M ${svgStartX},${svgStartY} A ${svgRadius},${svgRadius} 0 ${largeArcFlag} ${sweepFlag} ${svgEndX},${svgEndY} L ${svgCenterX},${svgCenterY} Z`;
              
              shapeGroup.append('path')
                .attr('d', pathData)
                .attr('fill', 'rgba(32, 201, 151, 0.3)')
                .attr('stroke', '#20c997')
                .attr('stroke-width', 2.5);
            } else {
              // 호만 그리기
              const pathData = `M ${svgStartX},${svgStartY} A ${svgRadius},${svgRadius} 0 ${largeArcFlag} ${sweepFlag} ${svgEndX},${svgEndY}`;
              
              shapeGroup.append('path')
                .attr('d', pathData)
                .attr('fill', 'none')
                .attr('stroke', '#20c997')
                .attr('stroke-width', 2.5);
            }
            
            // 중심점에서 시작점과 끝점으로 선 그리기
            if (circle.fillArc) {
              // 시작점 연결선
              shapeGroup.append('line')
                .attr('x1', svgCenterX)
                .attr('y1', svgCenterY)
                .attr('x2', svgStartX)
                .attr('y2', svgStartY)
                .attr('stroke', '#20c997')
                .attr('stroke-width', 2);
              
              // 끝점 연결선
              shapeGroup.append('line')
                .attr('x1', svgCenterX)
                .attr('y1', svgCenterY)
                .attr('x2', svgEndX)
                .attr('y2', svgEndY)
                .attr('stroke', '#20c997')
                .attr('stroke-width', 2);
            }
          }
          
          // 반원이나 부채꼴의 이름 표시
          const midAngleRad = startPointObj && endPointObj 
            ? (Math.atan2(startY - centerPoint.y, startX - centerPoint.x) + Math.atan2(endY - centerPoint.y, endX - centerPoint.x)) / 2
            : (startAngleRad + endAngleRad) / 2;
          
          const labelX = centerPoint.x + circle.radius * 0.7 * Math.cos(midAngleRad);
          const labelY = centerPoint.y + circle.radius * 0.7 * Math.sin(midAngleRad);
          
          createNonFlippedText(
            shapeGroup,
            labelX,
            labelY,
            isFullCircle ? '완전한 원' : '부채꼴',
            {
              fontSize: '12px',
              fill: '#20c997',
              fontWeight: 'bold'
            }
          );
        }
        
        // 반지름 표시
        if (circle.showRadius || circle.showRadiusArc) {
          // 반지름 표시 각도 계산 (부채꼴인 경우 중간 각도, 아니면 0도)
          const radiusAngle = !isFullCircle ? 
            (((circle.startAngle || 0) + (circle.endAngle || 0)) / 2) * Math.PI / 180 : 0;
          
          const radiusEndX = centerPoint.x + circle.radius * Math.cos(radiusAngle);
          const radiusEndY = centerPoint.y + circle.radius * Math.sin(radiusAngle);
          
          // 직선으로 반지름 표시
          if (circle.showRadius) {
            // 반지름 선 그리기
            shapeGroup.append('line')
              .attr('x1', xScale(centerPoint.x))
              .attr('y1', yScale(centerPoint.y))
              .attr('x2', xScale(radiusEndX))
              .attr('y2', yScale(radiusEndY))
              .attr('stroke', '#20c997')
              .attr('stroke-width', 1.5)
              .attr('stroke-dasharray', '4');
            
            // 반지름 값 표시 (수치만 표시)
            createNonFlippedText(
              shapeGroup, 
              (centerPoint.x + radiusEndX) / 2, 
              (centerPoint.y + radiusEndY) / 2 - 0.2, 
              formatNumber(circle.radius),
              { fontSize: '13px', fontWeight: 'bold', fill: '#20c997' }
            );
          }
          
          // 호로 반지름 표시
          if (circle.showRadiusArc) {
            // 호의 높이 계산 (반지름의 약 15%)
            const arcHeight = circle.radius * 0.15;
            
            // 반지름 방향 벡터 계산
            const dirX = (radiusEndX - centerPoint.x) / circle.radius;
            const dirY = (radiusEndY - centerPoint.y) / circle.radius;
            
            // 반지름에 수직인 벡터 계산 (시계 방향으로 90도 회전)
            const perpX = dirY;
            const perpY = -dirX;
            
            // 호의 제어점 (반지름의 중점에서 수직 방향으로 이동)
            const midX = (centerPoint.x + radiusEndX) / 2;
            const midY = (centerPoint.y + radiusEndY) / 2;
            const controlX = midX + perpX * arcHeight;
            const controlY = midY + perpY * arcHeight;
            
            // 2차 베지어 곡선으로 호 그리기
            const pathData = `M ${xScale(centerPoint.x)} ${yScale(centerPoint.y)} 
                              Q ${xScale(controlX)} ${yScale(controlY)}, 
                              ${xScale(radiusEndX)} ${yScale(radiusEndY)}`;
            
            shapeGroup.append('path')
              .attr('d', pathData)
              .attr('fill', 'none')
              .attr('stroke', '#20c997')
              .attr('stroke-width', 1.5)
              .attr('stroke-dasharray', '4');
            
            // 길이 값 표시 (제어점 위치에)
            createNonFlippedText(
              shapeGroup, 
              controlX, 
              controlY - 0.2, 
              formatNumber(circle.radius), 
              { fill: '#20c997', fontSize: '13px', fontWeight: 'bold' }
            );
          }
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
        
        // SVG 요소의 위치와 크기 정보 가져오기
        const svgNode = svgRef.current;
        if (!svgNode) return;
        
        const svgRect = svgNode.getBoundingClientRect();
        
        // 마우스 이벤트 좌표를 SVG 좌표계로 변환
        const svgX = event.sourceEvent.clientX - svgRect.left;
        const svgY = event.sourceEvent.clientY - svgRect.top;
        
        // SVG 좌표를 실제 데이터 좌표로 변환
        const newX = xInverse(svgX);
        const newY = yInverse(svgY);
        
        // 점 위치 업데이트
        if (onDataChange && idx >= 0 && idx < actualData.points.length) {
          const newPoints = [...actualData.points];
          newPoints[idx] = {
            ...newPoints[idx],
            x: newX,
            y: newY
          };
          
          onDataChange({
            ...actualData,
            points: newPoints
          });
        }
      })
      .on('end', function() {
        d3.select(this).attr('fill', '#4dabf7'); // 드래그 종료 시 원래 색상으로 복원
      });

    // 점 그리기 (드래그 기능 추가)
    points.forEach((point, index) => {
      // visible이 false인 경우 표시하지 않음
      if (point.visible === false) return;
      
      // 점 그리기
      shapeGroup.append('circle')
        .attr('cx', xScale(point.x))
        .attr('cy', yScale(point.y))
        .attr('r', 5)
        .attr('fill', '#4dabf7')
        .attr('cursor', 'move')
        .attr('data-index', index.toString())
        .call(dragHandler as any);

      // 라벨 그리기 (텍스트 반전 방지)
      createNonFlippedText(
        shapeGroup, 
        point.x + 0.2, 
        point.y - 0.2, 
        point.label, 
        { 
          fontSize: '14px', 
          textAnchor: 'start', 
          dominantBaseline: 'hanging' 
        }
      );
    });
  }, [actualData, onDataChange, showGrid, zoomLevel, flipX, flipY, rotation, panOffset]);

  // 컴포넌트 마운트 시 커서 스타일 설정
  useEffect(() => {
    if (svgContainerRef.current) {
      svgContainerRef.current.style.cursor = 'grab';
    }
  }, []);

  return (
    <div className="flex flex-col md:flex-row items-start gap-4 w-full">
      <div className="w-full md:w-1/2 border rounded-lg flex flex-col">
        <div className="flex justify-between p-2 bg-gray-50 border-b sticky top-0 z-10">
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
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFlipX(!flipX)}
              className={`px-2 py-1 ${flipX ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-600 hover:text-white rounded text-xs`}
              title="좌우 반전"
            >
              좌우 반전
            </button>
            <button
              onClick={() => setFlipY(!flipY)}
              className={`px-2 py-1 ${flipY ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-600 hover:text-white rounded text-xs`}
              title="상하 반전"
            >
              상하 반전
            </button>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleRotationChange((rotation - 15) % 360)}
                className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                title="반시계 방향으로 15도 회전"
              >
                ↺
              </button>
              <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 min-w-[40px] text-center">
                {rotation}°
              </div>
              <button
                onClick={() => handleRotationChange((rotation + 15) % 360)}
                className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                title="시계 방향으로 15도 회전"
              >
                ↻
              </button>
              <button
                onClick={handleResetRotation}
                className="px-1 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs text-gray-700"
                title="회전 초기화"
              >
                초기화
              </button>
            </div>
            <label className="inline-flex items-center cursor-pointer">
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
        <div 
          ref={svgContainerRef}
          className="overflow-auto h-[600px]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
            width="800"
            height="600"
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto"
          />
        </div>
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
            {actualData.points.map((point, idx) => (
              <div key={idx} className="bg-white p-2 rounded grid grid-cols-6 gap-2 items-center">
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
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={point.visible !== false}
                    onChange={(e) => handlePointVisibilityChange(idx, e.target.checked)}
                    className="mr-1"
                  />
                  <span className="text-xs">표시</span>
                </div>
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
              disabled={actualData.points.length < 2}
            >
              선분 추가
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {actualData.lines.map((line, idx) => (
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
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">각도:</h3>
            <button
              onClick={handleAddAngle}
              className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
              disabled={actualData.points.length < 3}
            >
              각도 추가
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {actualData.angles.map((angle, idx) => (
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
                  <button
                    onClick={() => {
                      if (!onDataChange) return;
                      
                      const newAngles = actualData.angles.filter((_, i) => i !== idx);
                      onDataChange({
                        ...actualData,
                        angles: newAngles
                      });
                    }}
                    className="w-6 h-6 text-red-500 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
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
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">원과 부채꼴:</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleAddCircle}
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
                disabled={actualData.points.length < 1}
              >
                원 추가
              </button>
              <button
                onClick={handleAddSemicircle}
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
                disabled={actualData.points.length < 2}
              >
                반원 추가
              </button>
              <button
                onClick={handleAddSector}
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
                disabled={actualData.points.length < 3}
              >
                부채꼴 추가
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {actualData.circles.map((circle, idx) => {
              // 원인지 부채꼴인지 반원인지 구분
              let typeText = '원';
              if (circle.startAngle !== undefined && circle.endAngle !== undefined) {
                if (Math.abs(Math.abs(circle.endAngle - circle.startAngle) - 180) < 0.1) {
                  typeText = '반원';
                } else {
                  typeText = '부채꼴';
                }
              }
              
              return (
                <div key={idx} className="bg-white p-2 rounded grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-4 gap-2 items-center">
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
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={circle.showRadius || false}
                          onChange={(e) => handleCircleChange(idx, 'showRadius', e.target.checked)}
                          className="mr-1"
                        />
                        <span className="text-xs">반지름</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCircle(idx)}
                      className="w-6 h-6 text-red-500 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* 부채꼴/반원인 경우 각도 설정 표시 */}
                  {(typeText === '부채꼴' || typeText === '반원') && (
                    <div className="grid grid-cols-3 gap-2 items-center mt-1">
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
                        <span className="text-xs">채우기</span>
                      </div>
                    </div>
                  )}

                  {/* 호의 시작점과 끝점 설정 추가 */}
                  {(typeText === '부채꼴' || typeText === '반원') && (
                    <div className="grid grid-cols-3 gap-2 items-center mt-1">
                      <select
                        value={circle.startPoint || ''}
                        onChange={(e) => handleCircleChange(idx, 'startPoint', e.target.value)}
                        className="w-full p-1 border rounded"
                      >
                        <option value="">시작점 선택</option>
                        {actualData.points.map(point => (
                          <option key={`start-${point.label}`} value={point.label}>
                            {point.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={circle.endPoint || ''}
                        onChange={(e) => handleCircleChange(idx, 'endPoint', e.target.value)}
                        className="w-full p-1 border rounded"
                      >
                        <option value="">끝점 선택</option>
                        {actualData.points.map(point => (
                          <option key={`end-${point.label}`} value={point.label}>
                            {point.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center">
                        <span className="text-xs">호점 지정</span>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-1">
                    {typeText} {circle.center}: 반지름 {circle.radius.toFixed(2)}
                    {(typeText === '부채꼴' || typeText === '반원') && 
                      ` (${circle.startAngle?.toFixed(0)}° ~ ${circle.endAngle?.toFixed(0)}°)`}
                    {circle.startPoint && circle.endPoint && 
                      ` [${circle.startPoint} → ${circle.endPoint}]`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
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
            {actualData.curves.map((curve, idx) => (
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