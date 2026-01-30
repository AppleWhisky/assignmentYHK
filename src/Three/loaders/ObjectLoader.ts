import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';

export type ObjectGLTF = GLTF & {
  nodes: Record<string, unknown>;
  materials: Record<string, unknown>;
};

export const useObjectGLTF = (url: string) => {
  return useGLTF(url) as unknown as ObjectGLTF;
};

export const preloadObjectGLTF = (url: string) => {
  useGLTF.preload(url);
};
