import { Viewer } from "../src/viewer.ts";
document.addEventListener("DOMContentLoaded", async () => {
  const wrapper: HTMLElement | null = document.querySelector(".wrap");
  if (!wrapper) {
    throw new Error("Wrapper not found");
  }

  const exampleViewer = new Viewer(wrapper);
  exampleViewer.load("../public/Old_ToadCenser.glb");
});
