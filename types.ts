
export interface Point {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Path {
  points: Point[];
  color: string;
  width: number;
  isEraser?: boolean;
}

export interface Path3D {
  id: string;
  points: Vector3[];
  color: string;
  width: number;
}

export interface Measurement {
  id: string;
  start: Vector3;
  end: Vector3;
  distance: number;
}

export type ToolMode = 'view' | 'pencil' | 'pencil3d' | 'eraser' | 'eraser3d' | 'measure';
export type CameraMode = 'orbit' | 'thirdperson';
