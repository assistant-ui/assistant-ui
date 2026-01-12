import { createRoot } from "react-dom/client";
import { useRef, useImperativeHandle, useState, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useSpring } from "@react-spring/three";
import { AnimatePresence, motion } from "framer-motion";
import {
  EffectComposer,
  Bloom,
  DepthOfField,
} from "@react-three/postprocessing";
import { useWidgetProps } from "../use-widget-props";
import { useMaxHeight } from "../use-max-height";
import { useDisplayMode } from "../use-display-mode";
import {
  useNavigate,
  useParams,
  Routes,
  Route,
  BrowserRouter,
} from "react-router-dom";

const ExpandIcon = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4.33496 11C4.33496 10.6327 4.63273 10.335 5 10.335C5.36727 10.335 5.66504 10.6327 5.66504 11V14.335H9L9.13379 14.3486C9.43692 14.4106 9.66504 14.6786 9.66504 15C9.66504 15.3214 9.43692 15.5894 9.13379 15.6514L9 15.665H5C4.63273 15.665 4.33496 15.3673 4.33496 15V11ZM14.335 9V5.66504H11C10.6327 5.66504 10.335 5.36727 10.335 5C10.335 4.63273 10.6327 4.33496 11 4.33496H15L15.1338 4.34863C15.4369 4.41057 15.665 4.67857 15.665 5V9C15.665 9.36727 15.3673 9.66504 15 9.66504C14.6327 9.66504 14.335 9.36727 14.335 9Z" />
    </svg>
  );
};

/* -------------------------------- util text streaming (unchanged) ------------------------------- */
function StreamWord({ children, index, delay }) {
  const [isComplete, setIsComplete] = useState(false);
  return isComplete ? (
    <>{children}</>
  ) : (
    <motion.span
      key={index}
      initial={{ opacity: 0, color: "rgba(0,168,255,1)" }}
      animate={{ opacity: 1, color: "rgba(255,255,255,1)" }}
      transition={{
        type: "spring",
        bounce: 0,
        delay: index * 0.015 + 0.14 + (delay || 0),
        duration: 1,
      }}
      onAnimationComplete={() => setIsComplete(true)}
    >
      {children}
    </motion.span>
  );
}

function StreamText({ children, delay }) {
  const words = children.split(" ");
  return (
    <>
      {words.map((word, index) => (
        <StreamWord index={index} delay={delay} key={index}>
          {word}{" "}
        </StreamWord>
      ))}
    </>
  );
}

/* -------------------------------- background stars ------------------------------- */
function SceneBackground() {
  const { scene } = useThree();
  const texture = useLoader(
    THREE.TextureLoader,
    "https://persistent.oaistatic.com/ecosys/stars_8k.webp"
  );
  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
  }, [texture, scene]);
  return null;
}

/* -------------------------------- post‑processing ------------------------------- */
function Effects({ focusTarget, hasFocus }) {
  const { camera } = useThree();
  const depthOfFieldRef = useRef();

  useFrame(() => {
    if (!depthOfFieldRef.current) return;

    if (!hasFocus) {
      depthOfFieldRef.current.bokehScale = 0; // no planet in focus → no blur
      return;
    }

    const d = camera.position.distanceTo(focusTarget); // closer ⇒ stronger blur
    const scale = THREE.MathUtils.clamp(12 - d * 0.75, 0, 12);
    depthOfFieldRef.current.bokehScale = scale;
  });

  return (
    <EffectComposer>
      <DepthOfField
        ref={depthOfFieldRef}
        focusDistance={0}
        focalLength={0.02}
        height={480}
        bokehScale={0} // initial value; updated each frame
        target={focusTarget}
      />
      <Bloom
        luminanceThreshold={0}
        luminanceSmoothing={0.25}
        intensity={1.75}
        mipmapBlur
      />
    </EffectComposer>
  );
}

const planets = [
  {
    name: "Mercury",
    radius: 2,
    size: 0.2,
    speed: 0.02,
    physicalSize: 4879,
    description:
      "Mercury is the smallest planet in the Solar System and the closest to the Sun. It has a rocky, cratered surface and extreme temperature swings.",
  },
  {
    name: "Venus",
    radius: 3,
    size: 0.35,
    speed: 0.015,
    physicalSize: 12104,
    description:
      "Venus, similar in size to Earth, is cloaked in thick clouds of sulfuric acid with surface temperatures hot enough to melt lead.",
  },
  {
    name: "Earth",
    radius: 4,
    size: 0.38,
    speed: 0.012,
    physicalSize: 12742,
    description:
      "Earth is the only known planet to support life, with liquid water covering 71% of its surface and a protective atmosphere.",
  },
  {
    name: "Mars",
    radius: 5,
    size: 0.25,
    speed: 0.01,
    physicalSize: 6779,
    description:
      "Mars, the Red Planet, shows evidence of ancient rivers and volcanoes and is a prime target in the search for past life.",
  },
  {
    name: "Jupiter",
    radius: 7,
    size: 0.85,
    speed: 0.008,
    physicalSize: 139820,
    description:
      "Jupiter is the largest planet, a gas giant with a Great Red Spot—an enormous storm raging for centuries.",
  },
  {
    name: "Saturn",
    radius: 9,
    size: 0.75,
    speed: 0.006,
    physicalSize: 116460,
    description:
      "Saturn is famous for its stunning ring system composed of billions of ice and rock particles orbiting the planet.",
  },
  {
    name: "Uranus",
    radius: 11,
    size: 0.65,
    speed: 0.0045,
    physicalSize: 50724,
    description:
      "Uranus is an ice giant rotating on its side, giving rise to extreme seasonal variations during its long orbit.",
  },
  {
    name: "Neptune",
    radius: 13,
    size: 0.65,
    speed: 0.0035,
    physicalSize: 49244,
    description:
      "Neptune, the farthest known giant, is a deep‑blue world with supersonic winds and a faint ring system.",
  },
];

