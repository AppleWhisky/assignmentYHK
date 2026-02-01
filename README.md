# 로봇 팔 디지털 트윈 (R3F)

본 문서는 “프로젝트 설명 자료” 목적의 README입니다.  
과제 요구사항을 만족하는 구현 상태와, 그 이상으로 확장한 기능/구조/의도를 함께 정리합니다.

---

## 1) 프로젝트 개요

### 목표
- 브라우저에서 로봇을 조작하기 전, 운영자가 **웹 기반 디지털 트윈**으로
  - Three.js를 활용하여 로봇 팔과 작업 공간을 3D로 시각화
  - Joint(관절 각도)를 제어할 수 있는 조그(Jog) 컨트롤러 패널 설계
  - 사용자가 3D 공간 내에 가상의 장애물(박스 형태)을 추가·배치
  - 로봇 조작 시 장애물과 충돌이 예상될 경우 시각적 경고
  - 충돌 테스트를 구현하기 위한 애니메이션 생성 기능
  - 애니메이션 기반 “충돌 시뮬레이션 재생”
  - 충돌 로그 확인(리포트)
  를 한 흐름으로 수행할 수 있게 하는 것이 목표입니다.

### 기술 스택
- **React + TypeScript**
- **React Three Fiber(R3F) + Drei**: 3D 씬 구성, 컨트롤, HDRI 환경광
- **Zustand**: 상태 관리(로봇 pose / 장애물 / 충돌 / 애니메이션 / 시뮬레이션)
- **ReactFlow**: 애니메이션 제작(Animator) 오버레이

---

## 2) 과제 요구사항 충족 여부

- **3D 시각화(Three.js)**: 구현 완료
  - 단순화된 로봇 팔(3축 이상) + 작업공간(바닥/그리드)
- **JOG 컨트롤러 UI**: 구현 완료
  - 각 축에 대한 회전을 Slider와 버튼으로 제어
- **장애물(박스) 추가/배치**: 구현 완료
- **충돌 예상 시 시각적 경고**: 구현 완료
  - 근접 경고 / 접촉 충돌 시 robot과 obstacle 색상 변환

---

## 3) 실행 방법

```bash
npm install
npm run dev
```

검증용 스크립트:
- `npm run typecheck`
- `npm run lint`
- `npm run build`

---

## 4) 프로젝트 구조(폴더/모듈 역할)

### 전체 구조
```text
src/
  Three/                          # 3D 씬 구성(로봇/장애물/충돌/시뮬레이션)
    RobotScene.tsx                # Canvas + 씬 오케스트레이션(로봇/장애물/충돌/플레이어)
    Light.tsx                     # HDRI 환경광/라이트
    Robot/
      RobotLoader.tsx             # GLB 로딩 + joint rig 구성
      Arm01Rig.ts                 # 조인트 목록/축/limit 등 rig 정의(하드코딩 포함)
      applyJointAngles.ts         # joint 각도 적용(Quaternion)
    Obstacles/
      ObstaclesLayer.tsx          # 장애물 렌더 레이어
      ObstacleMesh.tsx            # 장애물 메쉬(리소스 라이프사이클 관리 포함)
    Gizmos/
      ObstacleGizmo.tsx           # 장애물 TransformControls
      JointGizmo.tsx              # joint 회전 gizmo
      JointHandles.tsx            # joint 선택/핸들
    Collision/
      CollisionSystem.tsx         # 로봇↔장애물 충돌/경고 계산 + tint 적용
      CollisionDebugBoxes.tsx     # 디버그 박스(Boxes 토글)
      SelfCollisionSystem.tsx     # (프로토타입) self-collision
    Animation/
      AnimationPlayer.tsx         # 시뮬레이션 재생 + stop-on-collision + 리포트 기록
  UI/                             # 운영자 UI
    TopBar.tsx                    # 상단 HUD(Boxes/Reach 토글 등)
    JogPanel.tsx                  # JOG + Simulation 제어
    ObstaclePanel.tsx             # 장애물 목록/속성 편집
    BottomBar.tsx                 # 최신 충돌 이벤트 + Full report 버튼
    SimulationReport/
      SimulationReportModal.tsx   # 충돌 리포트 모달(복사/클리어)
    AnimationEditor/
      AnimationEditorOverlay.tsx  # 애니메이션 제작(ReactFlow) + Import/Export
  store/                          # 상태 관리(Zustand)
    useSimStore.ts                # 단일 엔트리포인트(공개 API 유지)
    types.ts                      # 전역 타입 정의
    animationUtils.ts             # 애니메이션 파싱/마이그레이션/유틸
    slices/                       # 도메인별 slice(책임 분리)
      sceneSlice.ts
      robotSlice.ts
      obstaclesSlice.ts
      selectionSlice.ts
      collisionSlice.ts
      animationSlice.ts
      playbackSlice.ts
public/
  animations/                     # 애니메이션 프리셋(JSON) + manifest
src/assets/hdri/                  # 기본 HDRI
```

