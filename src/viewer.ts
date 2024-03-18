import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  AnimationClip,
  Box3,
  Color,
  LoadingManager,
  Object3D,
  Object3DEventMap,
  PerspectiveCamera,
  PMREMGenerator,
  REVISION,
  Vector3,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

import { ViewerImpl, ViewerOptions } from "./viewer.type.ts";

const MANAGER = new LoadingManager();
const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;

const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(
  `${THREE_PATH}/examples/jsm/libs/draco/gltf/`,
);
const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(
  `${THREE_PATH}/examples/jsm/libs/basis/`,
);

export class Viewer implements ViewerImpl {
  object: Object3D | undefined;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  ambientLight: THREE.AmbientLight;
  mixer?: THREE.AnimationMixer;
  action?: THREE.AnimationAction;
  orbitControls: OrbitControls;
  clock: THREE.Clock;
  el: HTMLElement;
  pmremGenerator: PMREMGenerator;
  basicEnvironment: any;
  backgroundColor: Color;
  state: ViewerOptions;

  constructor(element: HTMLElement, options?: ViewerOptions) {
    this.el = element;

    if (!options) {
      this.state = {
        background: false,
        autoRotate: false,
        ambientIntensity: 0.3,
        ambientColor: "#FFFFFF",
        directIntensity: 0.8 * Math.PI,
        directColor: "#FFFFFF",
        bgColor: "#191919",
      };
    } else {
      this.state = options;
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    }); // 렌더러를 생성한다.

    this.renderer.setPixelRatio(window.devicePixelRatio); // 렌더러의 픽셀 비율을 설정
    this.renderer.setSize(element.clientWidth, element.clientHeight, false); // 렌더러의 사이즈를 설정

    this.pmremGenerator = new PMREMGenerator(this.renderer); // PMREMGenerator를 생성한다.
    this.pmremGenerator.compileEquirectangularShader(); // PMREMGenerator의 쉐이더를 컴파일한다.

    this.basicEnvironment = this.pmremGenerator.fromScene(
      // PMREMGenerator를 이용하여 환경을 생성한다.
      new RoomEnvironment(),
    ).texture;

    this.el.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();

    this.scene.environment = this.basicEnvironment;

    const fov = 60; // 시야각 설정
    const aspect = this.el.clientWidth / this.el.clientHeight; // 종횡비 설정
    this.camera = new PerspectiveCamera(fov, aspect, 0.01, 1000); // 카메라 생성

    this.ambientLight = new THREE.AmbientLight(
      this.state.ambientColor,
      this.state.ambientIntensity,
    ); // 주변광 설정
    this.scene.add(this.ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      this.state.directColor,
      this.state.directIntensity,
    ); // 태양광 설정
    const directionalLight2 = new THREE.DirectionalLight(
      this.state.directColor,
      this.state.directIntensity,
    ); // 태양광 설정

    const directionalLight3 = new THREE.DirectionalLight(
      this.state.directColor,
      this.state.directIntensity,
    ); // 태양광 설정

    const radius = 100; // radius of the circle
    const centerX = 0; // x-coordinate of the circle's center
    const centerY = 46; // y-coordinate of the circle's center
    const centerZ = 0; // z-coordinate of the circle's center

    // Positions for the lights
    const positions = [
      { angle: 0, light: directionalLight },
      { angle: 120, light: directionalLight2 },
      { angle: 240, light: directionalLight3 },
    ];

