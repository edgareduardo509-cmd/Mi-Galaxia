import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cargarPalabras, crearTexturaPalabra } from './words.js';

const contenedor = document.getElementById('canvas-container');
const escena = new THREE.Scene();
escena.fog = new THREE.FogExp2(0x02020a, 0.0015); 

const camara = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2500);
camara.position.set(0, 160, 240);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
contenedor.appendChild(renderer.domElement);

const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.05;
controles.maxDistance = 550;
controles.minDistance = 35;

let objetosPalabras = [];
let objetosPlanetas = [];
let sistemasGalaxiasFondo = [];
let solMalla, auraMalla;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-1, -1);
let objetoSeleccionado = null;

const materialLinea = new THREE.LineBasicMaterial({ 
    color: 0xffaa00, 
    transparent: true, 
    opacity: 0,
    blending: THREE.AdditiveBlending 
});
const geometryLinea = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]);
const lineaGravedad = new THREE.Line(geometryLinea, materialLinea);
escena.add(lineaGravedad);

function crearTexturaPalabraUltra(texto, colorBase) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1024;
    canvas.height = 256;

    ctx.fillStyle = 'rgba(2, 2, 8, 0.55)';
    if (ctx.roundRect) {
        ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 30);
    } else {
        ctx.rect(10, 10, canvas.width - 20, canvas.height - 20);
    }
    ctx.fill();

    ctx.shadowColor = colorBase;
    ctx.shadowBlur = 25;
    ctx.fillStyle = colorBase;
    ctx.font = 'Bold 82px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(texto, canvas.width / 2, canvas.height / 2);

    const textura = new THREE.CanvasTexture(canvas);
    textura.minFilter = THREE.LinearFilter;
    textura.generateMipmaps = false; 
    return textura;
}

const paletaColores = ['#ff4757', '#ffa502', '#ff7f50', '#2ed573', '#1e90ff', '#70a1ff', '#eccc68'];