### 구조적 의미(왜 이렇게 나눴는가)
- **UI / 3D / 상태(store)**를 분리해 “기능 확장”에도 코드가 비대해지지 않도록 설계
- 상태는 `useSimStore` 단일 API를 유지하되 내부는 slice로 분리하여:
  - 애니메이션/시뮬레이션/충돌 같은 기능이 추가되어도 유지보수 가능
- 3D 씬 오케스트레이션(`RobotScene`)은 “렌더링” 중심,  
  충돌/플레이어는 “시뮬레이션 기능”으로 별도 모듈로 분리

---

## 5) 핵심 기능 상세

### 5.1 JOG 기능 & UI
- Joint angle 제어
- 시뮬레이션 선택, 재생, 옵션 제어
- 로봇 위치 제어 및 초기화

관련 파일:
- `src/UI/JogPanel.tsx`
- `src/store/slices/robotSlice.ts`
- `src/Three/RobotScene.tsx`

### 5.2 장애물(Obstacle) 추가/변경 & UI
- 박스 장애물 추가/선택/삭제
- 씬에서 gizmo로 이동/회전
- 선택한 박스 위치/회전/크기 수정

관련 파일:
- `src/UI/ObstaclePanel.tsx`
- `src/store/slices/obstaclesSlice.ts`
- `src/Three/Obstacles/ObstacleMesh.tsx`

### 5.3 충돌/경고(시각화 + 디버그)
- robot↔obstacle 근접/충돌을 계산해 robot mesh에 tint 적용
- TopBar의 **Boxes** 토글로 충돌 볼륨을 확인(디버깅/설명용)
- 현재 충돌 볼륨은 회전/스케일 변화에서도 안정적인 **OBB 기반**으로 체크
  - Warning은 `WARNING_MARGIN` 기반 “근접 영역” 확장으로 처리

관련 파일:
- `src/Three/Collision/CollisionSystem.tsx`
- `src/Three/Collision/CollisionDebugBoxes.tsx`
- `src/UI/TopBar.tsx`

### 5.4 Animation 생성 기능(Animator)
- ReactFlow 기반 오버레이 에디터
- Layer(정수) = 1초 슬롯 기반 타임라인 모델
- JSON Import/Export 지원

관련 파일:
- `src/UI/AnimationEditor/AnimationEditorOverlay.tsx`
- `src/store/animationUtils.ts`
- `src/store/slices/animationSlice.ts`

### 5.5 시뮬레이션(Playback)
- Simulation Start/Stop
- loop 모드 지원(예: pingpong)
- 옵션: Stop on collision
  - 충돌 시 멈추고 report를 생성
  - 옵션 끌 시 충돌시 멈춤없이 계속 report 작성

관련 파일:
- `src/Three/Animation/AnimationPlayer.tsx`
- `src/store/slices/playbackSlice.ts`

### 5.6 Report 기능(충돌 로그)
- 충돌 이벤트를 “enter event”로 기록(지속 접촉에서 프레임마다 스팸 방지)
- UI:
  - BottomBar: 최신 충돌 + Full report
  - Modal: 전체 로그 + Copy/Clear
  - log 없을 시 UI를 감춤

관련 파일:
- `src/UI/BottomBar.tsx`
- `src/UI/SimulationReport/SimulationReportModal.tsx`
- `src/Three/Animation/AnimationPlayer.tsx`

---

## 6) 과제 요구사항 “이상”으로 구현한 부분(차별점)

### 6.1 운영자 워크플로우 확장
- 단순 “조작 + 경고”를 넘어:
  - Animator 제작
  - Animation 기반 Simulation 실행
  - Report로 충돌 시간과 위치 확인
  까지 일관된 UX 제공

### 6.2 디버그/검증 도구 제공
- Boxes 토글로 충돌 볼륨을 시각화하여
  - 충돌 결과의 신뢰성/근거를 사용자에게 제공
  - 개발/튜닝 과정에서도 빠른 검증 가능

### 6.3 유지보수 가능한 상태 구조
- Zustand store를 slice로 분리하여
  - 애니메이션/시뮬레이션/충돌/리포트 기능이 추가되어도 구조 유지

---

## 7) 환경/렌더링 설정

- 기본 HDRI 환경광:
  - `src/assets/hdri/studio_kontrast_03_1k.hdr`
  - 적용: `src/Three/Light.tsx`

---

## 8) 알려진 이슈 / 추가 개선 방향

### 알려진 이슈
- `BaseYaw`가 포함된 애니메이션 재생 시작 시, 일부 환경에서 로봇 베이스 XZ 위치가 `(0,0,0)`으로 스냅되는 현상이 보고됨  
  - TransformControls 가드/비활성화 등 완화는 적용했으나, 재현 시 `robotPosition` 변경 경로의 추가 추적이 필요

### 추가 개선 방향(예시)
- 정밀 충돌: BVH 기반 mesh collision 또는 collider 프록시(capsule/convex) 도입
- self-collision: 더 안정적인 collider 정의 후 옵션으로 재도입
- 시뮬레이션 안정화: deterministic replay / step 분리 등
- 로봇팔을 쉽게 제어 가능한 IK rig 제공
  - 현재는 parent-child 기반 robot을 만들어서 rig 기반이 아님으로 ik rig를 제공하지 않음
