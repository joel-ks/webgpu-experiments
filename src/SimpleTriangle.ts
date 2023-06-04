import WebGpuRenderer from "./WebGpuRenderer";

const width = 800, height = 480;

const bgColour: GPUColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

const vertexData = new Float32Array([
    0.0, 0.6, 0, 1,     1, 0, 0, 1,
    -0.5, -0.6, 0, 1,   0, 1, 0, 1,
    0.5, -0.6, 0, 1,    0, 0, 1, 1
]);

const shaders = /* wgsl */`
struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) color : vec4f
}

@vertex
fn vertex_main(@location(0) position: vec4f, @location(1) color: vec4f) -> VertexOut
{
    var output : VertexOut;
    output.position = position;
    output.color = color;
    return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
    return fragData.color;
}
`;

export default class SimpleTriangle extends WebGpuRenderer {
    #renderPipeline: GPURenderPipeline | null = null;
    #vertexBuffer: GPUBuffer | null = null;

    constructor(canvasContext: GPUCanvasContext, device: GPUDevice) {
        super(canvasContext, device);

        this._canvasContext.canvas.width = width;
        this._canvasContext.canvas.height = height;
    }

    setup(preferredCanvasFormat: GPUTextureFormat): void {
        // ********** SETUP CANVAS **********
        this._canvasContext.canvas.width = width;
        this._canvasContext.canvas.height = height;
        this._canvasContext.configure({
            device: this._device,
            format: preferredCanvasFormat,
            alphaMode: "premultiplied"
        });

        // ********** SETUP RESOURCES **********
        const shaderModule = this._device.createShaderModule({
            label: "triangle shaders",
            code: shaders
        });

        this.#vertexBuffer = this._device.createBuffer({
            label: "triangle vertices",
            size: vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this._device.queue.writeBuffer(this.#vertexBuffer, 0, vertexData, 0, vertexData.length);

        // ********** SETUP PIPELINE **********
        const vertexBufferLayout: GPUVertexBufferLayout = {
            attributes: [
                {
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x4" as const
                },
                {
                    shaderLocation: 1,
                    offset: 16,
                    format: "float32x4" as const
                }
            ],
            arrayStride: 32,
            stepMode: "vertex"
        };

        const pipelineDesc: GPURenderPipelineDescriptor = {
            label: "triangle render pipeline",
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: [vertexBufferLayout]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [
                    {
                        format: navigator.gpu.getPreferredCanvasFormat()
                    }
                ]
            },
            primitive: {
                topology: "triangle-list"
            },
            layout: "auto"
        };

        this.#renderPipeline = this._device.createRenderPipeline(pipelineDesc);
    }

    render(): void {
        if (!this.#renderPipeline || !this.#vertexBuffer)
            throw Error("Renderer has not been set up");

        const commandEncoder = this._device.createCommandEncoder();

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
        renderPassEncoder.setVertexBuffer(0, this.#vertexBuffer);
        renderPassEncoder.draw(3);
        renderPassEncoder.end();

        this._device.queue.submit([commandEncoder.finish()]);
    }
}
