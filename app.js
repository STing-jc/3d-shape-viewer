class Shape3DViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.shapes = new Map(); // 存储多个图形
        this.selectedShape = null;
        // 移除了截面控制功能
        this.wireframeMode = false;
        this.wireframeStyle = 'classic'; // 线框样式: classic, edges, enhanced
        this.wireframeObjects = new Map(); // 存储线框对象
        this.operationHistory = []; // 操作历史
        this.historyIndex = -1;
        this.shapeCounter = 0;
        this.cuttingMode = false;
        this.cuttingPlane = null;
        this.pendingCuttingPlane = null; // 待确认的切割平面
        this.cuttingConfirmMode = false; // 切割确认模式
        this.activeCuttingPlane = null; // 当前正在调整的切割平面
        this.cuttingPlaneAdjustMode = false; // 切割平面调整模式
        this.attachMode = false;
        this.attachPoint = null;
        this.customClipPlanes = [];
        this.combinedShapes = new Map(); // 拼合后的图形组
        this.isLocked = false; // 拼合锁定状态
        this.dragControls = null; // 拖拽控制器
        this.isDragging = false; // 拖拽状态
        this.dragPlane = null; // 拖拽平面
        this.moveMode = false; // 移动模式
        this.uniformScaleMode = false; // 等比缩放模式
        
        // 布尔运算相关
        this.booleanMode = false; // 布尔运算模式
        this.booleanMainShape = null; // 主体图形
        this.booleanToolShape = null; // 工具图形
        this.booleanOperation = 'subtract'; // 运算类型：subtract, union, intersect
        
        // 移动设备检测和性能优化
        this.isMobile = this.detectMobileDevice();
        this.performanceMode = this.isMobile ? 'mobile' : 'desktop';
        
        // 性能监控相关
        this.frameCount = 0;
        this.lastFPSCheck = Date.now();
        this.currentFPS = 60;
        this.lowFPSCount = 0;
        this.adaptiveQuality = this.isMobile; // 移动设备启用自适应质量
        
        // 配置管理相关
        this.configFiles = new Map(); // 存储配置文件
        
        this.init();
        this.setupEventListeners();
        this.createShape('cube');
    }
    
    // 检测移动设备
    detectMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // 检测移动设备的用户代理字符串
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileRegex.test(userAgent);
        
        // 检测触摸屏
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // 检测屏幕尺寸
        const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 768;
        
        // 检测设备内存（如果可用）
        const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
        
        // 检测硬件并发数（CPU核心数）
        const hasLowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
        
        // 综合判断
        const isMobile = isMobileUA || (isTouchDevice && isSmallScreen);
        const isLowPerformance = hasLowMemory || hasLowCPU;
        
        console.log('设备检测结果:', {
            userAgent: userAgent,
            isMobileUA: isMobileUA,
            isTouchDevice: isTouchDevice,
            isSmallScreen: isSmallScreen,
            hasLowMemory: hasLowMemory,
            hasLowCPU: hasLowCPU,
            finalResult: isMobile || isLowPerformance
        });
        
        return isMobile || isLowPerformance;
    }
    
    // 获取优化的渲染器配置
    getOptimizedRendererConfig() {
        if (this.isMobile) {
            // 移动设备优化配置
            return {
                antialias: false, // 关闭抗锯齿以提高性能
                alpha: false,
                powerPreference: "default", // 使用默认功耗模式
                stencil: false,
                depth: true,
                logarithmicDepthBuffer: false,
                preserveDrawingBuffer: false
            };
        } else {
            // 桌面设备高质量配置
            return {
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
                stencil: false,
                depth: true,
                logarithmicDepthBuffer: false,
                preserveDrawingBuffer: false
            };
        }
    }
    
    // 设置阴影
    setupShadows() {
        if (this.isMobile) {
            // 移动设备关闭阴影
            this.renderer.shadowMap.enabled = false;
        } else {
            // 桌面设备启用高质量阴影
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.shadowMap.autoUpdate = true;
        }
    }
    
    init() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff); // 白色背景
        
        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(8, 8, 8);
        
        // 根据设备类型创建优化的渲染器
        const rendererConfig = this.getOptimizedRendererConfig();
        this.renderer = new THREE.WebGLRenderer(rendererConfig);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // 根据设备类型设置像素比
        const pixelRatio = this.isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
        this.renderer.setPixelRatio(pixelRatio);
        
        // 根据性能模式设置阴影
        this.setupShadows();
        
        // 渲染质量设置
        this.renderer.localClippingEnabled = true;
        if (!this.isMobile) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
            this.renderer.physicallyCorrectLights = true;
        }
        
        // 清除颜色设置
        this.renderer.setClearColor(0xf0f0f0, 1.0);
        
        document.getElementById('container').appendChild(this.renderer.domElement);
        
        // 创建控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        // 移动设备使用更高的阻尼系数以减少闪烁
        this.controls.dampingFactor = this.isMobile ? 0.1 : 0.05;
        this.controls.target.set(10, 0, 10); // 设置控制器目标为网格中心
        
        // 移动设备优化设置
        if (this.isMobile) {
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
            this.controls.enableRotate = true;
            this.controls.rotateSpeed = 0.5;
            this.controls.zoomSpeed = 0.8;
            this.controls.panSpeed = 0.8;
            this.controls.maxPolarAngle = Math.PI;
            this.controls.minDistance = 5;
            this.controls.maxDistance = 50;
        }
        
        // 移除了截面控制功能
        
        // 初始化自定义切割平面
        this.customClipPlanes = [];
        
        // 添加光照
        this.setupLighting();
        
        // 添加网格
        this.addGrid();
        
        // 设置鼠标拾取
        this.setupRaycaster();
        
        // 设置拖拽控制器
        this.setupDragControls();
        
        // 开始渲染循环
        this.animate();
        
        // 处理窗口大小变化
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLighting() {
        // 环境光 - 提供基础照明
        const ambientIntensity = this.isMobile ? 0.6 : 0.4;
        const ambientLight = new THREE.AmbientLight(0x404040, ambientIntensity);
        this.scene.add(ambientLight);
        
        // 主光源 - 方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(15, 15, 10);
        
        // 根据设备类型设置阴影
        if (this.performanceMode !== 'mobile') {
            directionalLight.castShadow = true;
            // 高质量阴影设置
            directionalLight.shadow.mapSize.width = 4096;
            directionalLight.shadow.mapSize.height = 4096;
            directionalLight.shadow.camera.near = 0.1;
            directionalLight.shadow.camera.far = 50;
            directionalLight.shadow.camera.left = -25;
            directionalLight.shadow.camera.right = 25;
            directionalLight.shadow.camera.top = 25;
            directionalLight.shadow.camera.bottom = -25;
            directionalLight.shadow.bias = -0.0001;
            directionalLight.shadow.normalBias = 0.02;
        }
        
        this.scene.add(directionalLight);
        
        // 补充光源 - 点光源（移动设备上简化）
        if (!this.isMobile) {
            const pointLight = new THREE.PointLight(0x4a90e2, 0.6, 30);
            pointLight.position.set(5, 10, 5);
            pointLight.castShadow = true;
            pointLight.shadow.mapSize.width = 1024;
            pointLight.shadow.mapSize.height = 1024;
            this.scene.add(pointLight);
        }
        
        // 添加半球光以获得更自然的照明
        const hemisphereIntensity = this.isMobile ? 0.5 : 0.3;
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x8b4513, hemisphereIntensity);
        this.scene.add(hemisphereLight);
    }
    
    addGrid() {
        this.gridHelper = new THREE.GridHelper(20, 40, 0x444444, 0x222222);
        this.gridHelper.position.set(10, 0, 10); // 将网格移动到正值范围中心
        this.scene.add(this.gridHelper);
        
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);
        
        // 网格显示状态
        this.gridVisible = true;
    }
    
    setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.renderer.domElement.addEventListener('click', (event) => {
            this.handleMouseClick(event);
        });
    }
    
    setupDragControls() {
        // 添加鼠标事件监听器用于拖拽
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            this.handleMouseDown(event);
        });
        
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
        
        this.renderer.domElement.addEventListener('mouseup', (event) => {
            this.handleMouseUp(event);
        });
        
        // 添加触摸事件支持（移动设备）
        if (this.isMobile) {
            this.setupTouchControls();
        }
    }
    
    setupTouchControls() {
        let touchStartTime = 0;
        let lastTouchMove = 0;
        const touchMoveThrottle = 16; // 约60fps，减少触摸移动事件频率
        
        this.renderer.domElement.addEventListener('touchstart', (event) => {
            event.preventDefault();
            touchStartTime = Date.now();
            
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    button: 0
                });
                this.handleMouseDown(mouseEvent);
            }
        }, { passive: false });
        
        this.renderer.domElement.addEventListener('touchmove', (event) => {
            event.preventDefault();
            
            const now = Date.now();
            if (now - lastTouchMove < touchMoveThrottle) {
                return; // 节流处理，减少触摸移动事件频率
            }
            lastTouchMove = now;
            
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.handleMouseMove(mouseEvent);
            }
        }, { passive: false });
        
        this.renderer.domElement.addEventListener('touchend', (event) => {
            event.preventDefault();
            
            const touchDuration = Date.now() - touchStartTime;
            
            const mouseEvent = new MouseEvent('mouseup', {
                button: 0
            });
            this.handleMouseUp(mouseEvent);
            
            // 如果是短触摸（小于200ms），触发点击事件
            if (touchDuration < 200 && event.changedTouches.length === 1) {
                const touch = event.changedTouches[0];
                const clickEvent = new MouseEvent('click', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    button: 0
                });
                this.handleMouseClick(clickEvent);
            }
        }, { passive: false });
    }
    
    initializeCuttingPlane() {
        // 创建初始切割平面
        const position = new THREE.Vector3(0, 0, 0);
        const normal = new THREE.Vector3(1, 0, 0);
        
        this.activeCuttingPlane = new THREE.Plane(normal, -normal.dot(position));
        
        // 创建切割平面可视化
        this.createCuttingPlaneVisualization();
        
        // 应用切割预览
        this.updateCuttingPlaneFromControls();
    }
    
    createCuttingPlaneVisualization() {
        // 移除现有的切割平面可视化
        const existingPlane = this.scene.getObjectByName('activeCuttingPlaneHelper');
        if (existingPlane) {
            this.scene.remove(existingPlane);
        }
        
        // 创建新的平面可视化
        const planeGeometry = new THREE.PlaneGeometry(25, 25);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.name = 'activeCuttingPlaneHelper';
        
        this.scene.add(planeMesh);
        this.updateCuttingPlaneVisualization();
    }
    
    updateCuttingPlaneVisualization() {
        const planeMesh = this.scene.getObjectByName('activeCuttingPlaneHelper');
        if (!planeMesh || !this.activeCuttingPlane) return;
        
        // 获取平面上的一个点
        const point = this.activeCuttingPlane.normal.clone().multiplyScalar(-this.activeCuttingPlane.constant);
        
        // 设置平面位置
        planeMesh.position.copy(point);
        
        // 设置平面方向
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.activeCuttingPlane.normal);
        planeMesh.setRotationFromQuaternion(quaternion);
    }
    
    updateCuttingPlaneFromControls() {
        if (!this.cuttingPlaneAdjustMode) return;
        
        // 获取精度设置
        const precisionMode = document.getElementById('precisionMode').value;
        let precision = 2;
        switch(precisionMode) {
            case 'high': precision = 3; break;
            case 'ultra': precision = 4; break;
            default: precision = 2;
        }
        
        // 获取控制值
        const posX = parseFloat(document.getElementById('cuttingPosX').value);
        const posY = parseFloat(document.getElementById('cuttingPosY').value);
        const posZ = parseFloat(document.getElementById('cuttingPosZ').value);
        
        const normalX = parseFloat(document.getElementById('cuttingNormalX').value);
        const normalY = parseFloat(document.getElementById('cuttingNormalY').value);
        const normalZ = parseFloat(document.getElementById('cuttingNormalZ').value);
        
        // 更新显示值和数值输入框
        document.getElementById('cuttingPosXValue').textContent = posX.toFixed(precision);
        document.getElementById('cuttingPosYValue').textContent = posY.toFixed(precision);
        document.getElementById('cuttingPosZValue').textContent = posZ.toFixed(precision);
        document.getElementById('cuttingNormalXValue').textContent = normalX.toFixed(precision);
        document.getElementById('cuttingNormalYValue').textContent = normalY.toFixed(precision);
        document.getElementById('cuttingNormalZValue').textContent = normalZ.toFixed(precision);
        
        // 同步数值输入框
        document.getElementById('cuttingPosXInput').value = posX.toFixed(precision);
        document.getElementById('cuttingPosYInput').value = posY.toFixed(precision);
        document.getElementById('cuttingPosZInput').value = posZ.toFixed(precision);
        document.getElementById('cuttingNormalXInput').value = normalX.toFixed(precision);
        document.getElementById('cuttingNormalYInput').value = normalY.toFixed(precision);
        document.getElementById('cuttingNormalZInput').value = normalZ.toFixed(precision);
        
        // 创建新的切割平面
        const position = new THREE.Vector3(posX, posY, posZ);
        const normal = new THREE.Vector3(normalX, normalY, normalZ);
        
        // 标准化法向量（如果不为零向量）
        if (normal.length() > 0.001) {
            normal.normalize();
        } else {
            // 如果法向量太小，使用默认的 X 轴法向量
            normal.set(1, 0, 0);
        }
        
        this.activeCuttingPlane = new THREE.Plane(normal, -normal.dot(position));
        
        // 更新可视化
        this.updateCuttingPlaneVisualization();
        
        // 应用切割预览
        this.previewActiveCuttingPlane();
    }
    
    previewActiveCuttingPlane() {
        if (!this.activeCuttingPlane) return;
        
        // 临时应用切割平面到所有图形
        this.shapes.forEach(mesh => {
            if (mesh.material) {
                const allPlanes = [...this.customClipPlanes, this.activeCuttingPlane];
                mesh.material.clippingPlanes = allPlanes;
                mesh.material.needsUpdate = true;
            }
        });
        
        // 临时应用切割平面到拼合组
        this.combinedShapes.forEach(group => {
            group.traverse(child => {
                if (child.isMesh && child.material) {
                    const allPlanes = [...this.clipPlanes, ...this.customClipPlanes, this.activeCuttingPlane];
                    child.material.clippingPlanes = allPlanes;
                    child.material.needsUpdate = true;
                }
            });
        });
    }
    
    applyCuttingPlaneFromControls() {
        if (!this.activeCuttingPlane) return;
        
        // 保存所有图形的切割前状态
        const beforeStates = new Map();
        this.shapes.forEach((mesh, id) => {
            beforeStates.set(id, this.saveShapeState(mesh));
        });
        
        // 对所有图形进行真正的几何切割
        this.shapes.forEach((mesh, id) => {
            this.performGeometryCutting(mesh, this.activeCuttingPlane);
        });
        
        // 对拼合组进行切割
        this.combinedShapes.forEach(group => {
            group.traverse(child => {
                if (child.isMesh) {
                    this.performGeometryCutting(child, this.activeCuttingPlane);
                }
            });
        });
        
        // 保存所有图形的切割后状态并记录历史
        const afterStates = new Map();
        this.shapes.forEach((mesh, id) => {
            afterStates.set(id, this.saveShapeState(mesh));
        });
        
        this.addToHistory({
            type: 'cutting',
            beforeStates: beforeStates,
            afterStates: afterStates,
            cuttingPlane: this.activeCuttingPlane.clone()
        });
        
        // 将切割平面添加到历史记录（用于撤销功能）
        this.customClipPlanes.push(this.activeCuttingPlane.clone());
        
        this.updateCuttingPlanesList();
        
        // 检查是否需要自动清除切割平面
        const autoClearCheckbox = document.getElementById('autoClearCuttingPlane');
        if (autoClearCheckbox && autoClearCheckbox.checked) {
            // 延迟清除，让用户看到切割完成的提示
            setTimeout(() => {
                this.clearCuttingPlanesAuto();
            }, 1000);
            this.showTooltip('几何切割已完成，切割平面将自动清除', 2000);
        } else {
            this.showTooltip('几何切割已完成', 1500);
        }
    }
    
    resetCuttingPlaneControls() {
        // 重置控制值
        document.getElementById('cuttingPosX').value = 0;
        document.getElementById('cuttingPosY').value = 0;
        document.getElementById('cuttingPosZ').value = 0;
        document.getElementById('cuttingNormalX').value = 1;
        document.getElementById('cuttingNormalY').value = 0;
        document.getElementById('cuttingNormalZ').value = 0;
        
        // 更新切割平面
        this.updateCuttingPlaneFromControls();
    }
    
    // 快速设置切割方向
    setQuickCuttingDirection(axis) {
        if (!this.cuttingPlaneAdjustMode) {
            this.showTooltip('请先启用切割工具', 1500);
            return;
        }
        
        // 重置位置到原点
        document.getElementById('cuttingPosX').value = 0;
        document.getElementById('cuttingPosY').value = 0;
        document.getElementById('cuttingPosZ').value = 0;
        
        // 设置法向量
        switch(axis) {
            case 'x':
                document.getElementById('cuttingNormalX').value = 1;
                document.getElementById('cuttingNormalY').value = 0;
                document.getElementById('cuttingNormalZ').value = 0;
                this.showTooltip('已设置为X轴切割', 1000);
                break;
            case 'y':
                document.getElementById('cuttingNormalX').value = 0;
                document.getElementById('cuttingNormalY').value = 1;
                document.getElementById('cuttingNormalZ').value = 0;
                this.showTooltip('已设置为Y轴切割', 1000);
                break;
            case 'z':
                document.getElementById('cuttingNormalX').value = 0;
                document.getElementById('cuttingNormalY').value = 0;
                document.getElementById('cuttingNormalZ').value = 1;
                this.showTooltip('已设置为Z轴切割', 1000);
                break;
        }
        
        // 同步数值输入框
        document.getElementById('cuttingPosXInput').value = 0;
        document.getElementById('cuttingPosYInput').value = 0;
        document.getElementById('cuttingPosZInput').value = 0;
        document.getElementById('cuttingNormalXInput').value = document.getElementById('cuttingNormalX').value;
        document.getElementById('cuttingNormalYInput').value = document.getElementById('cuttingNormalY').value;
        document.getElementById('cuttingNormalZInput').value = document.getElementById('cuttingNormalZ').value;
        
        // 更新切割平面
        this.updateCuttingPlaneFromControls();
    }
    
    // 切割平面旋转功能
    rotateCuttingPlane(axis, angle) {
        if (!this.cuttingPlaneAdjustMode || !this.activeCuttingPlane) return;
        
        // 获取当前法向量
        const normal = this.activeCuttingPlane.normal.clone();
        
        // 创建旋转矩阵
        const rotationMatrix = new THREE.Matrix4();
        switch(axis) {
            case 'x':
                rotationMatrix.makeRotationX(angle);
                break;
            case 'y':
                rotationMatrix.makeRotationY(angle);
                break;
            case 'z':
                rotationMatrix.makeRotationZ(angle);
                break;
        }
        
        // 应用旋转到法向量
        normal.applyMatrix4(rotationMatrix);
        normal.normalize();
        
        // 更新控制器的值
        document.getElementById('cuttingNormalX').value = normal.x.toFixed(2);
        document.getElementById('cuttingNormalY').value = normal.y.toFixed(2);
        document.getElementById('cuttingNormalZ').value = normal.z.toFixed(2);
        
        // 更新切割平面
        this.updateCuttingPlaneFromControls();
    }
    
    // 初始化旋转按钮事件
    initRotationButtons() {
        const rotationSpeed = 0.05; // 旋转速度（弧度）
        const rotationInterval = 50; // 旋转间隔（毫秒）
        
        ['X', 'Y', 'Z'].forEach(axis => {
            const button = document.getElementById(`rotateCuttingPlane${axis}`);
            if (!button) return;
            
            let rotationTimer = null;
            let isRotating = false;
            
            // 鼠标按下开始旋转
            const startRotation = () => {
                if (isRotating) return;
                isRotating = true;
                
                rotationTimer = setInterval(() => {
                    this.rotateCuttingPlane(axis.toLowerCase(), rotationSpeed);
                }, rotationInterval);
                
                button.style.transform = 'scale(0.95)';
                button.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3)';
            };
            
            // 停止旋转
            const stopRotation = () => {
                if (!isRotating) return;
                isRotating = false;
                
                if (rotationTimer) {
                    clearInterval(rotationTimer);
                    rotationTimer = null;
                }
                
                button.style.transform = 'scale(1)';
                button.style.boxShadow = 'none';
            };
            
            // 绑定事件
            button.addEventListener('mousedown', startRotation);
            button.addEventListener('mouseup', stopRotation);
            button.addEventListener('mouseleave', stopRotation);
            button.addEventListener('touchstart', startRotation);
            button.addEventListener('touchend', stopRotation);
            
            // 防止按钮获得焦点时的默认行为
            button.addEventListener('focus', (e) => e.target.blur());
        });
    }
    
    // 初始化精度控制
    initPrecisionControls() {
        // 精度模式切换
        const precisionMode = document.getElementById('precisionMode');
        if (precisionMode) {
            precisionMode.addEventListener('change', () => {
                this.updateSliderSteps();
                this.updateCuttingPlaneFromControls();
            });
        }
        
        // 数值输入框与滑块同步
        const controls = [
            { slider: 'cuttingPosX', input: 'cuttingPosXInput' },
            { slider: 'cuttingPosY', input: 'cuttingPosYInput' },
            { slider: 'cuttingPosZ', input: 'cuttingPosZInput' },
            { slider: 'cuttingNormalX', input: 'cuttingNormalXInput' },
            { slider: 'cuttingNormalY', input: 'cuttingNormalYInput' },
            { slider: 'cuttingNormalZ', input: 'cuttingNormalZInput' }
        ];
        
        controls.forEach(control => {
            const slider = document.getElementById(control.slider);
            const input = document.getElementById(control.input);
            
            if (slider && input) {
                // 滑块变化时更新输入框
                slider.addEventListener('input', () => {
                    input.value = slider.value;
                    this.updateCuttingPlaneFromControls();
                });
                
                // 输入框变化时更新滑块
                input.addEventListener('input', () => {
                    const value = parseFloat(input.value);
                    if (!isNaN(value)) {
                        const min = parseFloat(slider.min);
                        const max = parseFloat(slider.max);
                        if (value >= min && value <= max) {
                            slider.value = value;
                            this.updateCuttingPlaneFromControls();
                        }
                    }
                });
                
                // 输入框失去焦点时验证范围
                input.addEventListener('blur', () => {
                    const value = parseFloat(input.value);
                    const min = parseFloat(slider.min);
                    const max = parseFloat(slider.max);
                    if (isNaN(value) || value < min || value > max) {
                        input.value = slider.value;
                    }
                });
            }
        });
    }
    
    // 更新滑块步长
    updateSliderSteps() {
        const precisionMode = document.getElementById('precisionMode').value;
        let step = '0.01';
        switch(precisionMode) {
            case 'high': step = '0.001'; break;
            case 'ultra': step = '0.0001'; break;
            default: step = '0.01';
        }
        
        // 更新所有滑块的步长
        const sliders = [
            'cuttingPosX', 'cuttingPosY', 'cuttingPosZ',
            'cuttingNormalX', 'cuttingNormalY', 'cuttingNormalZ'
        ];
        
        sliders.forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            if (slider) {
                slider.step = step;
            }
        });
        
        // 更新数值输入框的步长
        const inputs = [
            'cuttingPosXInput', 'cuttingPosYInput', 'cuttingPosZInput',
            'cuttingNormalXInput', 'cuttingNormalYInput', 'cuttingNormalZInput'
        ];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.step = step;
            }
        });
    }
    
    // 初始化帮助系统
    initHelpSystem() {
        const helpButton = document.getElementById('helpButton');
        const helpModal = document.getElementById('helpModal');
        const closeHelp = document.getElementById('closeHelp');
        
        if (helpButton && helpModal && closeHelp) {
            // 帮助按钮点击事件
            helpButton.addEventListener('click', () => {
                helpModal.style.display = 'block';
                document.body.style.overflow = 'hidden'; // 防止背景滚动
            });
            
            // 关闭按钮点击事件
            closeHelp.addEventListener('click', () => {
                helpModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
            
            // 点击背景关闭弹窗
            helpModal.addEventListener('click', (e) => {
                if (e.target === helpModal) {
                    helpModal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
            
            // ESC键关闭弹窗
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && helpModal.style.display === 'block') {
                    helpModal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
            
            // 帮助按钮悬停效果
            helpButton.addEventListener('mouseenter', () => {
                helpButton.style.transform = 'scale(1.1)';
                helpButton.style.boxShadow = '0 4px 15px rgba(0,123,255,0.4)';
            });
            
            helpButton.addEventListener('mouseleave', () => {
                helpButton.style.transform = 'scale(1)';
                helpButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            });
        }
    }
    
    exitCuttingAdjustMode() {
        // 移除切割平面可视化
        const planeMesh = this.scene.getObjectByName('activeCuttingPlaneHelper');
        if (planeMesh) {
            this.scene.remove(planeMesh);
        }
        
        // 恢复原始材质（移除预览效果）
        this.shapes.forEach(mesh => {
            if (mesh.material) {
                mesh.material.clippingPlanes = this.customClipPlanes;
                mesh.material.needsUpdate = true;
            }
        });
        
        this.activeCuttingPlane = null;
         this.cuttingPlaneAdjustMode = false;
     }
     
     addShape(shapeType) {
         if (!shapeType) {
             shapeType = document.getElementById('shapeSelect').value;
         }
         this.createShape(shapeType);
         this.showTooltip(`已添加${this.getShapeTypeName(shapeType)}`, 1500);
     }
     
     getShapeTypeName(shapeType) {
         const names = {
             'cube': '立方体',
             'sphere': '球体',
             'cylinder': '圆柱体',
             'cone': '圆锥体',
             'pyramid': '四角锥',
             'torus': '环形体',
             'dodecahedron': '十二面体',
             'icosahedron': '二十面体'
         };
         return names[shapeType] || '图形';
     }
     
     lockCombination() {
         if (this.shapes.size < 2) {
             this.showTooltip('至少需要2个图形才能进行拼合锁定', 2000);
             return;
         }
         
         if (this.isLocked) {
             this.unlockCombination();
             return;
         }
         
         // 创建拼合组
         const combinedGroup = new THREE.Group();
         combinedGroup.name = 'combinedShapes';
         
         // 将所有图形添加到组中
         const shapesToCombine = Array.from(this.shapes.values());
         shapesToCombine.forEach(shape => {
             // 保存原始位置
             shape.userData.originalPosition = shape.position.clone();
             shape.userData.originalRotation = shape.rotation.clone();
             
             // 从场景中移除并添加到组中
             this.scene.remove(shape);
             combinedGroup.add(shape);
         });
         
         // 将组添加到场景
         this.scene.add(combinedGroup);
         
         // 更新状态
         this.isLocked = true;
         this.combinedShapes.set('main', combinedGroup);
         
         // 更新按钮文本
         const btn = document.getElementById('lockCombination');
         if (btn) {
             btn.textContent = '解除锁定';
             btn.style.background = 'linear-gradient(45deg, #ff4757, #ff3838)';
         }
         
         // 应用截面和切割效果到拼合组
         this.applyCuttingToGroup(combinedGroup);
         
         this.showTooltip('图形已拼合锁定，现在作为一个整体受到截面和切割影响', 3000);
         this.updateShapesList();
     }
     
     unlockCombination() {
         const combinedGroup = this.scene.getObjectByName('combinedShapes');
         if (!combinedGroup) return;
         
         // 将图形从组中移除并重新添加到场景
         const shapesToRestore = [];
         combinedGroup.children.forEach(shape => {
             shapesToRestore.push(shape);
         });
         
         shapesToRestore.forEach(shape => {
             combinedGroup.remove(shape);
             this.scene.add(shape);
             
             // 恢复原始变换（如果需要）
             if (shape.userData.originalPosition) {
                 // 可以选择是否恢复原始位置
                 // shape.position.copy(shape.userData.originalPosition);
                 // shape.rotation.copy(shape.userData.originalRotation);
             }
         });
         
         // 移除组
         this.scene.remove(combinedGroup);
         this.combinedShapes.delete('main');
         
         // 更新状态
         this.isLocked = false;
         
         // 更新按钮文本
         const btn = document.getElementById('lockCombination');
         if (btn) {
             btn.textContent = '拼合锁定';
             btn.style.background = 'linear-gradient(45deg, #ffa502, #ff6348)';
         }
         
         this.showTooltip('拼合锁定已解除，图形恢复独立状态', 2000);
         this.updateShapesList();
     }
     
     applyCuttingToGroup(group) {
         // 为拼合组中的所有图形应用切割平面
         group.traverse((child) => {
             if (child.isMesh && child.material) {
                 child.material.clippingPlanes = this.customClipPlanes;
                 child.material.needsUpdate = true;
             }
         });
     }
     
     // ... existing code ...
     
     updateMousePosition(event) {
         // 获取渲染器画布的边界
         const rect = this.renderer.domElement.getBoundingClientRect();
         
         // 计算相对于画布的鼠标位置
         this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
         this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
     }
     
     handleMouseDown(event) {
         if (event.button !== 0) return; // 只处理左键
         
         this.updateMousePosition(event);
         this.raycaster.setFromCamera(this.mouse, this.camera);
         
         // 获取所有可拖拽的对象
          const draggableObjects = [];
          this.shapes.forEach(mesh => {
              draggableObjects.push(mesh);
          });
          
          // 添加拼合组到可拖拽对象
          this.combinedShapes.forEach(group => {
              draggableObjects.push(group);
          });
         
         const intersects = this.raycaster.intersectObjects(draggableObjects);
         
         if (intersects.length > 0) {
             const selectedObject = intersects[0].object;
             
             // 只有在移动模式下且不在切割模式或附着模式时，才启用拖拽
             if (this.moveMode && !this.cuttingMode && !this.attachMode) {
                 this.isDragging = true;
                 this.selectedShape = selectedObject;
                 
                 // 保存拖拽开始时的状态
                 this.dragStartState = this.saveShapeState(selectedObject);
                 
                 // 在移动模式下，总是禁用轨道控制器
                 this.controls.enabled = false;
                 
                 // 保存原始缩放值
                 if (!selectedObject.userData.originalScale) {
                     selectedObject.userData.originalScale = selectedObject.scale.clone();
                 }
                 
                 // 计算拖拽平面 - 使用图形中心位置而不是点击点
                 const objectCenter = selectedObject.position.clone();
                 const cameraDirection = new THREE.Vector3();
                 this.camera.getWorldDirection(cameraDirection);
                 this.dragPlane = new THREE.Plane(cameraDirection, -cameraDirection.dot(objectCenter));
                 
                 // 记录初始拖拽点和图形位置的偏移
                 const intersectionPoint = intersects[0].point;
                 this.dragOffset = objectCenter.clone().sub(intersectionPoint);
                 
                 // 选中图形
                 this.selectShape(selectedObject);
                 
                 event.preventDefault();
                 return;
             }
         } else {
             // 如果在移动模式下点击空白区域，禁用轨道控制器
             if (this.moveMode) {
                 this.controls.enabled = false;
                 event.preventDefault();
             }
         }
     }
     
     handleMouseMove(event) {
         if (!this.isDragging || !this.selectedShape) return;
         
         this.updateMousePosition(event);
         this.raycaster.setFromCamera(this.mouse, this.camera);
         
         // 计算与拖拽平面的交点
         const intersectionPoint = new THREE.Vector3();
         if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {
             // 使用偏移量来计算新位置，避免图形跳跃
             const newPosition = intersectionPoint.clone().add(this.dragOffset);
             
             // 计算图形的边界框以确保完全在网格范围内
             const box = new THREE.Box3().setFromObject(this.selectedShape);
             const size = box.getSize(new THREE.Vector3());
             
             // 计算安全的移动范围（考虑图形尺寸）
             const halfSizeX = size.x / 2;
             const halfSizeZ = size.z / 2;
             const gridSize = 20; // 网格大小
             const margin = 0.5; // 边距
             
             // 限制图形在网格范围内移动，确保图形不超出边界
             newPosition.x = Math.max(halfSizeX + margin, Math.min(gridSize - halfSizeX - margin, newPosition.x));
             // Y轴限制：确保图形底部不低于地面，顶部不超出合理高度
             const minY = size.y / 2; // 图形底部不低于地面
             const maxY = gridSize; // 图形顶部不超出网格高度
             newPosition.y = Math.max(minY, Math.min(maxY - size.y / 2, newPosition.y));
             newPosition.z = Math.max(halfSizeZ + margin, Math.min(gridSize - halfSizeZ - margin, newPosition.z));
             
             this.selectedShape.position.copy(newPosition);
             
             // 确保图形的缩放不变
             if (this.selectedShape.userData.originalScale) {
                 this.selectedShape.scale.copy(this.selectedShape.userData.originalScale);
             } else {
                 // 保存原始缩放值以备将来使用
                 this.selectedShape.userData.originalScale = this.selectedShape.scale.clone();
             }
             
             // 更新选择框位置 - 重新创建选择框以避免缩放问题
             const selectionBox = this.scene.getObjectByName('selectionBox');
             if (selectionBox) {
                 this.scene.remove(selectionBox);
                 const newBox = new THREE.BoxHelper(this.selectedShape, 0xffff00);
                 newBox.name = 'selectionBox';
                 this.scene.add(newBox);
             }
             
             // 更新图形信息显示
             this.updateShapeInfo(this.selectedShape);
         }
         
         event.preventDefault();
     }
     
     handleMouseUp(event) {
         if (this.isDragging) {
             // 记录移动操作到历史
             if (this.selectedShape && this.dragStartState) {
                 const endState = this.saveShapeState(this.selectedShape);
                 this.addToHistory({
                     type: 'move',
                     shapeId: this.selectedShape.userData.id,
                     beforeState: this.dragStartState,
                     afterState: endState
                 });
             }
             
             this.isDragging = false;
             this.dragPlane = null;
             this.dragOffset = null;
             this.dragStartState = null;
             
             // 只有在非移动模式下才重新启用轨道控制器
             if (!this.moveMode) {
                 this.controls.enabled = true;
             }
         } else if (this.moveMode) {
             // 在移动模式下，即使没有拖拽也要保持轨道控制器禁用
             this.controls.enabled = false;
         }
     }
     
     handleMouseClick(event) {
         // 如果刚刚完成拖拽，不处理点击事件
         if (this.isDragging) return;
         
         this.updateMousePosition(event);
         this.raycaster.setFromCamera(this.mouse, this.camera);
         const intersects = this.raycaster.intersectObjects(Array.from(this.shapes.values()));
         
         if (intersects.length > 0) {
             if (this.cuttingMode) {
                 this.handleCuttingClick(intersects);
             } else if (this.attachMode) {
                 this.handleAttachClick(intersects);
             } else {
                 this.selectShape(intersects[0].object);
             }
         } else {
             if (!this.cuttingMode && !this.attachMode) {
                 this.deselectShape();
             }
         }
     }
    
    selectShape(mesh) {
        // 取消之前的选择
        this.deselectShape();
        
        this.selectedShape = mesh;
        
        // 确保图形有保存的原始缩放值
        if (!mesh.userData.originalScale) {
            mesh.userData.originalScale = mesh.scale.clone();
        }
        
        // 添加选择框
        const box = new THREE.BoxHelper(mesh, 0xffff00);
        box.name = 'selectionBox';
        this.scene.add(box);
        
        // 更新UI显示选中的图形信息
        this.updateShapeInfo(mesh);
        
        // 显示大小控制面板并更新滑块值
        this.showShapeSizeControls(mesh);
    }
    
    deselectShape() {
        if (this.selectedShape) {
            // 移除选择框
            const selectionBox = this.scene.getObjectByName('selectionBox');
            if (selectionBox) this.scene.remove(selectionBox);
            this.selectedShape = null;
            
            // 隐藏大小控制面板
            this.hideShapeSizeControls();
        }
    }
    
    updateShapeInfo(mesh) {
        const info = document.getElementById('shapeInfo');
        if (info) {
            info.innerHTML = `
                <strong>选中图形:</strong> ${mesh.userData.type}<br>
                <strong>位置:</strong> (${mesh.position.x.toFixed(1)}, ${mesh.position.y.toFixed(1)}, ${mesh.position.z.toFixed(1)})<br>
                <strong>ID:</strong> ${mesh.userData.id}
            `;
        }
    }
    
    showTooltip(message, duration = 2000) {
        // 移除现有的提示
        const existingTooltip = document.getElementById('tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // 创建新的提示
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            animation: fadeInOut ${duration}ms ease-in-out;
        `;
        
        // 添加CSS动画
        if (!document.getElementById('tooltip-style')) {
            const style = document.createElement('style');
            style.id = 'tooltip-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(tooltip);
        
        // 自动移除
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, duration);
    }
    
    handleCuttingClick(intersects) {
        if (intersects.length > 0) {
            const point = intersects[0].point;
            const normal = intersects[0].face.normal.clone();
            normal.transformDirection(intersects[0].object.matrixWorld);
            
            this.createCuttingPlane(point, normal);
            this.enterCuttingConfirmMode();
        } else {
            // 如果没有点击到图形，显示提示
            this.showTooltip('请点击图形表面来创建切割平面', 2000);
        }
    }
    
    handleAttachClick(intersects) {
        if (intersects.length > 0) {
            const point = intersects[0].point;
            const normal = intersects[0].face.normal.clone();
            normal.transformDirection(intersects[0].object.matrixWorld);
            
            this.attachPoint = {
                position: point,
                normal: normal,
                targetMesh: intersects[0].object
            };
            
            // 创建新图形并附着到点击位置
            const shapeType = document.getElementById('shapeSelect').value;
            this.createAttachedShape(shapeType);
        } else {
            // 如果没有点击到图形，显示提示
            this.showTooltip('请点击现有图形表面来附着新图形', 2000);
        }
    }
    
    createCuttingPlane(point, normal) {
        // 标准化法向量
        normal.normalize();
        
        // 创建切割平面
        const plane = new THREE.Plane(normal, -normal.dot(point));
        this.cuttingPlane = plane;
        
        // 创建平面可视化
        const planeGeometry = new THREE.PlaneGeometry(25, 25);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.name = `cuttingPlaneHelper_${this.customClipPlanes.length}`;
        
        // 正确设置平面位置和方向
        planeMesh.position.copy(point);
        
        // 使用四元数来正确设置平面方向
        const up = new THREE.Vector3(0, 0, 1);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(up, normal);
        planeMesh.setRotationFromQuaternion(quaternion);
        
        // 为待确认的切割平面设置特殊名称
        planeMesh.name = `cuttingPlaneHelper_pending`;
        
        this.scene.add(planeMesh);
    }
    
    enterCuttingConfirmMode() {
        if (!this.cuttingPlane) return;
        
        this.pendingCuttingPlane = this.cuttingPlane;
        this.cuttingConfirmMode = true;
        this.cuttingMode = false; // 退出切割模式
        
        // 更新UI显示确认按钮
        this.showCuttingConfirmDialog();
        
        // 临时应用切割预览
        this.previewCutting();
    }
    
    previewCutting() {
        if (!this.pendingCuttingPlane) return;
        
        // 临时应用切割平面到所有图形
        this.shapes.forEach(mesh => {
            if (mesh.material) {
                const allPlanes = [...this.customClipPlanes, this.pendingCuttingPlane];
                mesh.material.clippingPlanes = allPlanes;
                mesh.material.needsUpdate = true;
            }
        });
        
        // 临时应用切割平面到拼合组
        this.combinedShapes.forEach(group => {
            group.traverse(child => {
                if (child.isMesh && child.material) {
                    const allPlanes = [...this.customClipPlanes, this.pendingCuttingPlane];
                    child.material.clippingPlanes = allPlanes;
                    child.material.needsUpdate = true;
                }
            });
        });
    }
    
    // 保留原有的applyCutting方法以兼容其他调用
    applyCutting() {
        this.applyCuttingWithDirection(false);
    }
    
    cancelCutting() {
        // 移除切割平面预览
        if (this.pendingCuttingPlane) {
            // 移除切割平面可视化
            const planeMesh = this.scene.getObjectByName(`cuttingPlaneHelper_pending`);
            if (planeMesh) {
                this.scene.remove(planeMesh);
            }
            
            // 恢复原始材质
            this.shapes.forEach(mesh => {
                if (mesh.material) {
                    mesh.material.clippingPlanes = this.customClipPlanes;
                    mesh.material.needsUpdate = true;
                }
            });
        }
        
        this.exitCuttingConfirmMode();
    }
    
    exitCuttingConfirmMode() {
        this.pendingCuttingPlane = null;
        this.cuttingPlane = null;
        this.cuttingConfirmMode = false;
        this.hideCuttingConfirmDialog();
        
        // 更新切割按钮状态
        const btn = document.getElementById('toggleCutting');
        if (btn) {
            btn.classList.remove('mode-active');
            btn.textContent = '切割工具';
        }
        
        // 恢复鼠标指针
        this.renderer.domElement.style.cursor = 'default';
    }
    
    showCuttingConfirmDialog() {
        // 移除现有的对话框
        this.hideCuttingConfirmDialog();
        
        // 创建确认对话框
        const dialog = document.createElement('div');
        dialog.id = 'cuttingConfirmDialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #007bff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            min-width: 300px;
            text-align: center;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">切割确认</h3>
            <p style="margin: 0 0 20px 0; color: #666;">请选择要保留的部分：</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="keepFrontPart" style="
                    padding: 10px 20px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">保留前半部分</button>
                <button id="keepBackPart" style="
                    padding: 10px 20px;
                    background: #17a2b8;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">保留后半部分</button>
                <button id="cancelCutting" style="
                    padding: 10px 20px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">取消</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 添加事件监听器
        document.getElementById('keepFrontPart').addEventListener('click', () => {
            this.applyCuttingWithDirection(false); // 保留前半部分（不翻转平面）
        });
        
        document.getElementById('keepBackPart').addEventListener('click', () => {
            this.applyCuttingWithDirection(true); // 保留后半部分（翻转平面）
        });
        
        document.getElementById('cancelCutting').addEventListener('click', () => {
            this.cancelCutting();
        });
    }
    
    hideCuttingConfirmDialog() {
        const dialog = document.getElementById('cuttingConfirmDialog');
        if (dialog) {
            dialog.remove();
        }
    }
    
    applyCuttingWithDirection(flipPlane) {
        if (!this.pendingCuttingPlane) return;
        
        let finalPlane = this.pendingCuttingPlane.clone();
        
        if (flipPlane) {
            // 翻转平面法向量以保留另一半
            finalPlane.normal.negate();
            finalPlane.constant = -finalPlane.constant;
        }
        
        // 保存所有图形的切割前状态
        const beforeStates = new Map();
        this.shapes.forEach((mesh, id) => {
            beforeStates.set(id, this.saveShapeState(mesh));
        });
        
        // 对所有图形进行真正的几何切割
        this.shapes.forEach((mesh, id) => {
            this.performGeometryCutting(mesh, finalPlane);
        });
        
        // 对拼合组进行切割
        this.combinedShapes.forEach(group => {
            group.traverse(child => {
                if (child.isMesh) {
                    this.performGeometryCutting(child, finalPlane);
                }
            });
        });
        
        // 保存所有图形的切割后状态并记录历史
        const afterStates = new Map();
        this.shapes.forEach((mesh, id) => {
            afterStates.set(id, this.saveShapeState(mesh));
        });
        
        this.addToHistory({
            type: 'cutting',
            beforeStates: beforeStates,
            afterStates: afterStates,
            cuttingPlane: finalPlane.clone()
        });
        
        // 将切割平面添加到历史记录（用于撤销功能）
        this.customClipPlanes.push(finalPlane);
        
        this.updateCuttingPlanesList();
        this.exitCuttingConfirmMode();
        
        // 检查是否需要自动清除切割平面
        const autoClearCheckbox = document.getElementById('autoClearCuttingPlane');
        if (autoClearCheckbox && autoClearCheckbox.checked) {
            // 延迟清除，让用户看到切割完成的提示
            setTimeout(() => {
                this.clearCuttingPlanesAuto();
            }, 1000);
            this.showTooltip('几何切割已完成，切割平面将自动清除', 2000);
        } else {
            this.showTooltip('几何切割已完成', 1500);
        }
    }
    
    createAttachedShape(shapeType) {
        if (!this.attachPoint) return;
        
        // 先创建一个临时图形来获取尺寸信息
        let tempGeometry;
        switch (shapeType) {
            case 'cube': tempGeometry = new THREE.BoxGeometry(2, 2, 2); break;
            case 'sphere': tempGeometry = new THREE.SphereGeometry(1.5, 32, 32); break;
            case 'cylinder': tempGeometry = new THREE.CylinderGeometry(1, 1, 3, 32); break;
            case 'cone': tempGeometry = new THREE.ConeGeometry(1.5, 3, 32); break;
            case 'pyramid': tempGeometry = new THREE.ConeGeometry(1.5, 3, 4); break;
            case 'torus': tempGeometry = new THREE.TorusGeometry(1.5, 0.5, 16, 100); break;
            case 'dodecahedron': tempGeometry = new THREE.DodecahedronGeometry(1.5); break;
            case 'icosahedron': tempGeometry = new THREE.IcosahedronGeometry(1.5); break;
            default: tempGeometry = new THREE.BoxGeometry(2, 2, 2);
        }
        
        // 计算图形的边界框
        tempGeometry.computeBoundingBox();
        const size = tempGeometry.boundingBox.getSize(new THREE.Vector3());
        
        // 计算附着位置（根据图形尺寸调整偏移）
        const offsetDistance = Math.max(size.x, size.y, size.z) / 2 + 0.5;
        const offset = this.attachPoint.normal.clone().multiplyScalar(offsetDistance);
        const attachPosition = this.attachPoint.position.clone().add(offset);
        
        // 确保附着的图形完全在网格范围内
        const gridSize = 20;
        const margin = 0.5;
        const halfSizeX = size.x / 2;
        const halfSizeY = size.y / 2;
        const halfSizeZ = size.z / 2;
        
        attachPosition.x = Math.max(halfSizeX + margin, Math.min(gridSize - halfSizeX - margin, attachPosition.x));
        attachPosition.y = Math.max(halfSizeY + margin, attachPosition.y);
        attachPosition.z = Math.max(halfSizeZ + margin, Math.min(gridSize - halfSizeZ - margin, attachPosition.z));
        
        // 清理临时几何体
        tempGeometry.dispose();
        
        const newShape = this.createShape(shapeType, attachPosition);
        
        // 记录附着关系
        newShape.userData.attachedTo = this.attachPoint.targetMesh.userData.id;
        newShape.userData.attachPoint = this.attachPoint.position.clone();
        
        this.attachPoint = null;
        this.toggleAttachMode(); // 退出附着模式
        
        this.showTooltip('图形已附着', 1500);
    }
    
    toggleCuttingMode() {
        // 检查是否有图形存在
        if (!this.cuttingPlaneAdjustMode && this.shapes.size === 0) {
            this.showTooltip('请先创建一些图形再使用切割工具', 2000);
            return;
        }
        
        this.cuttingPlaneAdjustMode = !this.cuttingPlaneAdjustMode;
        this.attachMode = false; // 确保只有一个模式激活
        this.cuttingMode = false; // 禁用点击切割模式
        
        const btn = document.getElementById('toggleCutting');
        const controls = document.getElementById('cuttingPlaneControls');
        
        if (btn && controls) {
            if (this.cuttingPlaneAdjustMode) {
                btn.classList.add('mode-active');
                btn.textContent = '退出切割调整';
                controls.style.display = 'block';
                this.initializeCuttingPlane();
                this.showTooltip('切割平面调整模式已激活', 2000);
            } else {
                btn.classList.remove('mode-active');
                btn.textContent = '切割工具';
                controls.style.display = 'none';
                this.exitCuttingAdjustMode();
            }
        }
        
        // 更新附着模式按钮状态
        const attachBtn = document.getElementById('toggleAttach');
        if (attachBtn) {
            attachBtn.classList.remove('mode-active');
        }
    }
    
    toggleAttachMode() {
        // 检查是否有图形存在
        if (!this.attachMode && this.shapes.size === 0) {
            this.showTooltip('请先创建一些图形再使用附着工具', 2000);
            return;
        }
        
        this.attachMode = !this.attachMode;
        this.cuttingMode = false; // 确保只有一个模式激活
        this.moveMode = false; // 确保只有一个模式激活
        
        const btn = document.getElementById('toggleAttach');
        if (btn) {
            btn.textContent = this.attachMode ? '退出附着模式' : '附着工具';
            if (this.attachMode) {
                btn.classList.add('mode-active');
            } else {
                btn.classList.remove('mode-active');
            }
        }
        
        // 更新其他模式按钮状态
        this.updateModeButtons();
        
        // 更新鼠标指针
        this.renderer.domElement.style.cursor = this.attachMode ? 'copy' : 'default';
        
        // 如果退出附着模式，清理附着点
        if (!this.attachMode && this.attachPoint) {
            this.attachPoint = null;
        }
        
        // 显示模式提示
        if (this.attachMode) {
            this.showTooltip('附着模式已激活，点击现有图形表面添加新图形', 3000);
        }
    }
    
    toggleMoveMode() {
         // 检查是否有图形存在
         if (!this.moveMode && this.shapes.size === 0) {
             this.showTooltip('请先创建一些图形再使用移动模式', 2000);
             return;
         }
         
         this.moveMode = !this.moveMode;
         this.cuttingMode = false; // 确保只有一个模式激活
         this.attachMode = false; // 确保只有一个模式激活
         
         const btn = document.getElementById('toggleMove');
         if (btn) {
             btn.textContent = this.moveMode ? '退出移动模式' : '移动模式';
             if (this.moveMode) {
                 btn.classList.add('mode-active');
             } else {
                 btn.classList.remove('mode-active');
             }
         }
         
         // 更新其他模式按钮状态
         this.updateModeButtons();
         
         // 更新鼠标指针
         this.renderer.domElement.style.cursor = this.moveMode ? 'move' : 'default';
         
         // 控制轨道控制器状态
         if (this.moveMode) {
             // 进入移动模式时禁用轨道控制器
             this.controls.enabled = false;
             this.showTooltip('移动模式已激活：拖拽图形进行移动，观察视角保持不变', 3000);
         } else {
             // 退出移动模式时重新启用轨道控制器
             this.controls.enabled = true;
             this.showTooltip('移动模式已退出，观察视角控制已恢复', 2000);
         }     
    }
    
    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        
        if (this.gridHelper) {
            this.gridHelper.visible = this.gridVisible;
        }
        
        if (this.axesHelper) {
            this.axesHelper.visible = this.gridVisible;
        }
        
        const btn = document.getElementById('toggleGrid');
        if (btn) {
            btn.textContent = this.gridVisible ? '隐藏网格' : '显示网格';
        }
        
        this.showTooltip(this.gridVisible ? '网格已显示' : '网格已隐藏', 1500);
    }
    
    updateModeButtons() {
        // 更新切割模式按钮
        const cuttingBtn = document.getElementById('toggleCutting');
        if (cuttingBtn && !this.cuttingMode) {
            cuttingBtn.classList.remove('mode-active');
            cuttingBtn.textContent = '切割工具';
        }
        
        // 更新附着模式按钮
        const attachBtn = document.getElementById('toggleAttach');
        if (attachBtn && !this.attachMode) {
            attachBtn.classList.remove('mode-active');
            attachBtn.textContent = '附着工具';
        }
        
        // 更新移动模式按钮
        const moveBtn = document.getElementById('toggleMove');
        if (moveBtn && !this.moveMode) {
            moveBtn.classList.remove('mode-active');
            moveBtn.textContent = '移动模式';
        }
    }
    
    clearCuttingPlanes() {
        // 显示警告信息
        if (this.customClipPlanes.length > 0) {
            const confirmed = confirm('注意：已应用的几何切割是永久性的，清除切割平面记录不会恢复已被切割的图形。是否继续？');
            if (!confirmed) {
                return;
            }
        }
        
        // 移除所有自定义切割平面记录
        this.customClipPlanes = [];
        this.cuttingPlane = null;
        
        // 移除所有切割平面可视化
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (child.name && child.name.startsWith('cuttingPlaneHelper')) {
                objectsToRemove.push(child);
            }
        });
        objectsToRemove.forEach(obj => this.scene.remove(obj));
        
        this.updateCuttingPlanesList();
        this.showTooltip('切割平面记录已清除（已切割的几何体保持不变）', 2000);
    }
    
    clearCuttingPlanesAuto() {
        // 自动清除切割平面，不显示确认对话框
        // 移除所有自定义切割平面记录
        this.customClipPlanes = [];
        this.cuttingPlane = null;
        
        // 移除所有切割平面可视化
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (child.name && child.name.startsWith('cuttingPlaneHelper')) {
                objectsToRemove.push(child);
            }
        });
        objectsToRemove.forEach(obj => this.scene.remove(obj));
        
        this.updateCuttingPlanesList();
        this.showTooltip('切割平面已自动清除', 1000);
    }
    
    updateCuttingPlanesList() {
        const list = document.getElementById('cuttingPlanesList');
        if (list) {
            list.innerHTML = '';
            this.customClipPlanes.forEach((plane, index) => {
                const item = document.createElement('div');
                item.className = 'cutting-plane-item';
                item.innerHTML = `
                    <span>切割平面 #${index + 1}</span>
                    <button onclick="viewer.removeCuttingPlane(${index})">删除</button>
                `;
                list.appendChild(item);
            });
        }
    }
    
    removeCuttingPlane(index) {
        if (index >= 0 && index < this.customClipPlanes.length) {
            const confirmed = confirm('注意：删除切割平面记录不会恢复已被切割的图形几何体。是否继续？');
            if (!confirmed) {
                return;
            }
            
            this.customClipPlanes.splice(index, 1);
            this.updateCuttingPlanesList();
            this.showTooltip('切割平面记录已删除（已切割的几何体保持不变）', 2000);
        }
    }
    
    createShape(shapeType, position = null) {
        let geometry;
        let shapeHeight = 2; // 默认高度
        
        switch (shapeType) {
            case 'cube':
                geometry = new THREE.BoxGeometry(2, 2, 2);
                shapeHeight = 2;
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(1.5, 32, 32);
                shapeHeight = 3; // 直径
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(1, 1, 3, 32);
                shapeHeight = 3;
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(1.5, 3, 32);
                shapeHeight = 3;
                break;
            case 'pyramid':
                geometry = new THREE.ConeGeometry(1.5, 3, 4);
                shapeHeight = 3;
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(1.5, 0.5, 16, 100);
                shapeHeight = 1; // 环面高度较小
                break;
            case 'dodecahedron':
                geometry = new THREE.DodecahedronGeometry(1.5);
                shapeHeight = 3; // 近似高度
                break;
            case 'icosahedron':
                geometry = new THREE.IcosahedronGeometry(1.5);
                shapeHeight = 3; // 近似高度
                break;
            default:
                geometry = new THREE.BoxGeometry(2, 2, 2);
                shapeHeight = 2;
        }
        
        // 如果没有指定位置，计算安全的默认位置
        if (!position) {
            // 确保图形底部不低于网格，顶部不超出合理范围
            const safeY = Math.max(shapeHeight / 2, 1); // 至少离地面1单位
            // 在网格中心附近随机放置，避免重叠
            const offsetX = (Math.random() - 0.5) * 6; // -3到3的随机偏移
            const offsetZ = (Math.random() - 0.5) * 6; // -3到3的随机偏移
            position = new THREE.Vector3(10 + offsetX, safeY, 10 + offsetZ);
            
            // 确保位置在网格范围内（留出边距）
            position.x = Math.max(2, Math.min(18, position.x));
            position.z = Math.max(2, Math.min(18, position.z));
        }
        
        const material = this.createMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // 添加用户数据
        mesh.userData = {
            id: ++this.shapeCounter,
            type: shapeType,
            created: new Date().toLocaleTimeString(),
            originalScale: mesh.scale.clone(), // 保存原始缩放值
            isRainbow: material.userData && material.userData.isRainbow // 标记是否为彩虹颜色
        };
        
        // 应用所有切割平面
        mesh.material.clippingPlanes = this.customClipPlanes;
        
        this.shapes.set(mesh.userData.id, mesh);
        this.scene.add(mesh);
        
        // 如果当前是线框模式，为新图形创建线框
        if (this.wireframeMode) {
            this.createWireframeForMesh(mesh, mesh.userData.id);
        }
        
        // 记录操作历史
        this.addToHistory('create', { shapeId: mesh.userData.id, type: shapeType, position });
        
        this.updateShapesList();
        return mesh;
    }
    
    createMaterial() {
        const colorSelect = document.getElementById('colorSelect');
        const selectedColor = colorSelect.value;
        
        let color;
        switch (selectedColor) {
            case 'red': color = 0xff4757; break;
            case 'green': color = 0x2ed573; break;
            case 'purple': color = 0x5352ed; break;
            case 'orange': color = 0xff6348; break;
            case 'rainbow': color = 0x00d2d3; break;
            default: color = 0x3742fa;
        }
        
        let material;
        
        if (this.isMobile) {
            // 移动设备使用简化的材质
            material = new THREE.MeshLambertMaterial({
                color: color,
                transparent: false, // 关闭透明度以提高性能
                opacity: 1.0,
                side: THREE.FrontSide, // 只渲染正面
                flatShading: true // 使用平面着色减少计算
            });
        } else {
            // 桌面设备使用高质量材质
            material = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.1,
                roughness: 0.3,
                transparent: true,
                opacity: 0.95,
                side: THREE.DoubleSide,
                flatShading: false, // 确保平滑着色
                vertexColors: false,
                envMapIntensity: 0.5
            });
        }
        
        if (selectedColor === 'rainbow') {
            material.color = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
            material.userData = { isRainbow: true };
        }
        
        return material;
    }
    
    // 批量更新所有图形颜色的方法
    updateAllShapesColor(colorValue) {
        this.shapes.forEach((mesh, id) => {
            if (mesh && mesh.material) {
                mesh.material.color.setHex(parseInt(colorValue.replace('#', '0x')));
            }
        });
        this.showTooltip('已更新所有图形的颜色', 1500);
    }
    
    // 移除了截面控制功能
    
    toggleWireframe() {
        this.wireframeMode = !this.wireframeMode;
        
        if (this.wireframeMode) {
            this.createAdvancedWireframes();
            this.showTooltip(`已启用${this.getWireframeStyleName()}线框模式`, 1500);
        } else {
            this.removeAdvancedWireframes();
            this.showTooltip('已关闭线框模式', 1500);
        }
        
        // 更新按钮文本
        const btn = document.getElementById('toggleWireframe');
        if (btn) {
            btn.textContent = this.wireframeMode ? '关闭线框' : '线框模式';
        }
    }
    
    getWireframeStyleName() {
        const styleNames = {
            'classic': '经典',
            'edges': '边缘',
            'enhanced': '增强'
        };
        return styleNames[this.wireframeStyle] || '经典';
    }
    
    createAdvancedWireframes() {
        this.shapes.forEach((mesh, id) => {
            this.createWireframeForMesh(mesh, id);
        });
    }
    
    createWireframeForMesh(mesh, id) {
        // 移除现有的线框
        this.removeWireframeForMesh(id);
        
        let wireframeObject;
        
        switch (this.wireframeStyle) {
            case 'edges':
                wireframeObject = this.createEdgeWireframe(mesh);
                break;
            case 'enhanced':
                wireframeObject = this.createEnhancedWireframe(mesh);
                break;
            default: // classic
                wireframeObject = this.createClassicWireframe(mesh);
                break;
        }
        
        if (wireframeObject) {
            // 同步位置、旋转和缩放
            wireframeObject.position.copy(mesh.position);
            wireframeObject.rotation.copy(mesh.rotation);
            wireframeObject.scale.copy(mesh.scale);
            
            this.scene.add(wireframeObject);
            this.wireframeObjects.set(id, wireframeObject);
        }
    }
    
    createClassicWireframe(mesh) {
        // 经典线框模式 - 使用原始材质的wireframe属性
        mesh.material.wireframe = true;
        return null; // 不需要额外对象
    }
    
    createEdgeWireframe(mesh) {
        // 边缘线框模式 - 使用EdgeGeometry创建清晰的边缘线
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        return new THREE.LineSegments(edges, lineMaterial);
    }
    
    createEnhancedWireframe(mesh) {
        // 增强线框模式 - 结合边缘线和半透明填充
        const group = new THREE.Group();
        
        // 创建边缘线
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x2c3e50,
            linewidth: 3
        });
        const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
        
        // 创建半透明填充
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: mesh.material.color.clone(),
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const fillMesh = new THREE.Mesh(mesh.geometry.clone(), fillMaterial);
        
        group.add(edgeLines);
        group.add(fillMesh);
        
        // 隐藏原始网格
        mesh.visible = false;
        
        return group;
    }
    
    removeAdvancedWireframes() {
        // 恢复所有图形的原始状态
        this.shapes.forEach((mesh, id) => {
            // 恢复原始材质
            if (mesh.material) {
                mesh.material.wireframe = false;
            }
            mesh.visible = true;
            
            // 移除线框对象
            this.removeWireframeForMesh(id);
        });
    }
    
    removeWireframeForMesh(id) {
        const wireframeObject = this.wireframeObjects.get(id);
        if (wireframeObject) {
            this.scene.remove(wireframeObject);
            this.wireframeObjects.delete(id);
        }
    }
    
    cycleWireframeStyle() {
        const styles = ['classic', 'edges', 'enhanced'];
        const currentIndex = styles.indexOf(this.wireframeStyle);
        this.wireframeStyle = styles[(currentIndex + 1) % styles.length];
        
        // 如果当前是线框模式，重新创建线框
        if (this.wireframeMode) {
            this.removeAdvancedWireframes();
            this.createAdvancedWireframes();
            this.showTooltip(`已切换到${this.getWireframeStyleName()}线框样式`, 1500);
        }
    }
    
    syncWireframeTransform(shapeId) {
        const mesh = this.shapes.get(shapeId);
        const wireframeObject = this.wireframeObjects.get(shapeId);
        
        if (mesh && wireframeObject) {
            // 同步位置、旋转和缩放
            wireframeObject.position.copy(mesh.position);
            wireframeObject.rotation.copy(mesh.rotation);
            wireframeObject.scale.copy(mesh.scale);
        }
    }
    
    updateShapeColor(shapeId, colorValue) {
        const mesh = this.shapes.get(shapeId);
        if (mesh && mesh.material) {
            // 将颜色值转换为THREE.Color
            mesh.material.color.setHex(parseInt(colorValue.replace('#', '0x')));
            
            // 清除彩虹标记，因为用户手动设置了颜色
            mesh.userData.isRainbow = false;
            
            // 如果是选中的图形，显示提示
            if (this.selectedShape === mesh) {
                this.showTooltip(`已更新图形 #${shapeId} 的颜色`, 1500);
            }
            
            // 更新图形列表显示
            this.updateShapesList();
        }
    }
    
    setShapeRainbow(shapeId) {
        const mesh = this.shapes.get(shapeId);
        if (mesh && mesh.material) {
            // 切换彩虹状态
            mesh.userData.isRainbow = !mesh.userData.isRainbow;
            
            if (mesh.userData.isRainbow) {
                // 设置为彩虹颜色，初始化一个随机的HSL颜色
                mesh.material.color.setHSL(Math.random(), 0.7, 0.6);
                this.showTooltip(`图形 #${shapeId} 已设置为彩虹颜色`, 1500);
            } else {
                // 取消彩虹，设置为默认蓝色
                mesh.material.color.setHex(0x3742fa);
                this.showTooltip(`图形 #${shapeId} 已取消彩虹颜色`, 1500);
            }
            
            // 更新图形列表显示
            this.updateShapesList();
        }
    }
    
    removeShape(shapeId) {
        const mesh = this.shapes.get(shapeId);
        if (mesh) {
            this.scene.remove(mesh);
            this.shapes.delete(shapeId);
            
            // 移除对应的线框对象
            this.removeWireframeForMesh(shapeId);
            
            if (this.selectedShape === mesh) {
                this.deselectShape();
            }
            
            // 记录操作历史
            this.addToHistory('remove', { shapeId, mesh: mesh.clone() });
            this.updateShapesList();
        }
    }
    
    duplicateShape() {
        if (this.selectedShape) {
            // 计算原图形的边界框
            const originalBox = new THREE.Box3().setFromObject(this.selectedShape);
            const originalSize = originalBox.getSize(new THREE.Vector3());
            
            // 尝试在右侧放置，如果空间不够则尝试其他方向
            const gridSize = 20;
            const margin = 0.5;
            let offset = new THREE.Vector3(originalSize.x + 1, 0, 0); // 右侧
            let newPosition = this.selectedShape.position.clone().add(offset);
            
            // 检查右侧是否有足够空间
            if (newPosition.x + originalSize.x/2 + margin > gridSize) {
                // 尝试左侧
                offset = new THREE.Vector3(-(originalSize.x + 1), 0, 0);
                newPosition = this.selectedShape.position.clone().add(offset);
                
                if (newPosition.x - originalSize.x/2 - margin < 0) {
                    // 尝试前方
                    offset = new THREE.Vector3(0, 0, originalSize.z + 1);
                    newPosition = this.selectedShape.position.clone().add(offset);
                    
                    if (newPosition.z + originalSize.z/2 + margin > gridSize) {
                        // 尝试后方
                        offset = new THREE.Vector3(0, 0, -(originalSize.z + 1));
                        newPosition = this.selectedShape.position.clone().add(offset);
                        
                        if (newPosition.z - originalSize.z/2 - margin < 0) {
                            // 如果所有方向都不够，就在中心附近随机放置
                            const randomX = (Math.random() - 0.5) * 6;
                            const randomZ = (Math.random() - 0.5) * 6;
                            newPosition = new THREE.Vector3(10 + randomX, this.selectedShape.position.y, 10 + randomZ);
                        }
                    }
                }
            }
            
            // 最终边界检查，确保图形完全在网格范围内
            const halfSizeX = originalSize.x / 2;
            const halfSizeZ = originalSize.z / 2;
            newPosition.x = Math.max(halfSizeX + margin, Math.min(gridSize - halfSizeX - margin, newPosition.x));
            newPosition.y = Math.max(originalSize.y / 2, newPosition.y);
            newPosition.z = Math.max(halfSizeZ + margin, Math.min(gridSize - halfSizeZ - margin, newPosition.z));
            
            // 直接克隆当前图形（包括切割后的几何体）
            const newShape = this.selectedShape.clone();
            newShape.material = this.selectedShape.material.clone();
            newShape.geometry = this.selectedShape.geometry.clone();
            
            // 设置新位置
            newShape.position.copy(newPosition);
            
            // 生成新的ID
            this.shapeCounter++;
            const newShapeId = `shape_${this.shapeCounter}`;
            newShape.userData.id = newShapeId;
            
            // 添加到场景和shapes映射
            this.scene.add(newShape);
            this.shapes.set(newShapeId, newShape);
            
            // 如果启用了线框模式，为新图形创建线框
            if (this.wireframeMode) {
                this.createWireframeForMesh(newShape, newShapeId);
            }
            
            // 记录到历史
            this.addToHistory('create', {
                shapeId: newShapeId,
                type: newShape.userData.type,
                position: newPosition.clone()
            });
            
            // 更新图形列表
            this.updateShapesList();
            
            this.showTooltip('图形已复制（包含所有修改）', 1500);
        }
    }
    
    addToHistory(action, data) {
        // 清除当前位置之后的历史
        this.operationHistory = this.operationHistory.slice(0, this.historyIndex + 1);
        this.operationHistory.push({ action, data, timestamp: Date.now() });
        this.historyIndex++;
        
        // 限制历史记录数量
        if (this.operationHistory.length > 50) {
            this.operationHistory.shift();
            this.historyIndex--;
        }
    }
    
    // 保存图形状态的辅助方法
    saveShapeState(mesh) {
        return {
            position: mesh.position.clone(),
            rotation: mesh.rotation.clone(),
            scale: mesh.scale.clone(),
            color: mesh.material.color.getHex(),
            geometry: mesh.geometry.clone(),
            userData: JSON.parse(JSON.stringify(mesh.userData))
        };
    }
    
    // 恢复图形状态的辅助方法
    restoreShapeState(mesh, state) {
        mesh.position.copy(state.position);
        mesh.rotation.copy(state.rotation);
        mesh.scale.copy(state.scale);
        mesh.material.color.setHex(state.color);
        mesh.geometry = state.geometry;
        mesh.userData = state.userData;
    }
    
    undo() {
        if (this.historyIndex >= 0) {
            const operation = this.operationHistory[this.historyIndex];
            
            switch (operation.action) {
                case 'create':
                    // 删除创建的图形（不记录到历史中）
                    const mesh = this.shapes.get(operation.data.shapeId);
                    if (mesh) {
                        this.scene.remove(mesh);
                        this.shapes.delete(operation.data.shapeId);
                        this.removeWireframeForMesh(operation.data.shapeId);
                        if (this.selectedShape === mesh) {
                            this.deselectShape();
                        }
                    }
                    break;
                    
                case 'remove':
                    // 重新创建被删除的图形
                    const restoredMesh = operation.data.mesh.clone();
                    restoredMesh.material = restoredMesh.material.clone();
                    this.scene.add(restoredMesh);
                    this.shapes.set(operation.data.shapeId, restoredMesh);
                    if (this.wireframeMode) {
                        this.createWireframeForMesh(restoredMesh, operation.data.shapeId);
                    }
                    break;
                    
                case 'move':
                    // 恢复移动前的位置
                    const moveMesh = this.shapes.get(operation.data.shapeId);
                    if (moveMesh) {
                        moveMesh.position.copy(operation.data.oldPosition);
                    }
                    break;
                    
                case 'scale':
                    // 恢复缩放前的状态
                    const scaleMesh = this.shapes.get(operation.data.shapeId);
                    if (scaleMesh) {
                        scaleMesh.scale.copy(operation.data.oldScale);
                    }
                    break;
                    
                case 'color':
                    // 恢复颜色变化前的状态
                    const colorMesh = this.shapes.get(operation.data.shapeId);
                    if (colorMesh) {
                        colorMesh.material.color.setHex(operation.data.oldColor);
                    }
                    break;
                    
                case 'cut':
                    // 恢复切割前的几何体
                    const cutMesh = this.shapes.get(operation.data.shapeId);
                    if (cutMesh && operation.data.oldGeometry) {
                        cutMesh.geometry = operation.data.oldGeometry.clone();
                    }
                    break;
                    
                case 'transform':
                    // 恢复完整的变换状态
                    const transformMesh = this.shapes.get(operation.data.shapeId);
                    if (transformMesh) {
                        this.restoreShapeState(transformMesh, operation.data.oldState);
                    }
                    break;
            }
            
            this.historyIndex--;
            this.updateShapesList();
            this.showTooltip('已撤销操作', 1000);
        } else {
            this.showTooltip('没有可撤销的操作', 1000);
        }
    }
    
    redo() {
        if (this.historyIndex < this.operationHistory.length - 1) {
            this.historyIndex++;
            const operation = this.operationHistory[this.historyIndex];
            
            switch (operation.action) {
                case 'create':
                    // 重新创建图形
                    const newMesh = this.createShape(operation.data.type, operation.data.position);
                    // 恢复原始ID
                    newMesh.userData.id = operation.data.shapeId;
                    this.shapes.delete(newMesh.userData.id);
                    this.shapes.set(operation.data.shapeId, newMesh);
                    break;
                    
                case 'remove':
                    // 重新删除图形
                    const mesh = this.shapes.get(operation.data.shapeId);
                    if (mesh) {
                        this.scene.remove(mesh);
                        this.shapes.delete(operation.data.shapeId);
                        this.removeWireframeForMesh(operation.data.shapeId);
                        if (this.selectedShape === mesh) {
                            this.deselectShape();
                        }
                    }
                    break;
                    
                case 'move':
                    // 重新应用移动
                    const moveMesh = this.shapes.get(operation.data.shapeId);
                    if (moveMesh) {
                        moveMesh.position.copy(operation.data.newPosition);
                    }
                    break;
                    
                case 'scale':
                    // 重新应用缩放
                    const scaleMesh = this.shapes.get(operation.data.shapeId);
                    if (scaleMesh) {
                        scaleMesh.scale.copy(operation.data.newScale);
                    }
                    break;
                    
                case 'color':
                    // 重新应用颜色变化
                    const colorMesh = this.shapes.get(operation.data.shapeId);
                    if (colorMesh) {
                        colorMesh.material.color.setHex(operation.data.newColor);
                    }
                    break;
                    
                case 'cut':
                    // 重新应用切割
                    const cutMesh = this.shapes.get(operation.data.shapeId);
                    if (cutMesh && operation.data.newGeometry) {
                        cutMesh.geometry = operation.data.newGeometry.clone();
                    }
                    break;
                    
                case 'transform':
                    // 重新应用完整的变换状态
                    const transformMesh = this.shapes.get(operation.data.shapeId);
                    if (transformMesh) {
                        this.restoreShapeState(transformMesh, operation.data.newState);
                    }
                    break;
            }
            
            this.updateShapesList();
            this.showTooltip('已重做操作', 1000);
        } else {
            this.showTooltip('没有可重做的操作', 1000);
        }
    }
    
    updateShapesList() {
        const list = document.getElementById('shapesList');
        if (list) {
            list.innerHTML = '';
            this.shapes.forEach((mesh, id) => {
                const item = document.createElement('div');
                item.className = 'shape-item';
                
                // 获取当前图形的颜色
                const currentColor = mesh.material.color.getHexString();
                
                // 检查是否为彩虹颜色
                const isRainbow = mesh.userData.isRainbow;
                const rainbowButtonStyle = isRainbow ? 
                    'background: linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080); color: white;' : 
                    'background: #ddd; color: #666;';
                
                item.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; border: 1px solid #ddd; border-radius: 3px; margin-bottom: 3px;">
                        <span style="cursor: pointer; flex: 1;" onclick="viewer.selectShape(viewer.shapes.get(${id}))">${mesh.userData.type} #${id}</span>
                        <div style="display: flex; align-items: center; gap: 3px;">
                            <input type="color" value="#${currentColor}" 
                                   onchange="viewer.updateShapeColor(${id}, this.value)" 
                                   style="width: 25px; height: 20px; border: none; border-radius: 3px; cursor: pointer;" 
                                   title="选择颜色">
                            <button onclick="viewer.setShapeRainbow(${id})" 
                                    style="padding: 2px 4px; font-size: 10px; border: none; border-radius: 3px; cursor: pointer; ${rainbowButtonStyle}"
                                    title="${isRainbow ? '取消彩虹' : '设为彩虹'}">🌈</button>
                            <button onclick="viewer.removeShape(${id})" 
                                    style="padding: 2px 6px; font-size: 12px; background: #ff4757; color: white; border: none; border-radius: 3px; cursor: pointer;"
                                    title="删除图形">删除</button>
                        </div>
                    </div>
                `;
                list.appendChild(item);
            });
        }
    }
    
    setupEventListeners() {
        // 图形选择 - 移除自动创建，只在点击添加按钮时创建
        // document.getElementById('shapeSelect').addEventListener('change', (e) => {
        //     this.createShape(e.target.value);
        // });
        
        // 移除了截面控制功能
        
        // 初始化旋转按钮
        this.initRotationButtons();
        
        // 初始化精度控制
        this.initPrecisionControls();
        
        // 添加精度模式快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key >= '1' && e.key <= '3') {
                e.preventDefault();
                const precisionMode = document.getElementById('precisionMode');
                if (precisionMode) {
                    const modes = ['standard', 'high', 'ultra'];
                    const modeIndex = parseInt(e.key) - 1;
                    if (modeIndex < modes.length) {
                        precisionMode.value = modes[modeIndex];
                        this.updateSliderSteps();
                        this.updateCuttingPlaneFromControls();
                        const modeNames = ['标准精度', '高精度', '超高精度'];
                        this.showTooltip(`已切换到${modeNames[modeIndex]}模式`, 1500);
                    }
                }
            }
        });
        
        // 初始化帮助按钮
        this.initHelpSystem();
        
        // 线框模式切换
        document.getElementById('toggleWireframe').addEventListener('click', () => {
            this.toggleWireframe();
        });
        
        // 线框样式切换
        document.getElementById('cycleWireframeStyle').addEventListener('click', () => {
            this.cycleWireframeStyle();
        });
        
        // 复制图形
        document.getElementById('duplicateShape').addEventListener('click', () => {
            this.duplicateShape();
        });
        
        // 撤销重做
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redoBtn').addEventListener('click', () => {
            this.redo();
        });
        
        // 清空所有
        document.getElementById('clearAll').addEventListener('click', () => {
            this.shapes.forEach((mesh, id) => {
                this.scene.remove(mesh);
            });
            this.shapes.clear();
            this.deselectShape();
            this.updateShapesList();
        });
        
        // 添加图形
        document.getElementById('addShape').addEventListener('click', () => {
            const shapeType = document.getElementById('shapeSelect').value;
            this.addShape(shapeType);
        });
        
        // 拼合锁定
        document.getElementById('lockCombination').addEventListener('click', () => {
            if (this.isLocked) {
                this.unlockCombination();
            } else {
                this.lockCombination();
            }
        });
        
        // 切割工具
        document.getElementById('toggleCutting').addEventListener('click', () => {
            this.toggleCuttingMode();
        });
        
        // 附着工具
        document.getElementById('toggleAttach').addEventListener('click', () => {
            this.toggleAttachMode();
        });
        
        // 移动模式
        document.getElementById('toggleMove').addEventListener('click', () => {
            this.toggleMoveMode();
        });
        
        // 清除切割平面
        document.getElementById('clearCutting').addEventListener('click', () => {
            this.clearCuttingPlanes();
        });
        
        // 网格显示/隐藏切换
        document.getElementById('toggleGrid').addEventListener('click', () => {
            this.toggleGrid();
        });
        
        // 颜色变化
        document.getElementById('colorSelect').addEventListener('change', () => {
            if (this.selectedShape) {
                const beforeState = this.saveShapeState(this.selectedShape);
                const newMaterial = this.createMaterial();
                this.selectedShape.material = newMaterial;
                
                // 更新图形的彩虹状态
                const colorSelect = document.getElementById('colorSelect');
                this.selectedShape.userData.isRainbow = (colorSelect.value === 'rainbow');
                
                const afterState = this.saveShapeState(this.selectedShape);
                
                this.addToHistory({
                    type: 'color',
                    shapeId: this.selectedShape.userData.id,
                    beforeState: beforeState,
                    afterState: afterState
                });
                
                // 更新图形列表显示
                this.updateShapesList();
            }
        });
        
        // 切割平面控制面板事件监听器
        ['cuttingPosX', 'cuttingPosY', 'cuttingPosZ', 'cuttingNormalX', 'cuttingNormalY', 'cuttingNormalZ'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateCuttingPlaneFromControls();
                });
            }
        });
        
        // 应用切割按钮
        const applyCuttingBtn = document.getElementById('applyCuttingPlane');
        if (applyCuttingBtn) {
            applyCuttingBtn.addEventListener('click', () => {
                this.applyCuttingPlaneFromControls();
            });
        }
        
        // 重置切割平面按钮
        const resetCuttingBtn = document.getElementById('resetCuttingPlane');
        if (resetCuttingBtn) {
            resetCuttingBtn.addEventListener('click', () => {
                this.resetCuttingPlaneControls();
            });
        }
        
        // 快速设置切割方向按钮
        const quickCuttingXBtn = document.getElementById('quickCuttingX');
        if (quickCuttingXBtn) {
            quickCuttingXBtn.addEventListener('click', () => {
                this.setQuickCuttingDirection('x');
            });
        }
        
        const quickCuttingYBtn = document.getElementById('quickCuttingY');
        if (quickCuttingYBtn) {
            quickCuttingYBtn.addEventListener('click', () => {
                this.setQuickCuttingDirection('y');
            });
        }
        
        const quickCuttingZBtn = document.getElementById('quickCuttingZ');
        if (quickCuttingZBtn) {
            quickCuttingZBtn.addEventListener('click', () => {
                this.setQuickCuttingDirection('z');
            });
        }
        
        // 图形大小控制事件监听器
        ['scaleX', 'scaleY', 'scaleZ'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                let scaleStartState = null;
                let scaleTimeout = null;
                
                element.addEventListener('mousedown', () => {
                    if (this.selectedShape) {
                        scaleStartState = this.saveShapeState(this.selectedShape);
                    }
                });
                
                element.addEventListener('input', (e) => {
                    this.updateShapeScale(id, parseFloat(e.target.value));
                    document.getElementById(id + 'Value').textContent = parseFloat(e.target.value).toFixed(1);
                    
                    // 使用防抖技术，在用户停止拖拽500ms后记录历史
                    if (scaleTimeout) {
                        clearTimeout(scaleTimeout);
                    }
                    scaleTimeout = setTimeout(() => {
                        if (this.selectedShape && scaleStartState) {
                            const endState = this.saveShapeState(this.selectedShape);
                            this.addToHistory({
                                type: 'scale',
                                shapeId: this.selectedShape.userData.id,
                                beforeState: scaleStartState,
                                afterState: endState
                            });
                            scaleStartState = null;
                        }
                    }, 500);
                });
            }
        });
        
        // 重置大小按钮
        const resetScaleBtn = document.getElementById('resetScale');
        if (resetScaleBtn) {
            resetScaleBtn.addEventListener('click', () => {
                this.resetShapeScale();
            });
        }
        
        // 等比缩放按钮
        const uniformScaleBtn = document.getElementById('uniformScale');
        if (uniformScaleBtn) {
            uniformScaleBtn.addEventListener('click', () => {
                this.toggleUniformScale();
            });
        }
        
        // 全局颜色控制器
        const applyGlobalColorBtn = document.getElementById('applyGlobalColor');
        if (applyGlobalColorBtn) {
            applyGlobalColorBtn.addEventListener('click', () => {
                const colorPicker = document.getElementById('globalColorPicker');
                if (colorPicker) {
                    this.updateAllShapesColor(colorPicker.value);
                }
            });
        }

        // 配置管理事件监听器
        const saveConfigBtn = document.getElementById('saveConfig');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveCurrentConfiguration();
            });
        }

        // 单个配置文件选择
        const loadSingleConfigBtn = document.getElementById('loadSingleConfig');
        const singleConfigInput = document.getElementById('singleConfigInput');
        if (loadSingleConfigBtn && singleConfigInput) {
            loadSingleConfigBtn.addEventListener('click', () => {
                singleConfigInput.click();
            });

            singleConfigInput.addEventListener('change', (e) => {
                this.loadSingleConfigurationFile(e.target.files[0]);
            });
        }

        // 配置文件夹选择
        const loadConfigFolderBtn = document.getElementById('loadConfigFolder');
        const configFolderInput = document.getElementById('configFolderInput');
        if (loadConfigFolderBtn && configFolderInput) {
            loadConfigFolderBtn.addEventListener('click', () => {
                configFolderInput.click();
            });

            configFolderInput.addEventListener('change', (e) => {
                this.loadConfigurationFiles(e.target.files);
            });
        }

        // 布尔运算事件监听器
        const toggleBooleanBtn = document.getElementById('toggleBoolean');
        if (toggleBooleanBtn) {
            toggleBooleanBtn.addEventListener('click', () => {
                this.toggleBooleanMode();
            });
        }

        const executeBooleanBtn = document.getElementById('executeBoolean');
        if (executeBooleanBtn) {
            executeBooleanBtn.addEventListener('click', () => {
                this.executeBooleanOperation();
            });
        }

        const cancelBooleanBtn = document.getElementById('cancelBoolean');
        if (cancelBooleanBtn) {
            cancelBooleanBtn.addEventListener('click', () => {
                this.cancelBooleanOperation();
            });
        }

        // 最小化按钮事件监听器
        this.setupMinimizeButtons();

    }
    
    // 设置最小化按钮功能
    setupMinimizeButtons() {
        // 控制面板最小化按钮
        const controlsMinimizeBtn = document.getElementById('controlsMinimizeBtn');
        const controlsPanel = document.getElementById('controls');
        
        if (controlsMinimizeBtn && controlsPanel) {
            controlsMinimizeBtn.addEventListener('click', () => {
                controlsPanel.classList.toggle('minimized');
                controlsMinimizeBtn.textContent = controlsPanel.classList.contains('minimized') ? '+' : '−';
                controlsMinimizeBtn.title = controlsPanel.classList.contains('minimized') ? '展开工具栏' : '最小化工具栏';
            });
        }
        
        // 信息面板最小化按钮
        const infoMinimizeBtn = document.getElementById('infoMinimizeBtn');
        const infoPanel = document.getElementById('info');
        
        if (infoMinimizeBtn && infoPanel) {
            infoMinimizeBtn.addEventListener('click', () => {
                infoPanel.classList.toggle('minimized');
                infoMinimizeBtn.textContent = infoPanel.classList.contains('minimized') ? '+' : '−';
                infoMinimizeBtn.title = infoPanel.classList.contains('minimized') ? '展开操作提示' : '最小化操作提示';
            });
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // 性能监控（仅在移动设备上）
        if (this.isMobile && this.adaptiveQuality) {
            this.monitorPerformance();
        }
        
        // 移动设备上减少不必要的更新以提高性能
        if (this.isMobile) {
            // 只在控制器需要更新时才更新
            if (this.controls.enabled && this.controls.autoRotate) {
                this.controls.update();
            }
            
            // 减少彩虹动画频率 - 应用到所有彩虹颜色的图形
        if (!this.rainbowFrameCounter) this.rainbowFrameCounter = 0;
        this.rainbowFrameCounter++;
        if (this.rainbowFrameCounter % 10 === 0) {
            const time = Date.now() * 0.001;
            // 更新所有彩虹颜色的图形
            this.shapes.forEach((mesh) => {
                if (mesh && mesh.material && mesh.userData.isRainbow) {
                    mesh.material.color.setHSL((time * 0.05) % 1, 0.7, 0.6);
                }
            });
        }
            
            // 减少选择框更新频率
            const box = this.scene.getObjectByName('selectionBox');
            if (box && this.selectedShape) {
                if (!this.selectionBoxFrameCounter) this.selectionBoxFrameCounter = 0;
                this.selectionBoxFrameCounter++;
                if (this.selectionBoxFrameCounter % 5 === 0) {
                    box.update();
                }
            }
        } else {
            // 桌面设备保持原有的高频率更新
            this.controls.update();
            
            // 彩虹模式的颜色动画 - 应用到所有彩虹颜色的图形
            const time = Date.now() * 0.001;
            this.shapes.forEach((mesh) => {
                if (mesh && mesh.material && mesh.userData.isRainbow) {
                    mesh.material.color.setHSL((time * 0.1) % 1, 0.7, 0.6);
                }
            });
            
            // 更新选择框
            const box = this.scene.getObjectByName('selectionBox');
            if (box && this.selectedShape) {
                box.update();
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    // 性能监控函数
    monitorPerformance() {
        this.frameCount++;
        const now = Date.now();
        
        // 每秒检查一次FPS
        if (now - this.lastFPSCheck >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastFPSCheck = now;
            
            // 如果FPS低于30，增加低FPS计数
            if (this.currentFPS < 30) {
                this.lowFPSCount++;
                console.log(`低FPS检测: ${this.currentFPS}fps, 连续次数: ${this.lowFPSCount}`);
                
                // 连续3次低FPS，自动降低渲染质量
                if (this.lowFPSCount >= 3) {
                    this.adaptRenderingQuality();
                    this.lowFPSCount = 0; // 重置计数
                }
            } else {
                this.lowFPSCount = 0; // 重置低FPS计数
            }
        }
    }
    
    // 自适应渲染质量调整
    adaptRenderingQuality() {
        console.log('检测到性能问题，自动降低渲染质量');
        
        // 降低像素比
        const currentPixelRatio = this.renderer.getPixelRatio();
        if (currentPixelRatio > 1) {
            this.renderer.setPixelRatio(Math.max(1, currentPixelRatio * 0.8));
            console.log(`像素比降低至: ${this.renderer.getPixelRatio()}`);
        }
        
        // 禁用阴影（如果还未禁用）
        if (this.renderer.shadowMap.enabled) {
            this.renderer.shadowMap.enabled = false;
            console.log('已禁用阴影以提高性能');
        }
        
        // 简化材质
        this.shapes.forEach((mesh) => {
            if (mesh.material && mesh.material.type === 'MeshStandardMaterial') {
                const color = mesh.material.color.clone();
                mesh.material = new THREE.MeshLambertMaterial({
                    color: color,
                    transparent: false,
                    side: THREE.FrontSide,
                    flatShading: true
                });
            }
        });
        
        // 显示性能优化提示
        this.showTooltip('检测到性能问题，已自动优化渲染设置', 3000);
    }

    // 配置管理功能
    saveCurrentConfiguration() {
        try {
            const config = {
                timestamp: new Date().toISOString(),
                shapes: [],
                camera: {
                    position: this.camera.position.toArray(),
                    rotation: this.camera.rotation.toArray(),
                    zoom: this.camera.zoom
                },
                controls: {
                    target: this.controls.target.toArray()
                },
                settings: {
                    wireframeMode: this.wireframeMode,
                    wireframeStyle: this.wireframeStyle,
                    gridVisible: this.gridHelper.visible,
                    shadowsEnabled: this.renderer.shadowMap.enabled
                }
            };

            // 保存所有图形的信息
            this.shapes.forEach((mesh, id) => {
                const shapeData = {
                    id: id,
                    type: mesh.userData.type,
                    position: mesh.position.toArray(),
                    rotation: mesh.rotation.toArray(),
                    scale: mesh.scale.toArray(),
                    color: mesh.material.color.getHex(),
                    visible: mesh.visible,
                    parameters: mesh.userData.parameters || {}
                };
                config.shapes.push(shapeData);
            });

            // 生成文件名
            const timestamp = new Date().toLocaleString('zh-CN').replace(/[\/:]/g, '-');
            const filename = `3D配置_${timestamp}.json`;

            // 创建下载链接
            const dataStr = JSON.stringify(config, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            
            URL.revokeObjectURL(url);
            
            this.showTooltip(`配置已保存为: ${filename}`, 2000);
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showTooltip('保存配置失败，请重试', 2000);
        }
    }

    // 加载单个配置文件
    loadSingleConfigurationFile(file) {
        if (!file) return;

        const configList = document.getElementById('configList');
        const configListGroup = document.getElementById('configListGroup');
        if (!configList || !configListGroup) return;

        // 清空现有列表
        configList.innerHTML = '';
        this.configFiles.clear();

        if (!file.name.endsWith('.json')) {
            this.showTooltip('请选择JSON格式的配置文件', 1500);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                this.configFiles.set(file.name, config);
                this.addConfigToList(file.name, config, '');
                configListGroup.style.display = 'block';
                this.showTooltip(`成功加载配置文件: ${file.name}`, 2000);
            } catch (error) {
                console.error(`解析配置文件 ${file.name} 失败:`, error);
                this.showTooltip('配置文件格式错误，请检查文件内容', 2000);
            }
        };
        reader.readAsText(file);
    }

    // 加载配置文件夹（支持子文件夹结构）
    loadConfigurationFiles(files) {
        if (!files || files.length === 0) return;

        const configList = document.getElementById('configList');
        const configListGroup = document.getElementById('configListGroup');
        if (!configList || !configListGroup) return;

        // 清空现有列表
        configList.innerHTML = '';
        this.configFiles.clear();

        // 处理每个文件，按文件夹结构组织
        let loadedCount = 0;
        const jsonFiles = Array.from(files).filter(file => file.name.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
            this.showTooltip('未找到JSON配置文件', 1500);
            return;
        }

        // 按文件夹路径分组
        const filesByFolder = new Map();
        jsonFiles.forEach(file => {
            const pathParts = file.webkitRelativePath.split('/');
            const folderPath = pathParts.slice(0, -1).join('/') || '根目录';
            
            if (!filesByFolder.has(folderPath)) {
                filesByFolder.set(folderPath, []);
            }
            filesByFolder.get(folderPath).push(file);
        });

        // 存储所有配置数据，用于分组显示
        const allConfigs = [];
        
        // 按文件夹分组加载
        filesByFolder.forEach((files, folderPath) => {
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const config = JSON.parse(e.target.result);
                        const uniqueKey = folderPath !== '根目录' ? `${folderPath}/${file.name}` : file.name;
                        this.configFiles.set(uniqueKey, config);
                        
                        allConfigs.push({
                            filename: file.name,
                            config: config,
                            folderPath: folderPath,
                            uniqueKey: uniqueKey
                        });
                        
                        loadedCount++;
                        
                        // 当所有文件都加载完成时按文件夹分组显示
                        if (loadedCount === jsonFiles.length) {
                            this.displayConfigsByFolder(allConfigs, filesByFolder);
                            configListGroup.style.display = 'block';
                            this.showTooltip(`成功加载 ${loadedCount} 个配置文件，来自 ${filesByFolder.size} 个文件夹`, 2000);
                        }
                    } catch (error) {
                        console.error(`解析配置文件 ${file.name} 失败:`, error);
                        loadedCount++;
                        if (loadedCount === jsonFiles.length && this.configFiles.size > 0) {
                            configListGroup.style.display = 'block';
                        }
                    }
                };
                reader.readAsText(file);
            });
        });

        this.showTooltip(`正在加载 ${jsonFiles.length} 个配置文件...`, 1500);
    }

    // 按文件夹分组显示配置文件
    displayConfigsByFolder(allConfigs, filesByFolder) {
        const configList = document.getElementById('configList');
        if (!configList) return;

        // 按文件夹路径排序
        const sortedFolders = Array.from(filesByFolder.keys()).sort();
        
        sortedFolders.forEach(folderPath => {
            // 如果有多个文件夹，添加文件夹标题
            if (filesByFolder.size > 1) {
                const folderHeader = document.createElement('div');
                folderHeader.className = 'folder-header';
                folderHeader.style.cssText = `
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    padding: 8px 12px;
                    margin: 10px 0 5px 0;
                    border-radius: 5px;
                    border-left: 4px solid #2196f3;
                    font-weight: bold;
                    color: #1565c0;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                
                const folderIcon = folderPath === '根目录' ? '🏠' : '📁';
                const displayPath = folderPath === '根目录' ? '根目录' : folderPath;
                const fileCount = filesByFolder.get(folderPath).length;
                
                folderHeader.innerHTML = `${folderIcon} ${displayPath} <span style="color: #666; font-weight: normal;">(${fileCount} 个文件)</span>`;
                configList.appendChild(folderHeader);
            }
            
            // 添加该文件夹下的配置文件
            const folderConfigs = allConfigs.filter(item => item.folderPath === folderPath);
            folderConfigs.sort((a, b) => a.filename.localeCompare(b.filename));
            
            folderConfigs.forEach(item => {
                this.addConfigToList(item.filename, item.config, item.folderPath, item.uniqueKey);
            });
        });
    }

    addConfigToList(filename, config, folderPath = '', uniqueKey = null) {
        const configList = document.getElementById('configList');
        if (!configList) return;

        const listItem = document.createElement('div');
        listItem.className = 'config-item file-item';
        listItem.style.cssText = `
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            padding: 10px;
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s ease;
        `;
        
        // 鼠标悬停效果
        listItem.addEventListener('mouseenter', () => {
            listItem.style.background = '#e3f2fd';
            listItem.style.borderColor = '#2196f3';
        });
        listItem.addEventListener('mouseleave', () => {
            listItem.style.background = '#f8f9fa';
            listItem.style.borderColor = '#e9ecef';
        });
        
        const timestamp = config.timestamp ? new Date(config.timestamp).toLocaleString('zh-CN') : '未知时间';
        const shapeCount = config.shapes ? config.shapes.length : 0;
        
        // 使用传入的uniqueKey或构建配置键
        const configKey = uniqueKey || (folderPath && folderPath !== '根目录' ? `${folderPath}/${filename}` : filename);
        
        const configInfo = document.createElement('div');
        configInfo.className = 'config-info';
        configInfo.style.flex = '1';
        
        const configName = document.createElement('div');
        configName.className = 'config-name';
        configName.style.cssText = `
            font-weight: 500;
            color: #333;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        configName.innerHTML = `📄 ${filename}`;
        
        const configDetails = document.createElement('div');
        configDetails.className = 'config-details';
        configDetails.style.cssText = `
            font-size: 11px;
            color: #666;
            line-height: 1.3;
        `;
        configDetails.innerHTML = `
            <div>📊 图形数量: ${shapeCount}</div>
            <div>🕒 创建时间: ${timestamp}</div>
        `;
        
        const loadButton = document.createElement('button');
        loadButton.className = 'load-config-btn';
        loadButton.textContent = '加载';
        loadButton.style.cssText = `
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 50px;
        `;
        
        loadButton.addEventListener('mouseenter', () => {
            loadButton.style.background = 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)';
            loadButton.style.transform = 'translateY(-1px)';
        });
        loadButton.addEventListener('mouseleave', () => {
            loadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
            loadButton.style.transform = 'translateY(0)';
        });
        
        loadButton.onclick = () => this.loadConfiguration(configKey);
        
        configInfo.appendChild(configName);
        configInfo.appendChild(configDetails);
        listItem.appendChild(configInfo);
        listItem.appendChild(loadButton);
        configList.appendChild(listItem);
    }

    loadConfiguration(filename) {
        const config = this.configFiles.get(filename);
        if (!config) {
            this.showTooltip('配置文件不存在', 1500);
            return;
        }

        try {
            // 清空当前场景
            this.shapes.forEach((mesh) => {
                this.scene.remove(mesh);
            });
            this.shapes.clear();
            this.deselectShape();

            // 恢复相机位置
            if (config.camera) {
                this.camera.position.fromArray(config.camera.position);
                this.camera.rotation.fromArray(config.camera.rotation);
                if (config.camera.zoom) {
                    this.camera.zoom = config.camera.zoom;
                    this.camera.updateProjectionMatrix();
                }
            }

            // 恢复控制器目标
            if (config.controls && config.controls.target) {
                this.controls.target.fromArray(config.controls.target);
            }

            // 恢复设置
            if (config.settings) {
                if (config.settings.gridVisible !== undefined) {
                    this.gridHelper.visible = config.settings.gridVisible;
                }
                if (config.settings.shadowsEnabled !== undefined) {
                    this.renderer.shadowMap.enabled = config.settings.shadowsEnabled;
                }
                if (config.settings.wireframeMode !== undefined) {
                    this.wireframeMode = config.settings.wireframeMode;
                }
                if (config.settings.wireframeStyle !== undefined) {
                    this.wireframeStyle = config.settings.wireframeStyle;
                }
            }

            // 重建图形
            if (config.shapes) {
                config.shapes.forEach(shapeData => {
                    this.loadShapeFromConfig(shapeData);
                });
            }

            // 更新UI
            this.updateShapesList();
            this.controls.update();
            
            this.showTooltip(`配置 "${filename}" 加载成功`, 2000);
        } catch (error) {
            console.error('加载配置失败:', error);
            this.showTooltip('加载配置失败，请检查文件格式', 2000);
        }
    }

    loadShapeFromConfig(shapeData) {
        try {
            // 创建几何体
            let geometry;
            const params = shapeData.parameters || {};
            
            switch (shapeData.type) {
                case 'cube':
                    geometry = new THREE.BoxGeometry(
                        params.width || 1,
                        params.height || 1,
                        params.depth || 1
                    );
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(
                        params.radius || 0.5,
                        params.widthSegments || 32,
                        params.heightSegments || 16
                    );
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(
                        params.radiusTop || 0.5,
                        params.radiusBottom || 0.5,
                        params.height || 1,
                        params.radialSegments || 32
                    );
                    break;
                case 'cone':
                    geometry = new THREE.ConeGeometry(
                        params.radius || 0.5,
                        params.height || 1,
                        params.radialSegments || 32
                    );
                    break;
                case 'torus':
                    geometry = new THREE.TorusGeometry(
                        params.radius || 0.5,
                        params.tube || 0.2,
                        params.radialSegments || 16,
                        params.tubularSegments || 100
                    );
                    break;
                default:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
            }

            // 创建材质
            const material = this.createMaterial();
            material.color.setHex(shapeData.color || 0x00ff00);

            // 创建网格
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.fromArray(shapeData.position || [0, 0, 0]);
            mesh.rotation.fromArray(shapeData.rotation || [0, 0, 0]);
            mesh.scale.fromArray(shapeData.scale || [1, 1, 1]);
            mesh.visible = shapeData.visible !== undefined ? shapeData.visible : true;
            
            // 设置用户数据
            mesh.userData = {
                id: shapeData.id || this.generateShapeId(),
                type: shapeData.type,
                parameters: params,
                originalScale: mesh.scale.clone()
            };

            // 添加到场景和管理器
            this.scene.add(mesh);
            this.shapes.set(mesh.userData.id, mesh);
            
            // 设置阴影
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
        } catch (error) {
            console.error('加载图形失败:', error);
        }
    }

    generateShapeId() {
        return 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // 图形大小控制方法
    updateShapeScale(axis, value) {
         if (!this.selectedShape) return;
         
         const axisMap = {
             'scaleX': 'x',
             'scaleY': 'y', 
             'scaleZ': 'z'
         };
         
         const scaleAxis = axisMap[axis];
         if (scaleAxis) {
             this.selectedShape.scale[scaleAxis] = value;
             
             // 如果启用了等比缩放模式，同步其他轴
             if (this.uniformScaleMode) {
                 this.selectedShape.scale.x = value;
                 this.selectedShape.scale.y = value;
                 this.selectedShape.scale.z = value;
                 
                 // 更新所有滑块的值
                 ['scaleX', 'scaleY', 'scaleZ'].forEach(id => {
                     const slider = document.getElementById(id);
                     const valueDisplay = document.getElementById(id + 'Value');
                     if (slider && valueDisplay) {
                         slider.value = value;
                         valueDisplay.textContent = value.toFixed(1);
                     }
                 });
             }
             
             // 检查图形是否超出网格边界并动态调整网格
             this.checkAndUpdateGrid();
             
             // 更新保存的缩放值，确保移动和复制时保持当前大小
             this.selectedShape.userData.originalScale = this.selectedShape.scale.clone();
             
             // 同步线框对象的缩放
             this.syncWireframeTransform(this.selectedShape.userData.id);
         }
     }
    
    resetShapeScale() {
         if (!this.selectedShape) return;
         
         // 重置图形缩放为1
         this.selectedShape.scale.set(1, 1, 1);
         
         // 更新保存的缩放值
         this.selectedShape.userData.originalScale = this.selectedShape.scale.clone();
         
         // 更新滑块值
         ['scaleX', 'scaleY', 'scaleZ'].forEach(id => {
             const slider = document.getElementById(id);
             const valueDisplay = document.getElementById(id + 'Value');
             if (slider && valueDisplay) {
                 slider.value = 1;
                 valueDisplay.textContent = '1.0';
             }
         });
         
         // 同步线框对象的缩放
         this.syncWireframeTransform(this.selectedShape.userData.id);
     }
    
    toggleUniformScale() {
        this.uniformScaleMode = !this.uniformScaleMode;
        
        const btn = document.getElementById('uniformScale');
        if (btn) {
            if (this.uniformScaleMode) {
                btn.style.background = '#28a745';
                btn.textContent = '等比模式';
                
                // 如果有选中的图形，将所有轴设置为X轴的值
                if (this.selectedShape) {
                    const currentScale = this.selectedShape.scale.x;
                    this.selectedShape.scale.set(currentScale, currentScale, currentScale);
                    
                    ['scaleX', 'scaleY', 'scaleZ'].forEach(id => {
                        const slider = document.getElementById(id);
                        const valueDisplay = document.getElementById(id + 'Value');
                        if (slider && valueDisplay) {
                            slider.value = currentScale;
                            valueDisplay.textContent = currentScale.toFixed(1);
                        }
                    });
                }
            } else {
                btn.style.background = '#17a2b8';
                btn.textContent = '等比缩放';
            }
         }
     }
     
     // 显示图形大小控制面板
     showShapeSizeControls(mesh) {
         const controls = document.getElementById('shapeSizeControls');
         if (controls) {
             controls.style.display = 'block';
             
             // 更新滑块值为当前图形的缩放值
             const scaleValues = {
                 'scaleX': mesh.scale.x,
                 'scaleY': mesh.scale.y,
                 'scaleZ': mesh.scale.z
             };
             
             Object.entries(scaleValues).forEach(([id, value]) => {
                 const slider = document.getElementById(id);
                 const valueDisplay = document.getElementById(id + 'Value');
                 if (slider && valueDisplay) {
                     slider.value = value;
                     valueDisplay.textContent = value.toFixed(1);
                 }
             });
         }
     }
     
     // 隐藏图形大小控制面板
     hideShapeSizeControls() {
         const controls = document.getElementById('shapeSizeControls');
         if (controls) {
             controls.style.display = 'none';
         }
     }
     
     // 检查图形边界并动态调整网格大小
     checkAndUpdateGrid() {
         if (!this.selectedShape) return;
         
         // 计算图形的实际边界框
         const box = new THREE.Box3().setFromObject(this.selectedShape);
         const size = box.getSize(new THREE.Vector3());
         const center = box.getCenter(new THREE.Vector3());
         
         // 计算需要的最小网格大小（添加一些边距）
         const margin = 5;
         const maxX = Math.max(Math.abs(center.x) + size.x/2 + margin, 20);
         const maxZ = Math.max(Math.abs(center.z) + size.z/2 + margin, 20);
         const requiredGridSize = Math.max(maxX, maxZ) * 2;
         
         // 获取当前网格
         const currentGrid = this.scene.children.find(child => child.type === 'GridHelper');
         if (currentGrid) {
             const currentSize = currentGrid.geometry.parameters ? currentGrid.geometry.parameters.size : 20;
             
             // 如果需要更大的网格，则更新
             if (requiredGridSize > currentSize) {
                 this.updateGridSize(requiredGridSize);
             }
         }
     }
     
     // 更新网格大小
     updateGridSize(newSize) {
         // 移除现有网格
         const existingGrid = this.scene.children.find(child => child.type === 'GridHelper');
         if (existingGrid) {
             this.scene.remove(existingGrid);
         }
         
         // 创建新的更大网格
         const divisions = Math.max(40, Math.floor(newSize / 0.5));
         const gridHelper = new THREE.GridHelper(newSize, divisions, 0x444444, 0x222222);
         gridHelper.position.set(newSize/2, 0, newSize/2);
         this.scene.add(gridHelper);
         
         // 显示提示信息
          this.showTooltip(`网格已扩大至 ${newSize.toFixed(0)}x${newSize.toFixed(0)} 以适应图形大小`, 2000);
      }
      
      // 执行真正的几何切割
      performGeometryCutting(mesh, cuttingPlane) {
        if (!mesh || !mesh.geometry || !cuttingPlane) return;
        
        // 获取几何体的顶点
        const geometry = mesh.geometry;
        const positionAttribute = geometry.getAttribute('position');
        if (!positionAttribute) return;
        
        // 将切割平面转换到物体的本地坐标系
        const localPlane = cuttingPlane.clone();
        const worldToLocal = mesh.matrixWorld.clone().invert();
        localPlane.applyMatrix4(worldToLocal);
        
        // 创建新的几何体用于存储切割后的结果
        const vertices = [];
        const indices = [];
        const normals = [];
        const uvs = [];
        
        // 获取原始数据
        const positions = positionAttribute.array;
        const originalNormals = geometry.getAttribute('normal')?.array;
        const originalUVs = geometry.getAttribute('uv')?.array;
        const indexAttribute = geometry.getIndex();
        
        // 顶点映射表，用于避免重复顶点
        const vertexMap = new Map();
        let vertexIndex = 0;
        
        const addVertex = (pos, normal, uv) => {
            const key = `${pos.x.toFixed(6)},${pos.y.toFixed(6)},${pos.z.toFixed(6)}`;
            if (vertexMap.has(key)) {
                return vertexMap.get(key);
            }
            
            vertices.push(pos.x, pos.y, pos.z);
            normals.push(normal.x, normal.y, normal.z);
            uvs.push(uv.x, uv.y);
            
            vertexMap.set(key, vertexIndex);
            return vertexIndex++;
        };
        
        if (!indexAttribute) {
            // 处理非索引几何体
            for (let i = 0; i < positions.length; i += 9) {
                const triangle = [
                    new THREE.Vector3(positions[i], positions[i+1], positions[i+2]),
                    new THREE.Vector3(positions[i+3], positions[i+4], positions[i+5]),
                    new THREE.Vector3(positions[i+6], positions[i+7], positions[i+8])
                ];
                
                // 获取原始法向量和UV
                const triangleNormals = originalNormals ? [
                    new THREE.Vector3(originalNormals[i], originalNormals[i+1], originalNormals[i+2]),
                    new THREE.Vector3(originalNormals[i+3], originalNormals[i+4], originalNormals[i+5]),
                    new THREE.Vector3(originalNormals[i+6], originalNormals[i+7], originalNormals[i+8])
                ] : null;
                
                const triangleUVs = originalUVs ? [
                    new THREE.Vector2(originalUVs[i/3*2], originalUVs[i/3*2+1]),
                    new THREE.Vector2(originalUVs[i/3*2+2], originalUVs[i/3*2+3]),
                    new THREE.Vector2(originalUVs[i/3*2+4], originalUVs[i/3*2+5])
                ] : null;
                
                const clippedTriangles = this.clipTriangleByPlaneAdvanced(triangle, localPlane, triangleNormals, triangleUVs);
                
                clippedTriangles.forEach(tri => {
                    const idx0 = addVertex(tri.vertices[0], tri.normals[0], tri.uvs[0]);
                    const idx1 = addVertex(tri.vertices[1], tri.normals[1], tri.uvs[1]);
                    const idx2 = addVertex(tri.vertices[2], tri.normals[2], tri.uvs[2]);
                    indices.push(idx0, idx1, idx2);
                });
            }
        } else {
            // 处理索引几何体
            const indexArray = indexAttribute.array;
            
            for (let i = 0; i < indexArray.length; i += 3) {
                const i1 = indexArray[i];
                const i2 = indexArray[i + 1];
                const i3 = indexArray[i + 2];
                
                const triangle = [
                    new THREE.Vector3(positions[i1*3], positions[i1*3+1], positions[i1*3+2]),
                    new THREE.Vector3(positions[i2*3], positions[i2*3+1], positions[i2*3+2]),
                    new THREE.Vector3(positions[i3*3], positions[i3*3+1], positions[i3*3+2])
                ];
                
                // 获取原始法向量和UV
                const triangleNormals = originalNormals ? [
                    new THREE.Vector3(originalNormals[i1*3], originalNormals[i1*3+1], originalNormals[i1*3+2]),
                    new THREE.Vector3(originalNormals[i2*3], originalNormals[i2*3+1], originalNormals[i2*3+2]),
                    new THREE.Vector3(originalNormals[i3*3], originalNormals[i3*3+1], originalNormals[i3*3+2])
                ] : null;
                
                const triangleUVs = originalUVs ? [
                    new THREE.Vector2(originalUVs[i1*2], originalUVs[i1*2+1]),
                    new THREE.Vector2(originalUVs[i2*2], originalUVs[i2*2+1]),
                    new THREE.Vector2(originalUVs[i3*2], originalUVs[i3*2+1])
                ] : null;
                
                const clippedTriangles = this.clipTriangleByPlaneAdvanced(triangle, localPlane, triangleNormals, triangleUVs);
                
                clippedTriangles.forEach(tri => {
                    const idx0 = addVertex(tri.vertices[0], tri.normals[0], tri.uvs[0]);
                    const idx1 = addVertex(tri.vertices[1], tri.normals[1], tri.uvs[1]);
                    const idx2 = addVertex(tri.vertices[2], tri.normals[2], tri.uvs[2]);
                    indices.push(idx0, idx1, idx2);
                });
            }
        }
        
        // 生成切割面
        const capVertices = [];
        const capIndices = [];
        const capNormals = [];
        const capUVs = [];
        
        // 收集所有在切割平面上的边
        const edgesOnPlane = [];
        
        // 重新遍历原始三角形，找到与平面相交的边
        if (!indexAttribute) {
            for (let i = 0; i < positions.length; i += 9) {
                const triangle = [
                    new THREE.Vector3(positions[i], positions[i+1], positions[i+2]),
                    new THREE.Vector3(positions[i+3], positions[i+4], positions[i+5]),
                    new THREE.Vector3(positions[i+6], positions[i+7], positions[i+8])
                ];
                
                this.findPlaneIntersectionEdges(triangle, localPlane, edgesOnPlane);
            }
        } else {
            const indexArray = indexAttribute.array;
            for (let i = 0; i < indexArray.length; i += 3) {
                const i1 = indexArray[i];
                const i2 = indexArray[i + 1];
                const i3 = indexArray[i + 2];
                
                const triangle = [
                    new THREE.Vector3(positions[i1*3], positions[i1*3+1], positions[i1*3+2]),
                    new THREE.Vector3(positions[i2*3], positions[i2*3+1], positions[i2*3+2]),
                    new THREE.Vector3(positions[i3*3], positions[i3*3+1], positions[i3*3+2])
                ];
                
                this.findPlaneIntersectionEdges(triangle, localPlane, edgesOnPlane);
            }
        }
        
        // 如果有足够的边，尝试生成切割面
        if (edgesOnPlane.length >= 3) {
            const capGeometry = this.generateCapGeometry(edgesOnPlane, localPlane);
            if (capGeometry.vertices.length > 0) {
                const capStartIndex = vertices.length / 3;
                
                // 添加切割面顶点
                capGeometry.vertices.forEach(vertex => {
                    vertices.push(vertex.x, vertex.y, vertex.z);
                });
                
                // 添加切割面法向量
                capGeometry.normals.forEach(normal => {
                    normals.push(normal.x, normal.y, normal.z);
                });
                
                // 添加切割面UV
                capGeometry.uvs.forEach(uv => {
                    uvs.push(uv.x, uv.y);
                });
                
                // 添加切割面索引
                capGeometry.indices.forEach(index => {
                    indices.push(capStartIndex + index);
                });
            }
        }
        
        // 创建新的几何体
        if (vertices.length > 0) {
            const newGeometry = new THREE.BufferGeometry();
            newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            
            if (indices.length > 0) {
                newGeometry.setIndex(indices);
            }
            
            // 重新计算法向量以获得更平滑的效果
            newGeometry.computeVertexNormals();
            
            // 更新几何体
            mesh.geometry.dispose();
            mesh.geometry = newGeometry;
            mesh.geometry.computeBoundingBox();
            mesh.geometry.computeBoundingSphere();
            
            // 更新材质以获得更好的渲染效果
            if (mesh.material) {
                mesh.material.flatShading = false;
                mesh.material.needsUpdate = true;
            }
        }
    }
      
      // 高级平面裁剪三角形，支持法向量和UV插值
    clipTriangleByPlaneAdvanced(triangle, plane, normals, uvs) {
        const result = [];
        const distances = triangle.map(vertex => plane.distanceToPoint(vertex));
        
        // 根据精度模式动态调整epsilon值
        const precisionMode = document.getElementById('precisionMode')?.value || 'standard';
        let epsilon;
        switch(precisionMode) {
            case 'high': epsilon = 0.00001; break;
            case 'ultra': epsilon = 0.000001; break;
            default: epsilon = 0.0001;
        }
        
        // 检查三角形与平面的关系
        const positiveCount = distances.filter(d => d > epsilon).length;
        const negativeCount = distances.filter(d => d < -epsilon).length;
        
        // 如果三角形完全在平面正面，保留
        if (negativeCount === 0) {
            const triangleNormals = normals || [
                this.calculateTriangleNormal(triangle),
                this.calculateTriangleNormal(triangle),
                this.calculateTriangleNormal(triangle)
            ];
            const triangleUVs = uvs || [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(1, 0),
                new THREE.Vector2(0.5, 1)
            ];
            
            result.push({
                vertices: triangle,
                normals: triangleNormals,
                uvs: triangleUVs
            });
            return result;
        }
        
        // 如果三角形完全在平面负面，丢弃
        if (positiveCount === 0) {
            return result;
        }
        
        // 三角形跨越平面，需要切割
        const positiveVertices = [];
        const positiveNormals = [];
        const positiveUVs = [];
        
        for (let i = 0; i < 3; i++) {
            const current = triangle[i];
            const next = triangle[(i + 1) % 3];
            const currentDist = distances[i];
            const nextDist = distances[(i + 1) % 3];
            
            const currentNormal = normals ? normals[i] : this.calculateTriangleNormal(triangle);
            const nextNormal = normals ? normals[(i + 1) % 3] : this.calculateTriangleNormal(triangle);
            
            const currentUV = uvs ? uvs[i] : new THREE.Vector2(i === 0 ? 0 : i === 1 ? 1 : 0.5, i === 2 ? 1 : 0);
            const nextUV = uvs ? uvs[(i + 1) % 3] : new THREE.Vector2((i + 1) % 3 === 0 ? 0 : (i + 1) % 3 === 1 ? 1 : 0.5, (i + 1) % 3 === 2 ? 1 : 0);
            
            // 如果当前顶点在正面，保留
            if (currentDist >= -epsilon) {
                positiveVertices.push(current.clone());
                positiveNormals.push(currentNormal.clone());
                positiveUVs.push(currentUV.clone());
            }
            
            // 如果边跨越平面，计算交点
            if ((currentDist > epsilon && nextDist < -epsilon) || (currentDist < -epsilon && nextDist > epsilon)) {
                const t = Math.abs(currentDist) / (Math.abs(currentDist) + Math.abs(nextDist));
                
                // 插值顶点
                const intersection = current.clone().lerp(next, t);
                
                // 插值法向量
                const interpolatedNormal = currentNormal.clone().lerp(nextNormal, t).normalize();
                
                // 插值UV
                const interpolatedUV = currentUV.clone().lerp(nextUV, t);
                
                positiveVertices.push(intersection);
                positiveNormals.push(interpolatedNormal);
                positiveUVs.push(interpolatedUV);
            }
        }
        
        // 根据保留的顶点重新构建三角形
        if (positiveVertices.length >= 3) {
            // 三角化多边形
            for (let i = 1; i < positiveVertices.length - 1; i++) {
                result.push({
                    vertices: [
                        positiveVertices[0],
                        positiveVertices[i],
                        positiveVertices[i + 1]
                    ],
                    normals: [
                        positiveNormals[0],
                        positiveNormals[i],
                        positiveNormals[i + 1]
                    ],
                    uvs: [
                        positiveUVs[0],
                        positiveUVs[i],
                        positiveUVs[i + 1]
                    ]
                });
            }
        }
        
        return result;
    }
    
    // 使用平面裁剪三角形（保留旧方法以兼容）
    clipTriangleByPlane(triangle, plane) {
        const advanced = this.clipTriangleByPlaneAdvanced(triangle, plane, null, null);
        return advanced.map(tri => tri.vertices);
    }
      
      // 计算三角形法向量
      calculateTriangleNormal(triangle) {
          const v1 = triangle[1].clone().sub(triangle[0]);
          const v2 = triangle[2].clone().sub(triangle[0]);
          return v1.cross(v2).normalize();
      }
      
      // 找到三角形与平面相交的边
      findPlaneIntersectionEdges(triangle, plane, edgesOnPlane) {
          const epsilon = 0.0001;
          const distances = triangle.map(vertex => plane.distanceToPoint(vertex));
          
          for (let i = 0; i < 3; i++) {
              const current = triangle[i];
              const next = triangle[(i + 1) % 3];
              const currentDist = distances[i];
              const nextDist = distances[(i + 1) % 3];
              
              // 如果边跨越平面，计算交点
              if ((currentDist > epsilon && nextDist < -epsilon) || (currentDist < -epsilon && nextDist > epsilon)) {
                  const t = Math.abs(currentDist) / (Math.abs(currentDist) + Math.abs(nextDist));
                  const intersection = current.clone().lerp(next, t);
                  edgesOnPlane.push(intersection);
              }
          }
      }
      
      // 生成切割面几何体
      generateCapGeometry(edgePoints, plane) {
          if (edgePoints.length < 3) {
              return { vertices: [], normals: [], uvs: [], indices: [] };
          }
          
          // 移除重复点
          const uniquePoints = [];
          const epsilon = 0.001;
          
          edgePoints.forEach(point => {
              let isDuplicate = false;
              for (let existing of uniquePoints) {
                  if (point.distanceTo(existing) < epsilon) {
                      isDuplicate = true;
                      break;
                  }
              }
              if (!isDuplicate) {
                  uniquePoints.push(point.clone());
              }
          });
          
          if (uniquePoints.length < 3) {
              return { vertices: [], normals: [], uvs: [], indices: [] };
          }
          
          // 计算切割面的中心点
          const center = new THREE.Vector3();
          uniquePoints.forEach(point => center.add(point));
          center.divideScalar(uniquePoints.length);
          
          // 将点投影到平面上并排序
          const planeNormal = plane.normal.clone();
          const u = new THREE.Vector3();
          const v = new THREE.Vector3();
          
          // 创建平面的局部坐标系
          if (Math.abs(planeNormal.x) < 0.9) {
              u.set(1, 0, 0).cross(planeNormal).normalize();
          } else {
              u.set(0, 1, 0).cross(planeNormal).normalize();
          }
          v.crossVectors(planeNormal, u);
          
          // 将3D点转换为2D点并按角度排序
          const points2D = uniquePoints.map(point => {
              const relative = point.clone().sub(center);
              const x = relative.dot(u);
              const y = relative.dot(v);
              const angle = Math.atan2(y, x);
              return { point3D: point, x, y, angle };
          });
          
          points2D.sort((a, b) => a.angle - b.angle);
          
          // 生成三角形扇形
          const vertices = [];
          const normals = [];
          const uvs = [];
          const indices = [];
          
          // 添加中心点
          vertices.push(center);
          normals.push(planeNormal.clone());
          uvs.push(new THREE.Vector2(0.5, 0.5));
          
          // 添加边界点
          points2D.forEach((point2D, index) => {
              vertices.push(point2D.point3D);
              normals.push(planeNormal.clone());
              
              // 生成UV坐标
              const u = (point2D.x + 1) * 0.5;
              const v = (point2D.y + 1) * 0.5;
              uvs.push(new THREE.Vector2(u, v));
          });
          
          // 生成三角形索引
          for (let i = 0; i < points2D.length; i++) {
              const next = (i + 1) % points2D.length;
              indices.push(0, i + 1, next + 1);
          }
          
          return {
              vertices,
              normals,
              uvs,
              indices
          };
      }
      
      // 布尔运算相关方法
      toggleBooleanMode() {
          this.booleanMode = !this.booleanMode;
          const toggleBtn = document.getElementById('toggleBoolean');
          const booleanPanel = document.getElementById('booleanPanel');
          
          if (this.booleanMode) {
              toggleBtn.textContent = '退出布尔运算';
              toggleBtn.style.backgroundColor = '#dc3545';
              booleanPanel.style.display = 'block';
              this.updateBooleanShapesList();
              this.showTooltip('布尔运算模式已启用，请选择两个图形进行运算', 3000);
          } else {
              toggleBtn.textContent = '布尔运算';
              toggleBtn.style.backgroundColor = '#007bff';
              booleanPanel.style.display = 'none';
              this.cancelBooleanOperation();
              this.showTooltip('布尔运算模式已关闭', 1500);
          }
      }
      
      updateBooleanShapesList() {
          const mainShapeSelect = document.getElementById('booleanMainShape');
          const toolShapeSelect = document.getElementById('booleanToolShape');
          
          if (!mainShapeSelect || !toolShapeSelect) return;
          
          // 清空现有选项
          mainShapeSelect.innerHTML = '<option value="">选择主体图形</option>';
          toolShapeSelect.innerHTML = '<option value="">选择工具图形</option>';
          
          // 添加所有图形到选项中
          this.shapes.forEach((mesh, id) => {
              const option1 = document.createElement('option');
              option1.value = id;
              option1.textContent = `图形 ${id} (${mesh.userData.type})`;
              mainShapeSelect.appendChild(option1);
              
              const option2 = document.createElement('option');
              option2.value = id;
              option2.textContent = `图形 ${id} (${mesh.userData.type})`;
              toolShapeSelect.appendChild(option2);
          });
      }
      
      executeBooleanOperation() {
          const mainShapeId = document.getElementById('booleanMainShape')?.value;
          const toolShapeId = document.getElementById('booleanToolShape')?.value;
          const operation = document.getElementById('booleanOperation')?.value || 'subtract';
          
          if (!mainShapeId || !toolShapeId) {
              this.showTooltip('请选择主体图形和工具图形', 2000);
              return;
          }
          
          if (mainShapeId === toolShapeId) {
              this.showTooltip('主体图形和工具图形不能是同一个', 2000);
              return;
          }
          
          // 将字符串ID转换为数字，因为shapes Map使用数字作为键
          const mainShapeNumId = parseInt(mainShapeId);
          const toolShapeNumId = parseInt(toolShapeId);
          
          const mainShape = this.shapes.get(mainShapeNumId);
          const toolShape = this.shapes.get(toolShapeNumId);
          
          if (!mainShape || !toolShape) {
              this.showTooltip('选择的图形不存在', 2000);
              return;
          }
          
          try {
              // 执行布尔运算
              const resultGeometry = this.performBooleanOperation(mainShape.geometry, toolShape.geometry, operation);
              
              if (resultGeometry) {
                  // 创建新的网格
                  const material = mainShape.material.clone();
                  const resultMesh = new THREE.Mesh(resultGeometry, material);
                  
                  // 设置位置为主体图形的位置
                  resultMesh.position.copy(mainShape.position);
                  resultMesh.rotation.copy(mainShape.rotation);
                  resultMesh.scale.copy(mainShape.scale);
                  
                  // 设置用户数据
                  resultMesh.userData = {
                      id: `boolean_${Date.now()}`,
                      type: `${operation}_result`,
                      originalMainShape: mainShapeNumId,
                      originalToolShape: toolShapeNumId,
                      created: new Date().toLocaleTimeString(),
                      originalScale: resultMesh.scale.clone()
                  };
                  
                  // 添加到场景
                  this.scene.add(resultMesh);
                  this.shapes.set(resultMesh.userData.id, resultMesh);
                  
                  // 移除原始图形
                  this.scene.remove(mainShape);
                  this.scene.remove(toolShape);
                  this.shapes.delete(mainShapeNumId);
                  this.shapes.delete(toolShapeNumId);
                  
                  // 选择新图形
                  this.selectShape(resultMesh);
                  
                  // 更新界面
                  this.updateShapesList();
                  this.updateBooleanShapesList();
                  
                  const operationNames = {
                      'subtract': '减法',
                      'union': '并集',
                      'intersect': '交集'
                  };
                  
                  this.showTooltip(`布尔${operationNames[operation]}运算完成`, 2000);
              } else {
                  this.showTooltip('布尔运算失败，请检查图形是否相交', 2000);
              }
          } catch (error) {
              console.error('布尔运算错误:', error);
              this.showTooltip('布尔运算出现错误', 2000);
          }
      }
      
      performBooleanOperation(geometry1, geometry2, operation) {
          // 简化的布尔运算实现
          // 注意：这是一个基础实现，真正的CSG需要更复杂的算法
          
          try {
              // 获取几何体的顶点
              const vertices1 = this.getGeometryVertices(geometry1);
              const vertices2 = this.getGeometryVertices(geometry2);
              
              if (vertices1.length === 0 || vertices2.length === 0) {
                  return null;
              }
              
              let resultVertices = [];
              
              switch (operation) {
                  case 'subtract':
                      // 减法：保留geometry1中不在geometry2内部的部分
                      resultVertices = this.subtractGeometry(vertices1, vertices2);
                      break;
                  case 'union':
                      // 并集：合并两个几何体
                      resultVertices = this.unionGeometry(vertices1, vertices2);
                      break;
                  case 'intersect':
                      // 交集：保留两个几何体重叠的部分
                      resultVertices = this.intersectGeometry(vertices1, vertices2);
                      break;
                  default:
                      return null;
              }
              
              if (resultVertices.length < 9) { // 至少需要3个三角形
                  return null;
              }
              
              // 创建新的几何体
              const resultGeometry = new THREE.BufferGeometry();
              resultGeometry.setAttribute('position', new THREE.Float32BufferAttribute(resultVertices, 3));
              resultGeometry.computeVertexNormals();
              resultGeometry.computeBoundingBox();
              resultGeometry.computeBoundingSphere();
              
              return resultGeometry;
          } catch (error) {
              console.error('布尔运算处理错误:', error);
              return null;
          }
      }
      
      getGeometryVertices(geometry) {
          const vertices = [];
          const position = geometry.attributes.position;
          
          if (position) {
              for (let i = 0; i < position.count; i++) {
                  vertices.push(
                      position.getX(i),
                      position.getY(i),
                      position.getZ(i)
                  );
              }
          }
          
          return vertices;
      }
      
      subtractGeometry(vertices1, vertices2) {
          // 简化的减法实现：移除vertices1中接近vertices2的顶点
          const threshold = 0.5;
          const result = [];
          
          for (let i = 0; i < vertices1.length; i += 9) { // 每个三角形9个值
              const triangle = [
                  new THREE.Vector3(vertices1[i], vertices1[i+1], vertices1[i+2]),
                  new THREE.Vector3(vertices1[i+3], vertices1[i+4], vertices1[i+5]),
                  new THREE.Vector3(vertices1[i+6], vertices1[i+7], vertices1[i+8])
              ];
              
              // 检查三角形中心是否在第二个几何体内部
              const center = triangle[0].clone().add(triangle[1]).add(triangle[2]).divideScalar(3);
              
              let isInside = false;
              for (let j = 0; j < vertices2.length; j += 9) {
                  const center2 = new THREE.Vector3(
                      (vertices2[j] + vertices2[j+3] + vertices2[j+6]) / 3,
                      (vertices2[j+1] + vertices2[j+4] + vertices2[j+7]) / 3,
                      (vertices2[j+2] + vertices2[j+5] + vertices2[j+8]) / 3
                  );
                  
                  if (center.distanceTo(center2) < threshold) {
                      isInside = true;
                      break;
                  }
              }
              
              if (!isInside) {
                  result.push(...vertices1.slice(i, i + 9));
              }
          }
          
          return result;
      }
      
      unionGeometry(vertices1, vertices2) {
          // 简化的并集实现：合并两个几何体的顶点
          return [...vertices1, ...vertices2];
      }
      
      intersectGeometry(vertices1, vertices2) {
          // 简化的交集实现：保留接近的三角形
          const threshold = 0.5;
          const result = [];
          
          for (let i = 0; i < vertices1.length; i += 9) {
              const center1 = new THREE.Vector3(
                  (vertices1[i] + vertices1[i+3] + vertices1[i+6]) / 3,
                  (vertices1[i+1] + vertices1[i+4] + vertices1[i+7]) / 3,
                  (vertices1[i+2] + vertices1[i+5] + vertices1[i+8]) / 3
              );
              
              for (let j = 0; j < vertices2.length; j += 9) {
                  const center2 = new THREE.Vector3(
                      (vertices2[j] + vertices2[j+3] + vertices2[j+6]) / 3,
                      (vertices2[j+1] + vertices2[j+4] + vertices2[j+7]) / 3,
                      (vertices2[j+2] + vertices2[j+5] + vertices2[j+8]) / 3
                  );
                  
                  if (center1.distanceTo(center2) < threshold) {
                      result.push(...vertices1.slice(i, i + 9));
                      break;
                  }
              }
          }
          
          return result;
      }
      
      cancelBooleanOperation() {
          this.booleanMainShape = null;
          this.booleanToolShape = null;
          
          // 重置选择
          const mainShapeSelect = document.getElementById('booleanMainShape');
          const toolShapeSelect = document.getElementById('booleanToolShape');
          
          if (mainShapeSelect) mainShapeSelect.value = '';
          if (toolShapeSelect) toolShapeSelect.value = '';
      }
  }

// 全局变量
let viewer;

// 初始化应用
window.addEventListener('DOMContentLoaded', () => {
    console.log('应用初始化中...');
    viewer = new Shape3DViewer();
    console.log('应用初始化完成');
});

// 添加一些有趣的键盘快捷键
document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case '1': document.getElementById('shapeSelect').value = 'cube'; break;
        case '2': document.getElementById('shapeSelect').value = 'sphere'; break;
        case '3': document.getElementById('shapeSelect').value = 'cylinder'; break;
        case '4': document.getElementById('shapeSelect').value = 'cone'; break;
        case '5': document.getElementById('shapeSelect').value = 'pyramid'; break;
        case '6': document.getElementById('shapeSelect').value = 'torus'; break;
        case '7': document.getElementById('shapeSelect').value = 'dodecahedron'; break;
        case '8': document.getElementById('shapeSelect').value = 'icosahedron'; break;
        case 'r': case 'R': 
            document.getElementById('resetClip').click(); 
            break;
        case 'w': case 'W': 
            document.getElementById('toggleWireframe').click(); 
            break;
        case 'Delete':
            if (viewer && viewer.selectedShape) {
                viewer.removeShape(viewer.selectedShape.userData.id);
            }
            break;
        case 'c': case 'C':
            if (event.ctrlKey && viewer) {
                event.preventDefault();
                viewer.duplicateShape();
            }
            break;
    }
    
    // 触发change事件
    if (event.key >= '1' && event.key <= '8') {
        document.getElementById('shapeSelect').dispatchEvent(new Event('change'));
    }
});