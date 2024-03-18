import { Viewer } from "../src/viewer.ts";
import { BasicPreset, BrightPreset } from "../src/preset/LightPreset.ts";
import { BaseColorPreset } from "../src/preset/FBXPreset.ts";
document.addEventListener("DOMContentLoaded", async () => {
  const wrapper: HTMLElement | null = document.querySelector(".my_viewer");
  if (!wrapper) {
    throw new Error("Wrapper not found");
  }

  const exampleViewer = new Viewer(wrapper, BaseColorPreset);
  await exampleViewer.load("../public/Old_ToadCenser.glb");
  // await exampleViewer.load("../public/LittlestTokyo.glb");
  // await exampleViewer.load("../public/dancer.glb");
  // await exampleViewer.mappingEnvironment("../public/venice_sunset_1k.hdr");
});