/* -------------------------------- main solar‑system component ------------------------------- */
function SolarSystem() {
  const [isOrbiting, setIsOrbiting] = useState(true);
  const [targetPlanetPosition, setTargetPlanetPosition] = useState(null);
  const { planet_name } = useWidgetProps({});

  const navigate = useNavigate();
  const { planet: planetParam } = useParams();

  const currentPlanet =
    planets.find((planet) => planet.name === planetParam) ??
    planets.find((planet) => planet.name === planet_name);

  const [focusTarget, setFocusTarget] = useState(new THREE.Vector3(0, 0, 0));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.oai &&
      typeof window.oai.widget.setState === "function"
    ) {
      window.oai.widget.setState({
        isOrbiting,
        currentPlanet: currentPlanet ? currentPlanet.name : null,
      });
    }
  }, [isOrbiting, currentPlanet]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const ref = planetRefs.current[currentPlanet?.name];
      if (currentPlanet && ref) {
        const position = ref.getPosition();
        setIsOrbiting(false);
        setTargetPlanetPosition(position);
        setFocusTarget(position);
      } else {
        setIsOrbiting(true);
        setTargetPlanetPosition("initial");
        setFocusTarget(new THREE.Vector3(0, 0, 0));
      }
    });
  }, [currentPlanet, isReady]);

  const orbitControlsRef = useRef();
  const initialCameraPosition = useRef(new THREE.Vector3(0, 0, 10));
  const initialOrbitTarget = useRef(new THREE.Vector3(0, 0, 0));
  const planetRefs = useRef({});

  const updatePlanet = (planet) => {
    if (planet?.name) {
      navigate(`/${planet.name}`, { replace: false });
    } else {
      navigate(`/`, { replace: false });
    }
  };

  const handlePointerMissed = () => {
    setIsOrbiting(true);
    setTargetPlanetPosition("initial");
    setFocusTarget(new THREE.Vector3(0, 0, 0));
    updatePlanet(null);
  };

  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  return (
    <div
      className={`antialiased w-full relative bg-black overflow-hidden ${
        displayMode !== "fullscreen"
          ? "aspect-[640/480] sm:aspect-[640/400]"
          : ""
      }`}
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
      }}
    >
      {displayMode !== "fullscreen" && (
        <div className="fixed end-3 z-20 top-3 aspect-square rounded-full p-2 bg-white/20 text-white backdrop-blur-lg">
          <button
            onClick={() => {
              window.webplus.requestDisplayMode({ mode: "fullscreen" });
            }}
          >
            <ExpandIcon />
          </button>
        </div>
      )}
      <div className="relative w-full h-full z-10">
        <Canvas
          camera={{ position: [0, 2, 8], fov: 60 }}
          onCreated={({ camera }) => {
            initialCameraPosition.current.copy(camera.position);
            if (orbitControlsRef.current) {
              initialOrbitTarget.current.copy(orbitControlsRef.current.target);
            }
            setIsReady(true);
          }}
          onPointerMissed={handlePointerMissed}
        >
          <SceneBackground />
          <ambientLight intensity={0.135} />
          <pointLight position={[0, 0, 0]} intensity={18} />
          <directionalLight position={[0, 0, 0]} intensity={0.7} castShadow />
          <OrbitControls ref={orbitControlsRef} />
          <Sun />

          {/* ---------- render planets ---------- */}
          {planets.map((planet) => (
            <Planet
              key={planet.name}
              ref={(ref) => {
                planetRefs.current[planet.name] = ref;
              }}
              {...planet}
              isOrbiting={isOrbiting}
              onPlanetClick={() => {
                setIsOrbiting(false);
                updatePlanet(planet);
              }}
            />
          ))}

          <Effects
            focusTarget={focusTarget}
            hasFocus={currentPlanet !== null}
          />
          <CameraController
            targetPosition={targetPlanetPosition}
            orbitControlsRef={orbitControlsRef}
            setIsOrbiting={setIsOrbiting}
            initialCameraPosition={initialCameraPosition}
            initialOrbitTarget={initialOrbitTarget}
            setFocusTarget={setFocusTarget}
          />
        </Canvas>
      </div>

      {/* ---------- planet info panel ---------- */}
      <AnimatePresence>
        {currentPlanet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ bounce: 0.2, duration: 0.4, type: "spring" }}
            className="
    absolute inset-0
    flex flex-col justify-end items-center text-center
    pb-4 px-8 sm:p-8
    bg-gradient-to-t from-black/80 to-black/0
    md:bg-gradient-to-r md:from-black md:to-black/0
    md:items-start md:text-left md:justify-start
    md:w-72
    rounded-xl text-white pointer-events-none z-10
  "
          >
            <div className="text-4xl font-medium">
              <StreamText>{currentPlanet.name}</StreamText>
            </div>
            <div className="text-sm my-2 font-medium">
              <StreamWord delay={0.1}>
                {Intl.NumberFormat("en-US", {
                  style: "unit",
                  unit: "kilometer",
                  unitDisplay: "narrow",
                }).format(currentPlanet.physicalSize)}
              </StreamWord>
            </div>
            <div className="text-sm my-2">
              <StreamText delay={0.125}>{currentPlanet.description}</StreamText>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------- sun sphere ------------------------------- */
