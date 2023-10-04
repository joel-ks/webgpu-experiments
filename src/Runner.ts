import WebGpuRenderer from "./WebGpuRenderer";

export default class Runner {
    static async init(canvasElem: HTMLCanvasElement): Promise<Runner> {
        const canvasGpuContext = canvasElem.getContext("webgpu");
        if (!canvasGpuContext || !navigator.gpu) throw Error("WebGPU not supported in this browser");

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("Could not get GPU adapter");

        // Request all available features and the best available limits
        const requiredFeatures = getAvailableFeatures(adapter);
        const requiredLimits = getBestLimits(adapter);
        console.log("Features:", requiredFeatures);
        console.log("Limits:", requiredLimits);

        const device = await adapter.requestDevice({
            label: "Default device",
            defaultQueue: {
                label: "Default queue for default device"
            },
            requiredFeatures,
            requiredLimits
        });
        if (!device) throw new Error("Could not get GPU device");

        const renderer =
            // new (await import("./SimpleTriangle")).default(canvasGpuContext, device);
            // new (await import("./TriangleFromBuffer")).default(canvasGpuContext, device);
            new (await import("./RotatingCube")).default(canvasGpuContext, device);
            // new (await import("./GameOfLife")).default(canvasGpuContext, device);

        return new Runner(device, renderer);
    }

    #renderer: WebGpuRenderer;
    #running: boolean = false;
    #lastFrameTime: number | null = null;

    constructor(device: GPUDevice, renderer: WebGpuRenderer) {
        this.#renderer = renderer;

        device.lost.then(this.#onDeviceLost);
        this.#renderer.setup(navigator.gpu.getPreferredCanvasFormat());
    }

    run() {
        this.#running = true;
        requestAnimationFrame(this.#frame);
    }

    #onDeviceLost = (info: GPUDeviceLostInfo) => {
        this.#running = false;
        console.error(`Device lost (${info.reason}): ${info.message}`);
    }

    #frame = (t: number) => {
        if (!this.#running) return;

        const deltaT = this.#lastFrameTime ? t - this.#lastFrameTime : 0;
        this.#renderer.render(deltaT / 1000);

        this.#lastFrameTime = t;
        requestAnimationFrame(this.#frame);
    }
}

function getAvailableFeatures(adapter: GPUAdapter): Iterable<GPUFeatureName> {
    return [...adapter.features] as Array<GPUFeatureName>;
}

function getBestLimits(adapter: GPUAdapter): Record<string, number> {
    const limits = adapter.limits;
    const keys = Object.keys(Object.getPrototypeOf(limits));

    return keys.reduce((obj, k) => {
        const v = (limits as any)[k];
        if (typeof v === "number") obj[k] = v;

        return obj;
    }, {} as Record<string, number>);
}
