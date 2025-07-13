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
        
        this.init();
        this.setupEventListeners();
        this.createShape('cube');
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
        
        // 创建高质量渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 高质量阴影设置
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;
        
        // 渲染质量设置
        this.renderer.localClippingEnabled = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.physicallyCorrectLights = true;
        
        // 清除颜色设置
        this.renderer.setClearColor(0xf0f0f0, 1.0);
        
        document.getElementById('container').appendChild(this.renderer.domElement);
        
        // 创建控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(10, 0, 10); // 设置控制器目标为网格中心
        
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
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // 主光源 - 方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(15, 15, 10);
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
        
        this.scene.add(directionalLight);
        
        // 补充光源 - 点光源
        const pointLight = new THREE.PointLight(0x4a90e2, 0.6, 30);
        pointLight.position.set(5, 10, 5);
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 1024;
        pointLight.shadow.mapSize.height = 1024;
        this.scene.add(pointLight);
        
        // 添加半球光以获得更自然的照明
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x8b4513, 0.3);
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
            this.activeCuttingPlane = new THREE.Plane(normal, -normal.dot(position));
            
            // 更新可视化
            this.updateCuttingPlaneVisualization();
            
            // 应用切割预览
            this.previewActiveCuttingPlane();
        }
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
             
             // 如果不在切割模式或附着模式，启用拖拽
             if (!this.cuttingMode && !this.attachMode) {
                 this.isDragging = true;
                 this.selectedShape = selectedObject;
                 
                 // 在移动模式下，总是禁用轨道控制器
                 // 在普通模式下，只有拖拽时才禁用轨道控制器
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
             
             // 限制图形在网格范围内移动
             newPosition.x = Math.max(0, Math.min(20, newPosition.x));
             newPosition.y = Math.max(0, newPosition.y);
             newPosition.z = Math.max(0, Math.min(20, newPosition.z));
             
             this.selectedShape.position.copy(newPosition);
             
             // 确保图形的缩放不变
             if (this.selectedShape.userData.originalScale) {
                 this.selectedShape.scale.copy(this.selectedShape.userData.originalScale);
             } else {
                 // 保存原始缩放值以备将来使用
                 this.selectedShape.userData.originalScale = this.selectedShape.scale.clone();
             }
             
             // 更新选择框位置 - 重新创建选择框以避免缩放问题
             const box = this.scene.getObjectByName('selectionBox');
             if (box) {
                 this.scene.remove(box);
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
             this.isDragging = false;
             this.dragPlane = null;
             this.dragOffset = null;
             
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
            const box = this.scene.getObjectByName('selectionBox');
            if (box) this.scene.remove(box);
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
        
        // 计算附着位置（稍微偏移以避免重叠）
        const offset = this.attachPoint.normal.clone().multiplyScalar(1.5);
        const attachPosition = this.attachPoint.position.clone().add(offset);
        
        // 确保附着的图形在网格范围内
        attachPosition.x = Math.max(1, Math.min(19, attachPosition.x));
        attachPosition.y = Math.max(1, attachPosition.y);
        attachPosition.z = Math.max(1, Math.min(19, attachPosition.z));
        
        const newShape = this.createShape(shapeType, attachPosition);
        
        // 记录附着关系
        newShape.userData.attachedTo = this.attachPoint.targetMesh.userData.id;
        newShape.userData.attachPoint = this.attachPoint.position.clone();
        
        this.attachPoint = null;
        this.toggleAttachMode(); // 退出附着模式
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
    
    createShape(shapeType, position = new THREE.Vector3(10, 1, 10)) {
        let geometry;
        
        switch (shapeType) {
            case 'cube':
                geometry = new THREE.BoxGeometry(2, 2, 2);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(1.5, 32, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(1, 1, 3, 32);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(1.5, 3, 32);
                break;
            case 'pyramid':
                geometry = new THREE.ConeGeometry(1.5, 3, 4);
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(1.5, 0.5, 16, 100);
                break;
            case 'dodecahedron':
                geometry = new THREE.DodecahedronGeometry(1.5);
                break;
            case 'icosahedron':
                geometry = new THREE.IcosahedronGeometry(1.5);
                break;
            default:
                geometry = new THREE.BoxGeometry(2, 2, 2);
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
            originalScale: mesh.scale.clone() // 保存原始缩放值
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
        
        // 使用更高质量的材质
        const material = new THREE.MeshStandardMaterial({
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
        
        if (selectedColor === 'rainbow') {
            material.color = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
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
            
            // 如果是选中的图形，显示提示
            if (this.selectedShape === mesh) {
                this.showTooltip(`已更新图形 #${shapeId} 的颜色`, 1500);
            }
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
            const offset = new THREE.Vector3(2, 0, 0);
            const newPosition = this.selectedShape.position.clone().add(offset);
            
            // 确保复制的图形位置在网格范围内
            newPosition.x = Math.max(1, Math.min(19, newPosition.x));
            newPosition.y = Math.max(1, newPosition.y);
            newPosition.z = Math.max(1, Math.min(19, newPosition.z));
            
            const newShape = this.createShape(this.selectedShape.userData.type, newPosition);
            
            // 如果原始图形有保存的缩放值，复制到新图形
            if (this.selectedShape.userData.originalScale) {
                newShape.userData.originalScale = this.selectedShape.userData.originalScale.clone();
                newShape.scale.copy(this.selectedShape.userData.originalScale);
            }
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
    
    undo() {
        if (this.historyIndex >= 0) {
            const operation = this.operationHistory[this.historyIndex];
            
            switch (operation.action) {
                case 'create':
                    this.removeShape(operation.data.shapeId);
                    break;
                case 'remove':
                    // 重新创建被删除的图形
                    const mesh = operation.data.mesh;
                    this.scene.add(mesh);
                    this.shapes.set(operation.data.shapeId, mesh);
                    break;
            }
            
            this.historyIndex--;
            this.updateShapesList();
        }
    }
    
    redo() {
        if (this.historyIndex < this.operationHistory.length - 1) {
            this.historyIndex++;
            const operation = this.operationHistory[this.historyIndex];
            
            switch (operation.action) {
                case 'create':
                    this.createShape(operation.data.type, operation.data.position);
                    break;
                case 'remove':
                    this.removeShape(operation.data.shapeId);
                    break;
            }
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
                
                item.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; border: 1px solid #ddd; border-radius: 3px; margin-bottom: 3px;">
                        <span style="cursor: pointer; flex: 1;" onclick="viewer.selectShape(viewer.shapes.get(${id}))">${mesh.userData.type} #${id}</span>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <input type="color" value="#${currentColor}" 
                                   onchange="viewer.updateShapeColor(${id}, this.value)" 
                                   style="width: 30px; height: 25px; border: none; border-radius: 3px; cursor: pointer;" 
                                   title="选择颜色">
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
        // 图形选择
        document.getElementById('shapeSelect').addEventListener('change', (e) => {
            this.createShape(e.target.value);
        });
        
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
                const newMaterial = this.createMaterial();
                this.selectedShape.material = newMaterial;
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
        
        // 图形大小控制事件监听器
        ['scaleX', 'scaleY', 'scaleZ'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.updateShapeScale(id, parseFloat(e.target.value));
                    document.getElementById(id + 'Value').textContent = parseFloat(e.target.value).toFixed(1);
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

    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        
        // 彩虹模式的颜色动画
        if (this.currentMesh && document.getElementById('colorSelect').value === 'rainbow') {
            const time = Date.now() * 0.001;
            this.currentMesh.material.color.setHSL((time * 0.1) % 1, 0.7, 0.6);
        }
        
        // 更新选择框
        const box = this.scene.getObjectByName('selectionBox');
        if (box && this.selectedShape) {
            box.update();
        }
        
        this.renderer.render(this.scene, this.camera);
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