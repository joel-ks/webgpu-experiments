import WebGpuRenderer from "./WebGpuRenderer";
import SimpleTriangle from "./SimpleTriangle";
import SimpleCube from "./SimpleCube/renderer";

window.addEventListener("load", main);

const canvasElemId = "webgpu-target";

async function main() {
    console.log("Starting WebGPU test");

    const canvasElem = document.getElementById(canvasElemId) as HTMLCanvasElement;
    if (!canvasElem) throw Error(`Canvas element "${canvasElemId}" not found`);

    const canvasGpuContext = canvasElem.getContext("webgpu");
    if (!canvasGpuContext || !navigator.gpu) throw Error("WebGPU not supported in this browser");

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("Could not get GPU adapter");

    const device = await adapter.requestDevice();
    if (!device) throw new Error("Could not get GPU device");

    const renderer: WebGpuRenderer
        // = new SimpleTriangle(canvasGpuContext, device);
        = new SimpleCube(canvasGpuContext, device);
    
    renderer.setup(navigator.gpu.getPreferredCanvasFormat());
    run(renderer);
}

function run(renderer: WebGpuRenderer) {
    let lastFrameTime: number | null = null;
    const frame = (t: number) => {
        const deltaT = lastFrameTime ? t - lastFrameTime : 0;

        renderer.render(deltaT / 1000);

        lastFrameTime = t;
        requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
}

