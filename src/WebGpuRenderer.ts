export default abstract class WebGpuRenderer {
    _canvasContext: GPUCanvasContext;
    _device: GPUDevice;
    
    constructor(canvasContext: GPUCanvasContext, device: GPUDevice) {
        this._canvasContext = canvasContext;
        this._device = device;
    }

    abstract setup(preferredCanvasFormat: GPUTextureFormat): void;
    abstract render(deltaTSecs: number): void;
}
