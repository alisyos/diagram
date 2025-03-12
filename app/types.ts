export interface Point {
  x: number;
  y: number;
  label: string;
}

export interface Line {
  start: string;
  end: string;
  length?: number;
  showLength?: boolean;
}

export interface Angle {
  vertex: string;
  start: string;
  end: string;
  value: number;
  showValue: boolean;
}

export interface Circle {
  center: string;
  radius: number;
  showRadius?: boolean;
}

export interface GeometryData {
  points: Point[];
  lines: Line[];
  angles: Angle[];
  circles: Circle[];
}