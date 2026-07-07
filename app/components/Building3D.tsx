"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useState, useCallback } from "react";
import * as THREE from "three";
import type { Unit, UnitStatus } from "./unitTypes";
import { STATUS_COLOR, isSpecialLevel, isCommonArea } from "./unitTypes";

// Box dimensions
const W = 1.0;
const H = 0.55;
const D = 0.45;
const GAP_X = 0.08;
const GAP_Y = 0.12;
const STEP_X = W + GAP_X;
const STEP_Y = H + GAP_Y;

// Área comum do pavimento (posição 7) — box ao lado com folga extra
const CA_X = 6 * STEP_X + 0.22;
const RIGHT = CA_X;                 // centro do box mais à direita
const CX = RIGHT / 2;               // centro horizontal do prédio

// Vertical: níveis de -2 (G2) a 18 (Cobertura Verde)
const MIN_FLOOR = -2;
const MAX_FLOOR = 18;
const CY = ((MIN_FLOOR - 1) * STEP_Y + (MAX_FLOOR - 1) * STEP_Y) / 2;

// Níveis especiais: box largo cobrindo toda a largura
const SPECIAL_W = RIGHT + W + 0.2;

function statusColor(u: Unit) {
  return new THREE.Color(STATUS_COLOR[u.status as UnitStatus] ?? STATUS_COLOR.disponivel);
}

function BoxUnit({
  unit, x, y, w, label, fontSize, isSelected, isHovered, onClick, onEnter, onLeave,
}: {
  unit: Unit;
  x: number; y: number; w: number; label: string; fontSize: number;
  isSelected: boolean; isHovered: boolean;
  onClick: () => void; onEnter: () => void; onLeave: () => void;
}) {
  const z = isSelected ? 0.18 : 0;
  const depth = D + (isSelected ? 0.12 : 0);
  const color = statusColor(unit);
  return (
    <group position={[x, y, z]}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={(e) => { e.stopPropagation(); onEnter(); }}
        onPointerLeave={() => onLeave()}
      >
        <boxGeometry args={[w, H, depth]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected || isHovered ? color : new THREE.Color(0, 0, 0)}
          emissiveIntensity={isSelected ? 0.5 : isHovered ? 0.25 : 0}
          roughness={isSelected ? 0.3 : 0.65}
          metalness={0.15}
        />
      </mesh>
      <Text
        position={[0, 0, depth / 2 + 0.005]}
        fontSize={fontSize}
        color="white"
        fillOpacity={isSelected ? 1 : 0.8}
        anchorX="center"
        anchorY="middle"
        renderOrder={1}
        depthOffset={-1}
        maxWidth={w - 0.12}
      >
        {label}
      </Text>
    </group>
  );
}

function BuildingGroup({
  units, selectedId, onSelect,
}: {
  units: Unit[];
  selectedId: string | null;
  onSelect: (u: Unit | null) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const handleEnter = useCallback((id: string) => { setHoveredId(id); document.body.style.cursor = "pointer"; }, []);
  const handleLeave = useCallback(() => { setHoveredId(null); document.body.style.cursor = "default"; }, []);

  const aptFloors = Array.from(new Set(units.filter((u) => !isSpecialLevel(u.floor)).map((u) => u.floor))).sort((a, b) => a - b);

  return (
    <group>
      {/* Rótulos dos pavimentos de apartamento (esquerda) */}
      {aptFloors.map((floor) => (
        <Text
          key={`fl-${floor}`}
          position={[-1.15, (floor - 1) * STEP_Y, 0]}
          fontSize={0.18}
          color="#2AB9B0"
          fillOpacity={0.7}
          anchorX="right"
          anchorY="middle"
        >
          {floor}
        </Text>
      ))}

      {units.map((unit) => {
        const y = (unit.floor - 1) * STEP_Y;
        const common = { isSelected: unit.id === selectedId, isHovered: unit.id === hoveredId,
          onClick: () => onSelect(unit.id === selectedId ? null : unit),
          onEnter: () => handleEnter(unit.id), onLeave: handleLeave };

        if (isSpecialLevel(unit.floor)) {
          return (
            <BoxUnit key={unit.id} unit={unit} x={CX} y={y} w={SPECIAL_W}
              label={unit.number} fontSize={0.2} {...common} />
          );
        }
        if (isCommonArea(unit)) {
          return (
            <BoxUnit key={unit.id} unit={unit} x={CA_X} y={y} w={W}
              label="AC" fontSize={0.16} {...common} />
          );
        }
        // apartamento
        const fs = unit.number.length <= 3 ? 0.145 : 0.115;
        return (
          <BoxUnit key={unit.id} unit={unit} x={(unit.position - 1) * STEP_X} y={y} w={W}
            label={unit.number} fontSize={fs} {...common} />
        );
      })}
    </group>
  );
}

export default function Building3D({
  units, selectedId, onSelect,
}: {
  units: Unit[];
  selectedId: string | null;
  onSelect: (u: Unit | null) => void;
}) {
  return (
    <Canvas
      camera={{ position: [CX, CY, 22], fov: 42 }}
      style={{ background: "#0A1521" }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 10, 8]} intensity={1.1} />
      <directionalLight position={[-4, 6, 4]} intensity={0.35} color="#2AB9B0" />
      <directionalLight position={[0, -4, 6]} intensity={0.15} color="#ffffff" />

      <BuildingGroup units={units} selectedId={selectedId} onSelect={onSelect} />

      <OrbitControls
        target={[CX, CY, 0]}
        enablePan={false}
        minDistance={10}
        maxDistance={34}
        minPolarAngle={Math.PI / 12}
        maxPolarAngle={Math.PI * 0.6}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </Canvas>
  );
}
