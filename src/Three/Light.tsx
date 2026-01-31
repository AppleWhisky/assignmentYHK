import { Environment } from '@react-three/drei';

export const Light = () => {
  return (
    <>
      <Environment preset="apartment" />
      <directionalLight position={[3, 4, 2]} intensity={0.75} />
    </>
  );
};
