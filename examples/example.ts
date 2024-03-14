import { Viewer } from "../src/viewer.ts";
document.addEventListener("DOMContentLoaded", async () => {
  const wrapper: HTMLElement | null = document.querySelector(".my_viewer");
  if (!wrapper) {
    throw new Error("Wrapper not found");
  }

  const exampleViewer = new Viewer(wrapper);
  await exampleViewer.load("../public/a000305_HP.fbx");
  exampleViewer.mappingTexture("../public/Dirty Color Palette_4K_N.png", "normalMap");
  exampleViewer.mappingTexture("../public/Dirty Color Palette_4K_BC.png", "map");
  exampleViewer.mappingTexture("../public/Dirty Color Palette_4K_AO.png", "aoMap");
  // exampleViewer.mappingTexture("../public/Dirty Color Palette_4K_R.png", "roughnessMap");
  // exampleViewer.mappingTexture("../public/Dirty Color Palette_4K_M.png", "metalnessMap");
  
  // exampleViewer.mappingTexture("../public/Dirty Color Palette_4K_AO.png", "aoMap");

  
  
});
