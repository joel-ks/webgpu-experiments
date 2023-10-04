import Runner from "./Runner";

const canvasElemId = "webgpu-target";

async function main() {
    console.log("Starting WebGPU test");

    const canvasElem = document.getElementById(canvasElemId) as HTMLCanvasElement;
    if (!canvasElem) throw Error(`Canvas element #"${canvasElemId}" not found`);

    try {
        const runner = await Runner.init(canvasElem);
        runner.run();
    } catch (e) {
        console.error(e);
    }
}

window.addEventListener("load", main);