    positions.forEach((pos) => {
      const radian = (Math.PI / 180) * pos.angle; // convert degree to radian
      const x = centerX + radius * Math.cos(radian);
      const z = centerZ + radius * Math.sin(radian);
      pos.light.position.set(x, centerY, z);
      this.scene.add(pos.light);
    });

    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    ); // 카메라와 렌더러를 넣어준다.
    this.orbitControls.enableDamping = true; // 감속 설정
    this.orbitControls.dampingFactor = 0.03; // 감속 계수

    this.backgroundColor = new Color(this.state.bgColor);
    this.scene.background = this.backgroundColor;

    window.addEventListener("resize", this.resize.bind(this), false); // 리사이즈 이벤트를 등록한다.

    this.clock = new THREE.Clock();
    this.render = this.render.bind(this);
    this.render();
  }

  loadModel = (
    object: Object3D<Object3DEventMap>,
    clips: AnimationClip[],
    isFbx?: boolean,
  ) => {
    this.object = object;

    this.object.updateMatrixWorld(); // 오브젝트의 월드 매트릭스를 업데이트 해준다.
    const box = new Box3().setFromObject(this.object); // 오브젝트의 박스를 구한다.
    const size = box.getSize(new Vector3()).length(); // 오브젝트의 크기를 구한다.
    const center = box.getCenter(new Vector3()); // 오브젝트의 중심을 구한다.

    this.object.position.x += this.object.position.x - center.x; // 오브젝트의 위치를 중심으로 이동시킨다.
    this.object.position.y += this.object.position.y - center.y; // 오브젝트의 위치를 중심으로 이동시킨다.
    this.object.position.z += this.object.position.z - center.z; // 오브젝트의 위치를 중심으로 이동시킨다.

    this.orbitControls.maxDistance = size * 10; // 오브젝트의 크기에 따라 카메라의 최대 거리를 설정한다.
    this.camera.near = size / 100; // 카메라의 near 설정
    this.camera.far = size * 100; // 카메라의 far 설정
    this.camera.updateProjectionMatrix(); // 카메라의 투영 매트릭스를 업데이트 해준다.

    this.camera.position.copy(center); // 카메라의 위치를 오브젝트의 중심으로 설정
    this.camera.position.x = size / 2.0;
    this.camera.position.y = size / 5.0;
    this.camera.position.z = size;
    this.camera.lookAt(center); // 카메라가 바라보는 방향을 설정해준다.

    if (isFbx && this.state.setBaseColor) {
      this.object.traverse((node: any) => {
        if (node.isMesh) {
          node.material.map = null;
          node.material.color.set(this.state.BaseColor || "0x696969");
          node.material.shininess = 100;
          node.needsUpdate = true; // Update the material
        }
      });
    }

    if (clips.length === 0) {
      this.scene.add(this.object);
      return;
    }

    const animationsClips = clips;

    this.scene.add(this.object);

    this.mixer = new THREE.AnimationMixer(object);

    this.action = this.mixer.clipAction(animationsClips[0]); // 애니메이션 클립을 설정
    this.action.setLoop(THREE.LoopRepeat, 2); // 애니메이션의 반복 설정
    this.action.play(); // 애니메이션을 실행
  };

  resize = () => {
    this.camera.aspect = this.el.clientWidth / this.el.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.el.clientWidth, this.el.clientHeight);
  };

  async load(file: string) {
    const fileExtension = file.split(".").pop();

    if (!fileExtension) return;

    if (fileExtension === "glb") {
      const glfLoader = new GLTFLoader()
        .setCrossOrigin("anonymous")
        .setDRACOLoader(DRACO_LOADER)
        .setKTX2Loader(KTX2_LOADER.detectSupport(this.renderer))
        .setMeshoptDecoder(MeshoptDecoder);

      const gltf = await glfLoader.loadAsync(file);
      this.loadModel(gltf.scene, gltf.animations);
    }
    if (fileExtension === "fbx") {
      const fbxLoader = new FBXLoader();

      const fbx = await fbxLoader.loadAsync(file);
      this.loadModel(fbx, fbx.animations, true);
    }
  }

  async mappingEnvironment(enviroment: any) {
    const envMap = await new EXRLoader().loadAsync(enviroment);

    this.pmremGenerator.fromEquirectangular(envMap).texture;
    this.pmremGenerator.dispose();

    this.scene.environment = envMap;
    this.scene.background = this.state.background
      ? envMap
      : this.backgroundColor;
  }

  render = () => {
    requestAnimationFrame(this.render); // 내부에서 자신을 호출하여 애니메이션을 수행한다.

    if (this.state.autoRotate) {
      this.object?.rotateY(0.005);
    }
    this.renderer.render(this.scene, this.camera); // 렌더링을 수행한다.
    this.orbitControls.update(); // 컨트롤을 업데이트 해준다.
    if (this.mixer) {
      this.mixer.update(
        this.clock.getDelta(),
      ); /* 믹서를 업데이트 해준다. 믹서는 애니메이션을 업데이트 해주는 역할을 한다. */
    }
  };

  mappingTexture = (path: any, name: string) => {
    if (!path || !name || !this.object) return;
    const texture = new THREE.TextureLoader().load(path);
    texture.colorSpace = THREE.SRGBColorSpace; // 텍스쳐의 색상 공간을 설정

    this.object.traverse((node: any) => {
      if (node.isMesh) {
        const material = node.material;
        material[name] = texture;

        material.needsUpdate = true;
      }
    });
  };
}
