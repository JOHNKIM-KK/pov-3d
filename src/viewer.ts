import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class Viewer extends HTMLElement {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  floorGeometry: THREE.PlaneGeometry;
  floorMaterial: THREE.MeshStandardMaterial;
  floor: THREE.Mesh;
  directionalLight: THREE.DirectionalLight;
  glfLoader: GLTFLoader;
  gltf: any;
  character: any;
  animationsClips: any;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  orbitControls: OrbitControls;
  clock: THREE.Clock;

  constructor() {
    super();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true; // 그림자를 사용하도록 설정
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 그림자의 형태를 설정
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );

    this.camera.position.y = 5;
    this.camera.position.z = 5;
    this.camera.position.x = 5;

    this.floorGeometry = new THREE.PlaneGeometry(20, 20, 20, 20);
    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xbbbbbb,
    }); // 바닥의 색상
    this.floor = new THREE.Mesh(this.floorGeometry, this.floorMaterial);
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

    this.glfLoader = new GLTFLoader();
    this.gltf = async () => {
      return await this.glfLoader.loadAsync("dancer.glb");
    };
    this.character = this.gltf.scene;
    this.animationsClips = this.gltf.animations;
    this.character.position.y = 0.8;
    this.character.scale.set(0.01, 0.01, 0.01);
    this.character.castShadow = true; // 캐릭터가 그림자를 드리워 지도록 설정
    this.character.receiveShadow = true; // 캐릭터가 그림자를 받을 수 있도록 설정
    this.character.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.scene.add(this.character);

    this.mixer = new THREE.AnimationMixer(this.character);
    this.action = this.mixer.clipAction(this.animationsClips[3]); // 애니메이션 클립을 설정
    this.action.setLoop(THREE.LoopRepeat, 2); // 애니메이션의 반복 설정
    this.action.play(); // 애니메이션을 실행

    setTimeout(() => {
      this.mixer.clipAction(this.animationsClips[3]).paused = true; // 3초 후에 애니메이션을 멈춘다.
    }, 3000);

    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    ); // 카메라와 렌더러를 넣어준다.
    this.orbitControls.enableDamping = true; // 감속 설정
    this.orbitControls.dampingFactor = 0.03; // 감속 계수

    window.addEventListener("resize", () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    });

    this.clock = new THREE.Clock();
    this.render = this.render.bind(this);
    this.render();
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
customElements.define("pov-3d", Viewer);
