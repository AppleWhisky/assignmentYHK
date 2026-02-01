import { Environment } from '@react-three/drei';
import hdrUrl from '@/assets/hdri/studio_kontrast_03_1k.hdr?url';

export const Light = () => {
  return (
    <>
      <Environment files={hdrUrl} />
      <directionalLight position={[3, 4, 2]} intensity={0.75} />
    </>
  );
};
