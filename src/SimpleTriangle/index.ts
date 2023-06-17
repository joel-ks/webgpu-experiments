import WebGpuRenderer from "../WebGpuRenderer";

const width = 500, height = 500;
const bgColour = [0.0, 0.45, 0.7, 1.0];

const shaders = /* wgsl */`
@vertex
fn vertex_main(@builtin(vertex_index) vertex_index : u32) -> @builtin(position) vec4f {
    const pos = array(
        vec4f( 0.0,  0.5, 0.0, 1.0),
        vec4f(-0.5774, -0.5, 0.0, 1.0),
        vec4f( 0.5774, -0.5, 0.0, 1.0)
    );

    return pos[vertex_index];
}

@fragment
fn fragment_main() -> @location(0) vec4f {
    return vec4f(1.0, 0.62, 0.0, 1.0);
}`;

export default class SimpleTriangle extends WebGpuRenderer {
    #renderPipeline: GPURenderPipeline | null = null;

    constructor(canvasContext: GPUCanvasContext, device: GPUDevice) {
        super(canvasContext, device);
    }

    setup(preferredCanvasFormat: GPUTextureFormat): Promise<void> {
        this._canvasContext.canvas.width = width;
        this._canvasContext.canvas.height = height;
        this._canvasContext.configure({
            device: this._device,
            format: preferredCanvasFormat,
            alphaMode: "opaque"
        });

        const shaderModule = this._device.createShaderModule({
            label: "triangle shaders",
            code: shaders
        });

        const pipelineDesc: GPURenderPipelineDescriptor = {
            label: "triangle render pipeline",
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main"
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [{
                    format: preferredCanvasFormat
                }]
            },
            primitive: {
                topology: "triangle-list"
            },
            layout: "auto"
        };

        this.#renderPipeline = this._device.createRenderPipeline(pipelineDesc);

        return Promise.resolve();
    }

    render(): void {
        if (!this.#renderPipeline)
            throw Error("Renderer has not been set up");

        const commandEncoder = this._device.createCommandEncoder({ label: "triangle command encoder" });

        const renderPassEncoder = commandEncoder.beginRenderPass({
            label: "triangle render pass",
            colorAttachments: [
                {
                    clearValue: bgColour,
                    loadOp: "clear",
                    storeOp: "store",
                    view: this._canvasContext.getCurrentTexture().createView()
                }
            ]
        });
        renderPassEncoder.setPipeline(this.#renderPipeline);
        renderPassEncoder.draw(3);
        renderPassEncoder.end();

        this._device.queue.submit([commandEncoder.finish()]);
    }
}