function Sun() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#F6D973" />
    </mesh>
  );
}

/* -------------------------------- saturn ring component ------------------------------- */
function SaturnRing({ planetSize }) {
  const texture = useLoader(
    THREE.TextureLoader,
    "https://persistent.oaistatic.com/ecosys/saturn_ring.webp"
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[planetSize * 1.1, planetSize * 2, 64]} />
      <meshStandardMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

/* -------------------------------- planet component ------------------------------- */
function Planet({ name, radius, size, speed, isOrbiting, onPlanetClick, ref }) {
  const SPEED_SCALE = 0.2;
  const mesh = useRef();
  const theta = useRef(Math.random() * Math.PI * 2);

  useImperativeHandle(ref, () => ({
    getPosition: () => mesh.current.position.clone(),
  }));

  /* texture per planet */
  const texture = useLoader(
    THREE.TextureLoader,
    `https://persistent.oaistatic.com/ecosys/${name.toLowerCase()}_2k.webp`
  );

  useFrame(() => {
    if (isOrbiting) {
      theta.current += speed * SPEED_SCALE;
      const x = radius * Math.cos(theta.current);
      const z = radius * Math.sin(theta.current);
      mesh.current.position.set(x, 0, z);
    }
  });

  return (
    <mesh
      ref={mesh}
      onClick={(e) => {
        e.stopPropagation(); // ← block onPointerMissed
        onPlanetClick(mesh.current.position.clone());
      }}
    >
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial map={texture} />
      {name === "Saturn" && <SaturnRing planetSize={size} />}
    </mesh>
  );
}

/* -------------------------------- camera tween controller ------------------------------- */
/* -------- camera tween controller -------- */
/* -------- camera tween controller (lerp version) -------- */
function CameraController({
  targetPosition,
  orbitControlsRef,
  setIsOrbiting,
  initialCameraPosition,
  initialOrbitTarget,
  setFocusTarget,
}) {
  const { camera } = useThree();

  // Where the camera/target should ultimately go
  const targetCamPos = useRef(null);
  const targetCamFocus = useRef(null);

  // Whenever SolarSystem tells us to move …
  useEffect(() => {
    if (!targetPosition) return;

    // “Initial” = zoom‑out reset
    if (targetPosition === "initial") {
      targetCamPos.current = initialCameraPosition.current.clone();
      targetCamFocus.current = initialOrbitTarget.current.clone();
      setIsOrbiting(true);
      setFocusTarget(new THREE.Vector3(0, 0, 0));
    } else {
      // Offset the camera so it’s not inside the planet
      const offset = new THREE.Vector3()
        .subVectors(camera.position, targetPosition)
        .normalize()
        .multiplyScalar(2); // distance from surface – tweak to taste
      targetCamPos.current = targetPosition.clone().add(offset);
      targetCamFocus.current = targetPosition.clone();
      setIsOrbiting(false);
      setFocusTarget(targetCamFocus.current.clone());
    }

    // Disable user interaction while we animate
    if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
  }, [targetPosition]);

  useFrame(() => {
    if (!targetCamPos.current || !targetCamFocus.current) return;

    const lerpSpeed = 0.04; // smoother → smaller, snappier → larger
    camera.position.lerp(targetCamPos.current, lerpSpeed);
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.lerp(targetCamFocus.current, lerpSpeed);
      orbitControlsRef.current.update();
    }

    // Stop when we’re basically there
    if (
      camera.position.distanceTo(targetCamPos.current) < 0.05 &&
      orbitControlsRef.current.target.distanceTo(targetCamFocus.current) < 0.05
    ) {
      targetCamPos.current = null;
      targetCamFocus.current = null;
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = true; // re‑enable control
        orbitControlsRef.current.update(); // sync internals
      }
    }
  });

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:planet?" element={<SolarSystem />} />
      </Routes>
    </BrowserRouter>
  );
}