function crearUniverso() {
    const radioSol = 22; 
    const geoSol = new THREE.SphereGeometry(radioSol, 64, 64);
    const matSol = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00,
        toneMapped: false 
    });
    solMalla = new THREE.Mesh(geoSol, matSol);
    escena.add(solMalla);

    const geoAura = new THREE.SphereGeometry(radioSol * 1.3, 32, 32);
    const matAura = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    auraMalla = new THREE.Mesh(geoAura, matAura);
    escena.add(auraMalla);

    function crearMiniGalaxiaFondo(posX, posY, posZ, colorBase, escala, cuentaParticulas) {
        const geoGal = new THREE.BufferGeometry();
        const posiciones = new Float32Array(cuentaParticulas * 3);
        const colores = new Float32Array(cuentaParticulas * 3);
        const c = new THREE.Color(colorBase);

        for(let i=0; i < cuentaParticulas * 3; i+=3) {
            const r = Math.pow(Math.random(), 2) * 55;
            const theta = Math.random() * Math.PI * 2 + (r * 0.12);
            posiciones[i] = Math.cos(theta) * r;
            posiciones[i+1] = (Math.random() - 0.5) * 5 * (1 - r/55);
            posiciones[i+2] = Math.sin(theta) * r;
            colores[i] = c.r + (Math.random() - 0.5) * 0.15;
            colores[i+1] = c.g + (Math.random() - 0.5) * 0.15;
            colores[i+2] = c.b + (Math.random() - 0.5) * 0.15;
        }
        geoGal.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
        geoGal.setAttribute('color', new THREE.BufferAttribute(colores, 3));

        const matGal = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending });
        const puntosGalaxia = new THREE.Points(geoGal, matGal);
        puntosGalaxia.position.set(posX, posY, posZ);
        puntosGalaxia.scale.set(escala, escala, escala);
        escena.add(puntosGalaxia);
        sistemasGalaxiasFondo.push(puntosGalaxia);
    }

    crearMiniGalaxiaFondo(-220, -50, -180, '#a55eea', 2.2, 4500); 
    crearMiniGalaxiaFondo(240, 60, -140, '#0be881', 1.8, 3500);  
    crearMiniGalaxiaFondo(-100, 90, 200, '#ffc048', 1.5, 3000);   

    const conteoEstrellas = 15000;
    const geoEstrellas = new THREE.BufferGeometry();
    const posEstrellas = new Float32Array(conteoEstrellas * 3);
    for (let i = 0; i < conteoEstrellas * 3; i += 3) {
        const r = Math.random() * 350;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        posEstrellas[i] = r * Math.sin(phi) * Math.cos(theta);
        posEstrellas[i+1] = (Math.random() - 0.5) * 25 * (1 - r/350); 
        posEstrellas[i+2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geoEstrellas.setAttribute('position', new THREE.BufferAttribute(posEstrellas, 3));
    escena.add(new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ size: 0.3, color: 0xffffff, transparent: true, opacity: 0.45 })));

    const datosPlanetas = [
        { nombre: 'Mercurio', radio: 1.6, distancia: 48, color: 0xaa9988, metal: 0.1, rugosidad: 0.8, vel: 0.035 },
        { nombre: 'Venus', radio: 2.3, distancia: 62, color: 0xe3944e, metal: 0.0, rugosidad: 0.6, vel: 0.025 },
        { nombre: 'Tierra', radio: 2.6, distancia: 78, color: 0x2e86de, metal: 0.2, rugosidad: 0.2, vel: 0.018 },
        { nombre: 'Marte', radio: 1.9, distancia: 94, color: 0xc0392b, metal: 0.1, rugosidad: 0.7, vel: 0.014 },
        { nombre: 'Júpiter', radio: 5.8, distancia: 122, color: 0xd4a373, metal: 0.1, rugosidad: 0.4, vel: 0.009 },
        { nombre: 'Saturno', radio: 4.8, distancia: 156, color: 0xf4e2bb, metal: 0.3, rugosidad: 0.3, vel: 0.007, tieneAnillo: true, anilloRadioMax: 11, anilloVel: 0.5 },
        { nombre: 'Urano', radio: 3.5, distancia: 188, color: 0x70a1ff, metal: 0.5, rugosidad: 0.1, vel: 0.005, tieneAnillo: true, anilloRadioMax: 6.5, anilloVel: -0.3 },
        { nombre: 'Neptuno', radio: 3.3, distancia: 215, color: 0x1e3799, metal: 0.4, rugosidad: 0.2, vel: 0.004 }
    ];

    datosPlanetas.forEach((p) => {
        const geoPlaneta = new THREE.SphereGeometry(p.radio, 32, 32);
        const matPlaneta = new THREE.MeshStandardMaterial({ color: p.color, metalness: p.metal, roughness: p.rugosidad });
        const mallaPlaneta = new THREE.Mesh(geoPlaneta, matPlaneta);
        const anguloInicial = Math.random() * Math.PI * 2;
        
        mallaPlaneta.position.x = Math.cos(anguloInicial) * p.distancia;
        mallaPlaneta.position.z = Math.sin(anguloInicial) * p.distancia;

        mallaPlaneta.userData = {
            nombre: p.nombre, distancia: p.distancia, angulo: anguloInicial, velocidad: p.vel, esPlaneta: true, escalaOriginal: { x: 1, y: 1, z: 1 }
        };

        if(p.tieneAnillo) {
            const geoAnillo = new THREE.RingGeometry(p.radio * 1.3, p.radio * p.anilloRadioMax * 0.5, 64);
            geoAnillo.rotateX(Math.PI / 2); // Base plana horizontal relativa al planeta
            const mallaAnillo = new THREE.Mesh(geoAnillo, new THREE.MeshBasicMaterial({ color: p.color, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }));
            
            // Guardamos referencia y velocidad del anillo para animarlo después
            mallaAnillo.userData = { velocidadRotacion: p.anilloVel };
            mallaPlaneta.add(mallaAnillo);
        }

        escena.add(mallaPlaneta);
        objetosPlanetas.push(mallaPlaneta);
    });

    escena.add(new THREE.AmbientLight(0x222233, 1.8));
    const luzSolarPura = new THREE.PointLight(0xfff3d1, 4.5, 400, 0.4);
    escena.add(luzSolarPura);
}

