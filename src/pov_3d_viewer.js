import * as THREE from "three";
import {
  Box3,
  Color,
  LoadingManager,
  PerspectiveCamera,
  PMREMGenerator,
  REVISION,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import ViewerOption from "./option/viewerOption";

const MANAGER = new LoadingManager();
const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;

const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(
  `${THREE_PATH}/examples/jsm/libs/draco/gltf/`,
);
const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(
  `${THREE_PATH}/examples/jsm/libs/basis/`,
);

class Pov_3d_viewer extends HTMLElement {
  constructor() {
    super();

    this.updateAttribute();

    if (this.isConnected) {
      this.viewerWidth = this.getBoundingClientRect().width;
      this.viewerHeight = this.getBoundingClientRect().height;
    } else {
      this.viewerWidth = 500;
      this.viewerHeight = 500;
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.viewerWidth, this.viewerHeight, false);

    this.pmremGenerator = new PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    this.basicEnvironment = this.pmremGenerator.fromScene(
      new RoomEnvironment(),
    ).texture;

    this.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();

    this.scene.environment = this.basicEnvironment;

    const fov = 60;
    const aspect = this.viewerWidth / this.viewerHeight;
    this.camera = new PerspectiveCamera(fov, aspect, 0.01, 1000);

    this.directionalLight = null;
    this.directionalLight2 = null;
    this.directionalLight3 = null;

    this.lightSetup();

    this.controlSetup();

    this.backgroundSetup();

    window.addEventListener("resize", this.resize.bind(this), false);

    this.clock = new THREE.Clock();
    this.render = this.render.bind(this);
    this.render();

    this.dispatchEvent(new Event("onload"));
    this.updateAttribute(true);

    if (this.model) {
      this.load(this.model)
        .then(() => {
          console.log("Model loaded successfully");

          if (this.baseColor) {
            this.viewerOption.attribute.baseColor = this.baseColor;
            this.baseColorSetup();
          }
        })
        .catch((error) => console.error("Error while loading model", error));
    }
  }

  updateAttribute = (isInitial) => {
    this.model = this.getAttribute("model");

    this.preset = this.getAttribute("preset");

    this.baseColor = this.getAttribute("base_color");

    if (!isInitial) {
      this.iniAttributeState = {
        model: !!this.model,
        preset: !!this.preset,
        baseColor: !!this.baseColor,
      };
    }

    this.viewerOption = new ViewerOption();

    if (this.preset) {
      this.viewerOption.attribute = ViewerOption[this.preset]();
    }
  };

  static get observedAttributes() {
    return ["model", "preset", "base_color"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (this.iniAttributeState.model) {
      this.iniAttributeState.model = false;
      return;
    }
    if (this.iniAttributeState.preset) {
      this.iniAttributeState.preset = false;
      return;
    }
    if (this.iniAttributeState.baseColor) {
      this.iniAttributeState.baseColor = false;
      return;
    }

    if (name === "preset") {
      this.updateOption(ViewerOption[newValue]() || ViewerOption.Initial);
    }

    if (name === "model") {
      this.load(newValue)
        .then(() => {
          console.log("Model loaded successfully");
        })
        .catch((error) => console.error("Error while loading model", error));
    }
    if (name === "base_color") {
      this.viewerOption.attribute.baseColor = newValue;
      this.baseColorSetup("attributeChangedCallback");
    }
  }

  updateOption = (option) => {
    this.viewerOption.attribute = option;

    this.lightSetup();
    this.backgroundSetup();
  };

  controlSetup = () => {
    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.03;
  };

  backgroundSetup = () => {
    this.backgroundColor = new Color(this.viewerOption.attribute.bgColor);
    this.scene.background = this.backgroundColor;
  };

  lightSetup = () => {
    if (this.ambientLight) this.scene.remove(this.ambientLight);
    if (this.directionalLight) this.scene.remove(this.directionalLight);
    if (this.directionalLight2) this.scene.remove(this.directionalLight2);
    if (this.directionalLight3) this.scene.remove(this.directionalLight3);

    this.ambientLight = new THREE.AmbientLight(
      this.viewerOption.attribute.ambientColor,
      this.viewerOption.attribute.ambientIntensity,
    );

    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(
      this.viewerOption.attribute.directColor,
      this.viewerOption.attribute.directIntensity,
    );
    this.directionalLight2 = new THREE.DirectionalLight(
      this.viewerOption.attribute.directColor,
      this.viewerOption.attribute.directIntensity,
    );

    this.directionalLight3 = new THREE.DirectionalLight(
      this.viewerOption.attribute.directColor,
      this.viewerOption.attribute.directIntensity,
    );

    const radius = 100;
    const centerX = 0;
    const centerY = 46;
    const centerZ = 0;

    const positions = [
      { angle: 0, light: this.directionalLight },
      { angle: 120, light: this.directionalLight2 },
      { angle: 240, light: this.directionalLight3 },
    ];

    positions.forEach((pos) => {
      const radian = (Math.PI / 180) * pos.angle;
      const x = centerX + radius * Math.cos(radian);
      const z = centerZ + radius * Math.sin(radian);
      pos.light.position.set(x, centerY, z);
      this.scene.add(pos.light);
    });
  };

  baseColorSetup = () => {
    if (!this.object) return;

    this.object.traverse((node) => {
      if (node.isMesh) {
        if (this.objectType === "fbx") {
          node.material.map = null;
        }

        node.material.color.set(
          new Color(this.viewerOption.attribute.baseColor || "#696969"),
        );

        node.material.shininess = 100;
        node.needsUpdate = true;
      }
    });
  };

  traverseMaterials(object, callback) {
    object.traverse((node) => {
      if (!node.geometry) return;
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      materials.forEach(callback);
    });
  }

  clear() {
    if (!this.object) return;

    this.scene.remove(this.object);

    // dispose geometry
    this.object.traverse((node) => {
      if (!node.geometry) return;

      node.geometry.dispose();
    });

    // dispose textures
    this.traverseMaterials(this.object, (material) => {
      for (const key in material) {
        if (key !== "envMap" && material[key] && material[key].isTexture) {
          material[key].dispose();
        }
      }
    });
  }

  loadModel = (object, clips) => {
    this.clear();

    this.object = object;

    this.object.updateMatrixWorld();
    const box = new Box3().setFromObject(this.object);
    const size = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());

    this.object.position.x += this.object.position.x - center.x;
    this.object.position.y += this.object.position.y - center.y;
    this.object.position.z += this.object.position.z - center.z;

    this.orbitControls.maxDistance = size * 10;
    this.camera.near = size / 100;
    this.camera.far = size * 100;
    this.camera.updateProjectionMatrix();

    this.camera.position.copy(center);
    this.camera.position.x = size / 2.0;
    this.camera.position.y = size / 5.0;
    this.camera.position.z = size;
    this.camera.lookAt(center);

    if (this.viewerOption.attribute.baseColor) {
      this.baseColorSetup();
    }

    if (clips.length === 0) {
      this.scene.add(this.object);
      return;
    }

    const animationsClips = clips;

    this.scene.add(this.object);

    this.mixer = new THREE.AnimationMixer(object);

    this.action = this.mixer.clipAction(animationsClips[0]);
    this.action.setLoop(THREE.LoopRepeat, 2);
    this.action.play();
  };

  resize = () => {
    this.camera.aspect = this.viewerWidth / this.viewerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.viewerWidth, this.viewerHeight);
  };

  async load(file) {
    if (!file) return;
    const fileExtension = file.split(".").pop();

    if (fileExtension !== "glb" && fileExtension !== "fbx")
      throw new Error("File extension not found");

    if (fileExtension === "glb") {
      this.objectType = "glb";
      const glfLoader = new GLTFLoader()
        .setCrossOrigin("anonymous")
        .setDRACOLoader(DRACO_LOADER)
        .setKTX2Loader(KTX2_LOADER.detectSupport(this.renderer))
        .setMeshoptDecoder(MeshoptDecoder);

      await glfLoader
        .loadAsync(file)
        .then((gltf) => {
          this.loadModel(gltf.scene, gltf.animations);
        })
        .catch((error) => {
          console.error("Error while loading gltf file", error);
        });
    }
    if (fileExtension === "fbx") {
      this.objectType = "fbx";
      const fbxLoader = new FBXLoader();

      await fbxLoader
        .loadAsync(file)
        .then((fbx) => {
          this.loadModel(fbx, fbx.animations, true);
        })
        .catch((error) => {
          console.error("Error while loading fbx file", error);
        });
    }
  }

  // async mappingEnvironment(enviroment) {
  //   const envMap = await new EXRLoader().loadAsync(enviroment);
  //
  //   this.pmremGenerator.fromEquirectangular(envMap).texture;
  //   this.pmremGenerator.dispose();
  //
  //   this.scene.environment = envMap;
  //   this.scene.background = this.viewerOption.attribute.background
  //     ? envMap
  //     : this.backgroundColor;
  // }

  render = () => {
    requestAnimationFrame(this.render);

    if (this.viewerOption.attribute.autoRotate) {
      this.object?.rotateY(0.005);
    }

    this.renderer.render(this.scene, this.camera);
    this.orbitControls.update();
    if (this.mixer) {
      this.mixer.update(this.clock.getDelta());
    }
  };

  mappingTexture = (path, name) => {
    if (!path || !name || !this.object) return;
    const texture = new THREE.TextureLoader().load(path);
    texture.colorSpace = THREE.SRGBColorSpace;

    this.object.traverse((node) => {
      if (node.isMesh) {
        const material = node.material;
        material[name] = texture;

        material.needsUpdate = true;
      }
    });
  };
}

customElements.define("pov-3d-viewer", Pov_3d_viewer);
