"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useState, useCallback } from "react";
import * as THREE from "three";
import type { Unit, UnitStatus } from "./unitTypes";
import { STATUS_COLOR } from "./unitTypes";

// Unit box dimensions
const W = 1.0;
const H = 0.55;
const D = 0.45;
const GAP_X = 0.08;
const GAP_Y = 0.12;
const STEP_X = W + GAP_X;
const STEP_Y = H + GAP_Y;

// Building centre
const TOTAL_W = 5 * STEP_X + W;
const TOTAL_H = 15 * STEP_Y + H;
const CX = TOTAL_W / 2 - W / 2;
const CY = TOTAL_H / 2 - H / 2;

function hexColor(hex: string) {
  return new THREE.Color(hex);
}

function UnitMesh({
  unit,
  isSelected,
  isHovered,
  onClick,
  onEnter,
  onLeave,
}: {
  unit: Unit;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const x = (unit.position - 1) * STEP_X;
  const y = (unit.floor - 1) * STEP_Y;
  const z = isSelected ? 0.18 : 0;
  const depth = D + (isSelected ? 0.12 : 0);
  const color = hexColor(STATUS_COLOR[unit.status as UnitStatus] ?? STATUS_COLOR.sem_vistoria);

  // Font size: 4-digit numbers need smaller text
  const fontSize = unit.number.length <= 3 ? 0.145 : 0.115;

  return (
    <group position={[x, y, z]}>
      {/* The box */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={(e) => { e.stopPropagation(); onEnter(); }}
        onPointerLeave={() => onLeave()}
      >
        <boxGeometry args={[W, H, depth]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected || isHovered ? color : new THREE.Color(0, 0, 0)}
          emissiveIntensity={isSelected ? 0.5 : isHovered ? 0.25 : 0}
          roughness={isSelected ? 0.3 : 0.65}
          metalness={0.15}
        />
      </mesh>

      {/* Unit number label on front face */}
      <Text
        position={[0, 0, depth / 2 + 0.005]}
        fontSize={fontSize}
        color="white"
        fillOpacity={isSelected ? 1 : 0.75}
        anchorX="center"
        anchorY="middle"
        renderOrder={1}
        depthOffset={-1}
      >
        {unit.number}
      </Text>
    </group>
  );
}

function BuildingGroup({
  units,
  selectedId,
  onSelect,
}: {
  units: Unit[];
  selectedId: string | null;
  onSelect: (u: Unit | null) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleEnter = useCallback((id: string) => {
    setHoveredId(id);
    document.body.style.cursor = "pointer";
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredId(null);
    document.body.style.cursor = "default";
  }, []);

  // Unique floors for floor labels on the left
  const floors = Array.from(new Set(units.map((u) => u.floor))).sort((a, b) => a - b);

  return (
    <group>
      {/* Floor number labels — left side */}
      {floors.map((floor) => {
        const y = (floor - 1) * STEP_Y;
        return (
          <Text
            key={`fl-${floor}`}
            position={[-1.1, y, 0]}
            fontSize={0.18}
            color="#2AB9B0"
            fillOpacity={0.7}
            anchorX="right"
            anchorY="middle"
          >
            {floor}
          </Text>
        );
      })}

      {/* Unit boxes */}
      {units.map((unit) => (
        <UnitMesh
          key={unit.id}
          unit={unit}
          isSelected={unit.id === selectedId}
          isHovered={unit.id === hoveredId}
          onClick={() => onSelect(unit.id === selectedId ? null : unit)}
          onEnter={() => handleEnter(unit.id)}
          onLeave={handleLeave}
        />
      ))}
    </group>
  );
}

export default function Building3D({
  units,
  selectedId,
  onSelect,
}: {
  units: Unit[];
  selectedId: string | null;
  onSelect: (u: Unit | null) => void;
}) {
  return (
    <Canvas
      camera={{ position: [CX, CY + 1, 16], fov: 42 }}
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
        minDistance={9}
        maxDistance={26}
        minPolarAngle={Math.PI / 12}
        maxPolarAngle={Math.PI * 0.6}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </Canvas>
  );
}
