import type { ReactNode } from 'react';

export const OverlayLayout = (props: {
  top?: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
}) => {
  return (
    <>
      {props.top ? <div className="topBar">{props.top}</div> : null}
      {props.right ? (
        <div
          className="sidePanel"
          onWheel={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
        >
          {props.right}
        </div>
      ) : null}
      {props.bottom ? <div className="bottomBar">{props.bottom}</div> : null}
    </>
  );
};