async function iniciar() {
    let listaPalabrasBase = ['Amor', 'Mi Reina', 'Siempre', 'Universo', 'Cariño', 'Vida', 'Felicidad', 'Mi Sol', 'Te Amo', 'Mi Paz'];
    try {
        const palabrasCargadas = await cargarPalabras();
        if (palabrasCargadas && palabrasCargadas.length > 0) listaPalabrasBase = palabrasCargadas;
    } catch (e) { console.log("Cargando lista integrada..."); }

    const loader = document.getElementById('loading');
    if (loader) loader.style.opacity = '0'; 
    crearUniverso();

    const totalPalabras = 2050;
    const numeroBrazos = 4;

    for (let i = 0; i < totalPalabras; i++) {
        const palabraTexto = listaPalabrasBase[i % listaPalabrasBase.length];
        const colorAleatorio = paletaColores[Math.floor(Math.random() * paletaColores.length)];
        
        const textura = crearTexturaPalabraUltra(palabraTexto, colorAleatorio);

        const materialSprite = new THREE.SpriteMaterial({
            map: textura,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(materialSprite);

        const distanciaAlCentro = Math.pow(Math.random(), 1.6) * 190 + 34; 
        const brazoAngulo = (i % numeroBrazos) * ((2 * Math.PI) / numeroBrazos);
        const anguloEspiral = distanciaAlCentro * 0.08 + brazoAngulo;

        sprite.position.x = Math.cos(anguloEspiral) * distanciaAlCentro + (Math.random() - 0.5) * (distanciaAlCentro * 0.2);
        sprite.position.y = (Math.random() - 0.5) * (distanciaAlCentro * 0.05);
        sprite.position.z = Math.sin(anguloEspiral) * distanciaAlCentro + (Math.random() - 0.5) * (distanciaAlCentro * 0.2);

        const escalaBase = Math.max(2.8, 6.0 * (1 - distanciaAlCentro / 240));
        sprite.scale.set(escalaBase * 2.2, escalaBase * 0.55, 1);

        sprite.userData = {
            texto: palabraTexto,
            escalaOriginal: { x: escalaBase * 2.2, y: escalaBase * 0.55 },
            colorOriginal: colorAleatorio,
            velocidadOrbita: 0.16 / distanciaAlCentro + 0.0008, 
            distancia: distanciaAlCentro,
            angulo: anguloEspiral,
            yOriginal: sprite.position.y,
            animandoClick: false,
            progresoAnimacion: 0,
            esPlaneta: false
        };

        escena.add(sprite);
        objetosPalabras.push(sprite);
    }

    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('click', () => {
        if (objetoSeleccionado && !objetoSeleccionado.userData.esPlaneta && !objetoSeleccionado.userData.animandoClick) {
            objetoSeleccionado.userData.animandoClick = true;
            objetoSeleccionado.userData.progresoAnimacion = 0;
        }
    });

    const reloj = new THREE.Clock();
    let tiempoUltimoRayo = 0;

    function animacion() {
        requestAnimationFrame(animacion);
        const delta = Math.min(reloj.getDelta(), 0.1);
        const tiempoTotal = reloj.getElapsedTime();

        if(solMalla) solMalla.rotation.y += delta * 0.05;
        if(auraMalla) {
            auraMalla.rotation.y -= delta * 0.03;
            const pulsoAura = 1 + Math.sin(tiempoTotal * 2.5) * 0.04;
            auraMalla.scale.set(pulsoAura, pulsoAura, pulsoAura);
        }

        sistemasGalaxiasFondo.forEach((gal, idx) => {
            gal.rotation.y += delta * (0.015 * (idx + 1));
        });

        objetosPlanetas.forEach((planeta) => {
            const data = planeta.userData;
            data.angulo += data.velocidad * 0.8; 
            planeta.position.x = Math.cos(data.angulo) * data.distancia;
            planeta.position.z = Math.sin(data.angulo) * data.distancia;
            planeta.rotation.y += delta * 0.6; 

            // MOVIMIENTO DE ANILLOS COMPROBADO Y OPTIMIZADO
            if (planeta.children.length > 0) {
                const anillo = planeta.children[0];
                // 1. Giro constante sobre su propio eje
                anillo.rotation.z += delta * anillo.userData.velocidadRotacion;
                // 2. Bamboleo cósmico sutil en los ejes X y Y usando senos y cosenos
                anillo.rotation.x = (Math.PI / 2) + Math.sin(tiempoTotal * 1.5) * 0.08;
                anillo.rotation.y = Math.cos(tiempoTotal * 1.5) * 0.08;
            }
        });

        objetosPalabras.forEach((sprite) => {
            const data = sprite.userData;

            if (!data.animandoClick) {
                data.angulo += data.velocidadOrbita * 0.35;
                sprite.position.x = Math.cos(data.angulo) * data.distancia;
                sprite.position.z = Math.sin(data.angulo) * data.distancia;
                sprite.position.y = data.yOriginal + Math.sin(tiempoTotal * 1.2 + data.distancia) * 0.2;
            } else {
                data.progresoAnimacion += delta * 2.2; 
                const t = data.progresoAnimacion;
                
                if (t <= Math.PI) {
                    const factorEscala = 1 + Math.sin(t) * 3.5;
                    sprite.scale.set(data.escalaOriginal.x * factorEscala, data.escalaOriginal.y * factorEscala, 1);
                    sprite.rotation.z = Math.sin(t * 4) * 0.25;
                    sprite.material.color.setHSL((tiempoTotal * 2) % 1, 1, 0.7);
                } else {
                    data.animandoClick = false;
                    sprite.rotation.z = 0;
                    sprite.material.color.setStyle(data.colorOriginal);
                    sprite.scale.set(data.escalaOriginal.x, data.escalaOriginal.y, 1);
                }
            }
        });

        if (tiempoTotal - tiempoUltimoRayo > 0.05) { 
            tiempoUltimoRayo = tiempoTotal;
            raycaster.setFromCamera(mouse, camara);
            const intersecciones = raycaster.intersectObjects([...objetosPalabras, ...objetosPlanetas]);

            if (intersecciones.length > 0) {
                const primerObjeto = intersecciones[0].object;

                if (objetoSeleccionado !== primerObjeto) {
                    restaurarObjetoPrevio();
                    objetoSeleccionado = primerObjeto;
                    
                    if (objetoSeleccionado.userData.esPlaneta) {
                        objetoSeleccionado.scale.set(1.3, 1.3, 1.3);
                    } else if (!objetoSeleccionado.userData.animandoClick) {
                        objetoSeleccionado.scale.set(
                            objetoSeleccionado.userData.escalaOriginal.x * 1.5,
                            objetoSeleccionado.userData.escalaOriginal.y * 1.5,
                            1
                        );
                    }

                    const puntosLinea = [new THREE.Vector3(0, 0, 0), objetoSeleccionado.position];
                    lineaGravedad.geometry.setFromPoints(puntosLinea);
                    lineaGravedad.material.opacity = 0.9;
                }
            } else {
                restaurarObjetoPrevio();
            }
        }

        if (objetoSeleccionado) {
            const puntosLinea = [new THREE.Vector3(0, 0, 0), objetoSeleccionado.position];
            lineaGravedad.geometry.setFromPoints(puntosLinea);
        }

        controles.update();
        renderer.render(escena, camara);
    }

    function restaurarObjetoPrevio() {
        if (objetoSeleccionado) {
            if (objetoSeleccionado.userData.esPlaneta) {
                objetoSeleccionado.scale.set(1, 1, 1);
            } else if (!objetoSeleccionado.userData.animandoClick) {
                objetoSeleccionado.scale.set(
                    objetoSeleccionado.userData.escalaOriginal.x,
                    objetoSeleccionado.userData.escalaOriginal.y,
                    1
                );
            }
            objetoSeleccionado = null;
            lineaGravedad.material.opacity = 0;
        }
    }

    animacion();
}

window.addEventListener('resize', () => {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

iniciar();
