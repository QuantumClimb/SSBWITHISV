
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

export type ObjectType = 'cylinder' | 'plank' | 'rope';

export interface PlacedObject {
  id: string;
  type: ObjectType;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  color: string;
  points?: Vector3[]; // Useful for rope/plank if they are multi-point
}

export type ToolMode = 'view' | 'pencil' | 'pencil3d' | 'eraser' | 'eraser3d' | 'measure' | 'place' | 'focus';
export type CameraMode = 'orbit' | 'thirdperson';
export type UnitSystem = 'metric' | 'imperial';
