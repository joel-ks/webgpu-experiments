import WebGpuRenderer from "../WebGpuRenderer";
import { computeShader, renderShaders } from "./shaders";

// Based on https://codelabs.developers.google.com/your-first-webgpu-app

const CANVAS_SIZE = 512;
const GRID_SIZE = 32;
const UPDATE_INTERVAL_MS = 200;
const WORKGROUP_SIZE = 8;

const vertices = new Float32Array([
    //X,   Y,
    -0.8, -0.8, // Triangle 1 (Blue)
    0.8, -0.8,
    0.8, 0.8,

    -0.8, -0.8, // Triangle 2 (Red)
    0.8, 0.8,
    -0.8, 0.8,
]);

export default class GameOfLife extends WebGpuRenderer {
    #cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
    #step = 0;
    #msSinceLastStep = 0;

    #cellPipeline: GPURenderPipeline | null = null;
    #simulationPipeline: GPUComputePipeline | null = null;
    #bindGroups: [GPUBindGroup, GPUBindGroup] | null = null;
    #vertexBuffer: GPUBuffer | null = null;

    constructor(canvasContext: GPUCanvasContext, device: GPUDevice) {
        super(canvasContext, device);
    }

    setup(preferredCanvasFormat: GPUTextureFormat): Promise<void> {
        this._canvasContext.canvas.width = CANVAS_SIZE;
        this._canvasContext.canvas.height = CANVAS_SIZE;
        this._canvasContext.configure({
            device: this._device,
            format: preferredCanvasFormat
        });

        // Create a vertex buffer for the cell square vertices
        this.#vertexBuffer = this._device.createBuffer({
            label: "Cell vertices",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this._device.queue.writeBuffer(this.#vertexBuffer, 0, vertices);

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 8,
            attributes: [{
                format: "float32x2",
                offset: 0,
                shaderLocation: 0, // Position, see vertex shader
            }],
        };

        // Create two storage buffers to hold the cell state.
        const cellStateStorage: [GPUBuffer, GPUBuffer] = [
            this._device.createBuffer({
                label: "Cell State A",
                size: this.#cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            this._device.createBuffer({
                label: "Cell State B",
                size: this.#cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            })
        ];

        // Mark random cells of the first grid as active.
        for (let i = 0; i < this.#cellStateArray.length; i+=3) {
            this.#cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
        }
        
        this._device.queue.writeBuffer(cellStateStorage[0], 0, this.#cellStateArray);
        this._device.queue.writeBuffer(cellStateStorage[1], 0, this.#cellStateArray);

        // Create a uniform buffer that describes the grid.
        const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
        const uniformBuffer = this._device.createBuffer({
            label: "Grid Uniforms",
            size: uniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this._device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

        // Create the bind group layout and pipeline layout.
        const bindGroupLayout = this._device.createBindGroupLayout({
            label: "Cell Bind Group Layout",
            entries: [
                {
                    // Grid uniform buffer
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" }
                },
                {
                    // Cell state input buffer
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage"}
                },
                {
                    // Cell state output buffer
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage"}
                }
            ]
        });

        const pipelineLayout = this._device.createPipelineLayout({
            label: "Cell Pipeline Layout",
            bindGroupLayouts: [ bindGroupLayout ],
        });

        // Create a compute pipeline that updates the game state.
        const simulationShaderModule = this._device.createShaderModule({
            label: "Game of Life simulation shader",
            code: computeShader(WORKGROUP_SIZE)
        });

        this.#simulationPipeline = this._device.createComputePipeline({
            label: "Simulation pipeline",
            layout: pipelineLayout,
            compute: {
                module: simulationShaderModule,
                entryPoint: "computeMain",
            }
        });

        // Create a render pipeline to render the game to the canvas
        const cellShaderModule = this._device.createShaderModule({
            label: "Cell shader",
            code: renderShaders
        });

        this.#cellPipeline = this._device.createRenderPipeline({
            label: "Cell pipeline",
            layout: pipelineLayout,
            vertex: {
                module: cellShaderModule,
                entryPoint: "vertexMain",
                buffers: [vertexBufferLayout]
            },
            fragment: {
                module: cellShaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: preferredCanvasFormat
                }]
            }
        });

        // Create bind groups to swap the cell state input and output buffers
        this.#bindGroups = [
            this._device.createBindGroup({
                label: "Cell renderer bind group A",
                layout: bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: uniformBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: cellStateStorage[0] }
                    },
                    {
                        binding: 2,
                        resource: { buffer: cellStateStorage[1] }
                    }
                ],
            }),
            this._device.createBindGroup({
                label: "Cell renderer bind group B",
                layout: bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: uniformBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: cellStateStorage[1] }
                    },
                    {
                        binding: 2,
                        resource: { buffer: cellStateStorage[0] }
                    }
                ],
            })
        ];

        return Promise.resolve();
    }

    render(deltaTSecs: number): void {
        if (!this.#cellPipeline || !this.#simulationPipeline || !this.#bindGroups)
            throw Error("Renderer has not been set up");

        // Limit update interval to UPDATE_INTERVAL_MS
        this.#msSinceLastStep += deltaTSecs * 1000;
        if (this.#msSinceLastStep < UPDATE_INTERVAL_MS) return;

        this.#msSinceLastStep %= UPDATE_INTERVAL_MS;

        // Get ready!
        const encoder = this._device.createCommandEncoder();

        // Do the simulation pass
        const computePass = encoder.beginComputePass();

        computePass.setPipeline(this.#simulationPipeline);
        computePass.setBindGroup(0, this.#bindGroups[this.#step % 2]!)

        const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
        computePass.dispatchWorkgroups(workgroupCount, workgroupCount);

        computePass.end();

        // Increment the step count
        this.#step++;
            
        // Draw the grid.
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this._canvasContext.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 0, g: 0, b: 0.4, a: 1.0 },
                storeOp: "store",
            }]
        });

        pass.setPipeline(this.#cellPipeline);
        pass.setBindGroup(0, this.#bindGroups[this.#step % 2]!);
        pass.setVertexBuffer(0, this.#vertexBuffer);
        pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE);

        pass.end();

        // GO!
        this._device.queue.submit([encoder.finish()]);
    }
}
