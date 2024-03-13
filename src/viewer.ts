import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  AnimationClip,
  Box3,
  Color,
  LoadingManager,
  Object3D,
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

const MANAGER = new LoadingManager();
const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;

const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(
  `${THREE_PATH}/examples/jsm/libs/draco/gltf/`,
);
const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(
  `${THREE_PATH}/examples/jsm/libs/basis/`,
);

export interface ViewerConfig {
  el: HTMLElement;
  options: any;
  content: any;
}

export class Viewer {
  object: Object3D;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
  glfLoader?: GLTFLoader;
  fbxLoader?: FBXLoader;
  gltf: any;
  fbx: any;
  animationsClips: any;
  mixer?: THREE.AnimationMixer;
  action?: THREE.AnimationAction;
  orbitControls: OrbitControls;
  clock: THREE.Clock;
  el: HTMLElement;
  pmremGenerator: PMREMGenerator;
  basicEnvironment: any;
  backgroundColor: Color;
  state: {
    background: boolean;
    playbackSpeed: number;
    actionStates: {};
    wireframe: boolean;
    skeleton: boolean;
    grid: boolean;
    autoRotate: boolean;
    ambientIntensity: number;
    ambientColor: string;
    directIntensity: number;
    directColor: string;
    bgColor: string;
  };

  options: any;
  content: any;

  constructor(element: HTMLElement) {
    this.el = element;

    this.state = {
      background: false,
      playbackSpeed: 1.0,
      actionStates: {},
      wireframe: false,
      skeleton: false,
      grid: false,
      autoRotate: false,

      // Lights
      ambientIntensity: 0.3,
      ambientColor: "#FFFFFF",
      directIntensity: 0.8 * Math.PI,
      directColor: "#FFFFFF",
      bgColor: "#191919",
    };

    this.renderer = new THREE.WebGLRenderer({ antialias: true }); // 렌더러를 생성한다.
    this.renderer.setPixelRatio(window.devicePixelRatio); // 렌더러의 픽셀 비율을 설정
    this.renderer.setSize(window.innerWidth, window.innerHeight); // 렌더러의 사이즈를 설정

    this.pmremGenerator = new PMREMGenerator(this.renderer); // PMREMGenerator를 생성한다.
    this.pmremGenerator.compileEquirectangularShader(); // PMREMGenerator의 쉐이더를 컴파일한다.

    this.basicEnvironment = this.pmremGenerator.fromScene(
      // PMREMGenerator를 이용하여 환경을 생성한다.
      new RoomEnvironment(),
    ).texture;

    this.el.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();

    const fov = 60; // 시야각 설정
    const aspect = this.el.clientWidth / this.el.clientHeight; // 종횡비 설정
    this.camera = new PerspectiveCamera(fov, aspect, 0.01, 1000); // 카메라 생성

    this.ambientLight = new THREE.AmbientLight(
      this.state.ambientColor,
      this.state.ambientIntensity,
    ); // 주변광 설정
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(
      this.state.directColor,
      this.state.directIntensity,
    ); // 태양광 설정
    this.scene.add(this.directionalLight);

    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    ); // 카메라와 렌더러를 넣어준다.
    this.orbitControls.enableDamping = true; // 감속 설정
    this.orbitControls.dampingFactor = 0.03; // 감속 계수

    this.backgroundColor = new Color(this.state.bgColor);

    window.addEventListener("resize", this.resize.bind(this), false); // 리사이즈 이벤트를 등록한다.

    this.updateEnvironment();
    this.clock = new THREE.Clock();
    this.render = this.render.bind(this);
    this.render();
  }

  LoadModel = (object: Object3D, clips: AnimationClip[]) => {
    // this.clear();

    this.object = object;
    console.log(this.object);

    object.updateMatrixWorld(); // 오브젝트의 월드 매트릭스를 업데이트 해준다.
    const box = new Box3().setFromObject(object); // 오브젝트의 박스를 구한다.
    const size = box.getSize(new Vector3()); // 오브젝트의 크기를 구한다.
    const center = box.getCenter(new Vector3()); // 오브젝트의 중심을 구한다.

    object.position.x += object.position.x - center.x; // 오브젝트의 위치를 중심으로 이동시킨다.
    object.position.y += object.position.y - center.y; // 오브젝트의 위치를 중심으로 이동시킨다.
    object.position.z += object.position.z - center.z; // 오브젝트의 위치를 중심으로 이동시킨다.
    this.orbitControls.maxDistance = size.length() * 12; // 오브젝트의 크기에 따라 카메라의 최대 거리를 설정한다.

    this.camera.near = size.length() / 100; // 카메라의 near 설정
    this.camera.far = size.length() * 100; // 카메라의 far 설정
    this.camera.updateProjectionMatrix(); // 카메라의 투영 매트릭스를 업데이트 해준다.

    this.camera.position.copy(center); // 카메라의 위치를 오브젝트의 중심으로 설정
    this.camera.position.x += size.length() / 2.0;
    this.camera.position.y += size.length() / 5.0;
    this.camera.position.z += size.length() / 2.0;
    this.camera.lookAt(center); // 카메라가 바라보는 방향을 설정해준다.

    if (clips.length === 0) {
      this.scene.add(object);
      return;
    }

    this.animationsClips = clips;

    this.scene.add(object);

    this.mixer = new THREE.AnimationMixer(object);

    this.action = this.mixer.clipAction(this.animationsClips[0]); // 애니메이션 클립을 설정
    this.action.setLoop(THREE.LoopRepeat, 2); // 애니메이션의 반복 설정
    this.action.play(); // 애니메이션을 실행
  };

  resize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  async load(file: string) {
    const fileExtension = file.split(".").pop();

    if (!fileExtension) return;

    if (fileExtension === "glb") {
      this.glfLoader = new GLTFLoader()
        .setCrossOrigin("anonymous")
        .setDRACOLoader(DRACO_LOADER)
        .setKTX2Loader(KTX2_LOADER.detectSupport(this.renderer))
        .setMeshoptDecoder(MeshoptDecoder);

      this.gltf = await this.glfLoader.loadAsync(file);

      this.LoadModel(this.gltf.scene, this.gltf.animations);
    }
    if (fileExtension === "fbx") {
      this.fbxLoader = new FBXLoader();
      this.fbx = await this.fbxLoader.loadAsync(file);
      this.LoadModel(this.fbx, this.fbx.animations);
    }
  }

  updateEnvironment() {
    this.scene.environment = this.basicEnvironment;
    this.scene.background = this.state.background
      ? this.basicEnvironment
      : this.backgroundColor;
  }

  render = () => {
    requestAnimationFrame(this.render); // 내부에서 자신을 호출하여 애니메이션을 수행한다.

    this.renderer.render(this.scene, this.camera); // 렌더링을 수행한다.
    this.orbitControls.update(); // 컨트롤을 업데이트 해준다.
    if (this.mixer) {
      this.mixer.update(
        this.clock.getDelta(),
      ); /* 믹서를 업데이트 해준다. 믹서는 애니메이션을 업데이트 해주는 역할을 한다. */
    }
  };

  mappingTexture = (path: any, name: string) => {
    if (!path || !name) return;
    const texture = new THREE.TextureLoader().load(path);
    
    this.object.traverse((node: any) => {
      if (node.isMesh) {
        const material = node.material;
        material[name] = texture;
      }
    });
    
  }
}
