import { Viewer } from "../src/viewer.ts";

document.addEventListener("DOMContentLoaded", () => {
  const exampleViewer = new Viewer(document.body);
  exampleViewer.load("../public/dancer.glb");
  // exampleViewer.loadCharacter("../public/Old_ToadCenser.glb");
  // exampleViewer.loadCharacter("../public/walking.fbx");
});
