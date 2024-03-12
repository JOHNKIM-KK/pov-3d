import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  AnimationClip,
  Box3,
  Object3D,
  PerspectiveCamera,
  Vector3,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

declare global {
  interface Window {
    VIEWER: {
      Viewer: typeof Viewer | null;
    };
  }
}

window.VIEWER = {
  Viewer: null,
};

export class Viewer {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  floorGeometry: THREE.PlaneGeometry;
  floorMaterial: THREE.MeshStandardMaterial;
  floor: THREE.Mesh;
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
  options: any;
  content: any;

  constructor(element: HTMLElement) {
    this.el = element;
    this.renderer = new THREE.WebGLRenderer({ antialias: true }); // 렌더러를 생성한다.
    this.renderer.shadowMap.enabled = true; // 그림자를 사용하도록 설정
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 그림자의 형태를 설정
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.el.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();

    const fov = 60; // 시야각 설정
    const aspect = this.el.clientWidth / this.el.clientHeight; // 종횡비 설정
    this.camera = new PerspectiveCamera(fov, aspect, 0.01, 1000); // 카메라 생성

    this.floorGeometry = new THREE.PlaneGeometry(
      this.el.clientWidth,
      this.el.clientHeight,
      20,
      20,
    );
    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xbbbbbb,
    }); // 바닥의 색상
    this.floor = new THREE.Mesh(this.floorGeometry, this.floorMaterial);
    this.floor.position.y = -40; // 바닥의 위치 설정
    this.floor.rotation.x = -Math.PI / 2; // 바닥을 x축으로 90도 회전 ( 회전값은 라디안 값을 쓰게되는데 라디안은 PI가 180도 이므로 90도는 PI/2 이다. 180도는 PI 이다. 360도는 2PI 이다.  )
    this.floor.receiveShadow = true; // 바닥이 그림자를 받을 수 있도록 설정
    this.floor.castShadow = true; // 바닥이 그림자를 드리워 지도록 설정
    this.scene.add(this.floor);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 5); // 태양광 설정
    this.directionalLight.castShadow = true; // 태양광이 그림자를 드리워 지도록 설정
    this.directionalLight.position.set(3, 4, 5); // 태양광의 위치 설정
    this.directionalLight.lookAt(0, 0, 0); // 태양광이 바라보는 방향 설정
    this.directionalLight.shadow.mapSize.width = 4096; // 그림자의 해상도 설정
    this.directionalLight.shadow.mapSize.height = 4096; // 그림자의 해상도 설정
    this.directionalLight.shadow.camera.top = 2; // 그림자의 카메라의 near 설정
    this.directionalLight.shadow.camera.bottom = -2; // 그림자의 카메라의 near 설정
    this.directionalLight.shadow.camera.left = -2; // 그림자의 카메라의 near 설정
    this.directionalLight.shadow.camera.right = 2; // 그림자의 카메라의 near 설정
    this.directionalLight.shadow.camera.near = 0.1; // 그림자의 카메라의 near 설정
    this.directionalLight.shadow.camera.far = 100; // 그림자의 카메라의 near 설정
    this.scene.add(this.directionalLight);

    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    ); // 카메라와 렌더러를 넣어준다.
    this.orbitControls.enableDamping = true; // 감속 설정
    this.orbitControls.dampingFactor = 0.03; // 감속 계수

    window.addEventListener("resize", this.resize.bind(this), false);

    this.clock = new THREE.Clock();
    this.render = this.render.bind(this);
    this.render();
  }

  LoadModel = (object: Object3D, clips: AnimationClip[]) => {
    // this.clear();

    object.updateMatrixWorld(); // 오브젝트의 월드 매트릭스를 업데이트 해준다.
    const box = new Box3().setFromObject(object); // 오브젝트의 크기를 구한다.
    const size = box.getSize(new Vector3()).length(); // 오브젝트의 크기를 구한다.
    const center = box.getCenter(new Vector3()); // 오브젝트의 중심을 구한다.

    object.position.x += object.position.x - center.x; // 오브젝트의 위치를 중심으로 이동시킨다.
    object.position.y += object.position.y - center.y; // 오브젝트의 위치를 중심으로 이동시킨다.
    object.position.z += object.position.z - center.z; // 오브젝트의 위치를 중심으로 이동시킨다.
    this.orbitControls.maxDistance = size * 10; // 오브젝트의 크기에 따라 카메라의 최대 거리를 설정한다.

    this.camera.near = size / 100; // 카메라의 near 설정
    this.camera.far = size * 100; // 카메라의 far 설정
    this.camera.updateProjectionMatrix(); // 카메라의 투영 매트릭스를 업데이트 해준다.

    this.camera.position.copy(center); // 카메라의 위치를 오브젝트의 중심으로 설정
    this.camera.position.x += size / 2.0; //  카메라의 위치를 오브젝트의 중심으로 설정
    this.camera.position.y += size / 5.0; // 카메라의 위치를 오브젝트의 중심으로 설정
    this.camera.position.z += size / 2.0; // 카메라의 위치를 오브젝트의 중심으로 설정
    this.camera.lookAt(center); // 카메라가 바라보는 방향을 설정해준다.

    if (clips.length === 0) {
      this.scene.add(object);
      return;
    }

    this.animationsClips = clips;

    object.position.y = 0.8;
    object.scale.set(0.3, 0.3, 0.3);

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
      this.glfLoader = new GLTFLoader();
      this.gltf = await this.glfLoader.loadAsync(file);
      this.LoadModel(this.gltf.scene, this.gltf.animations);
    }
    if (fileExtension === "fbx") {
      this.fbxLoader = new FBXLoader();
      this.fbx = await this.fbxLoader.loadAsync(file);
      this.LoadModel(this.fbx, this.fbx.animations);
    }
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
}
